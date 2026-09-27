import { describe, expect, it, vi } from "vitest";
import { mkdir, readFile, stat, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../../../src/env.js";
import {
  appleEnabled, exchangeAppleCode, googleEnabled, revokeAppleToken, verifyAppleIdToken, verifyAppleNotification, verifyGoogleIdToken,
} from "../../../src/lib/oauth.js";
import { createStorage, removeReplaced, storage, storageKey, uploadDir } from "../../../src/storage/index.js";
import { allUploadUrls, optionalUploadedImageUrl, releaseFile, uploadedImageUrl, uploadKey } from "../../../src/storage/references.js";
import { PRIVATE_FILES_URL, privateDir } from "../../../src/lib/private-files.js";
import { prisma } from "../../../src/lib/prisma.js";
import { applePrivateKeyPem, appleToken, googleToken, hashedNonce, idToken, nonce, stubIdentityFetch } from "../../helpers/oauth.js";
import { createCategory, createProvider, createUser } from "../../helpers/factories.js";
import { settle } from "../../helpers/app.js";

const withAppleKey = async (fn: () => Promise<void>) => {
  const saved = { ...env.oauth };
  Object.assign(env.oauth, { appleTeamId: "TEAM", appleKeyId: "KEY", applePrivateKey: applePrivateKeyPem });
  try {
    await fn();
  } finally {
    Object.assign(env.oauth, saved);
  }
};

describe("oauth", () => {
  it("verifies Google tokens", async () => {
    stubIdentityFetch();
    expect(googleEnabled()).toBe(true);
    expect(await verifyGoogleIdToken(await googleToken({ nonce: hashedNonce }), nonce)).toEqual({
      sub: "g-1", email: "person@example.com", emailVerified: true, name: "Asha Rao", picture: "https://pic", audience: "google-web",
    });
    const bare = await verifyGoogleIdToken(await googleToken({ email: undefined, email_verified: "false", name: undefined, picture: undefined, aud: ["google-ios", "x"] }));
    expect(bare).toMatchObject({ email: null, emailVerified: false, name: null, picture: null, audience: "google-ios" });
    expect((await verifyGoogleIdToken(await googleToken({ email_verified: "true" }))).emailVerified).toBe(true);
    await expect(verifyGoogleIdToken(await googleToken({ nonce: "other" }), nonce)).rejects.toMatchObject({ status: 401 });
    await expect(verifyGoogleIdToken(await googleToken(), nonce)).rejects.toMatchObject({ status: 401 });
    await expect(verifyGoogleIdToken(await googleToken({ sub: undefined }))).rejects.toMatchObject({ status: 401 });
    await expect(verifyGoogleIdToken(await googleToken({ aud: "someone-else" }))).rejects.toMatchObject({ status: 401 });
    const saved = env.oauth.googleClientIds;
    env.oauth.googleClientIds = [];
    await expect(verifyGoogleIdToken("x")).rejects.toMatchObject({ status: 501 });
    env.oauth.googleClientIds = saved;
  });
  it("verifies Apple tokens and server notifications", async () => {
    stubIdentityFetch();
    expect(appleEnabled()).toBe(true);
    expect(await verifyAppleIdToken(await appleToken())).toMatchObject({ sub: "a-1", email: "relay@privaterelay.appleid.com", emailVerified: true, name: null, audience: "com.dialnfind.app" });
    expect((await verifyAppleIdToken(await appleToken({ email_verified: false }))).emailVerified).toBe(false);
    expect((await verifyAppleIdToken(await appleToken({ email: undefined }))).emailVerified).toBe(false);
    await expect(verifyAppleIdToken(await appleToken({ sub: undefined }))).rejects.toMatchObject({ status: 401 });
    const saved = env.oauth.appleClientIds;
    env.oauth.appleClientIds = [];
    await expect(verifyAppleIdToken("x")).rejects.toMatchObject({ status: 501 });
    env.oauth.appleClientIds = saved;

    const events = { type: "account-delete", sub: "a-1" };
    const signed = (e: unknown) => idToken({ iss: "https://appleid.apple.com", aud: "com.dialnfind.web", events: e } as never);
    expect(await verifyAppleNotification(await signed(JSON.stringify(events)))).toEqual(events);
    expect(await verifyAppleNotification(await signed(events))).toEqual(events);
    await expect(verifyAppleNotification(await signed({ type: 1 }))).rejects.toThrow("malformed events");
    await expect(verifyAppleNotification(await signed(undefined))).rejects.toThrow("malformed events");
    await expect(verifyAppleNotification(await signed({ type: "x" }))).rejects.toThrow("malformed events");
  });
  it("exchanges Apple codes and revokes tokens only with a key", async () => {
    expect(await exchangeAppleCode("c", "com.dialnfind.app")).toBeNull();
    expect(await revokeAppleToken("rt", "com.dialnfind.app")).toBe(false);
    await withAppleKey(async () => {
      const calls: [string, URLSearchParams][] = [];
      const answers = [
        Response.json({ refresh_token: "rt-1" }),
        Response.json({ refresh_token: "rt-2" }),
        Response.json({ error: "invalid_grant" }, { status: 400 }),
        new Response("html", { status: 500 }),
        Response.json({}, { status: 200 }),
        Response.json({}, { status: 400 }),
      ];
      stubIdentityFetch((url, body) => {
        calls.push([url, body]);
        return answers.shift()!;
      });
      expect(await exchangeAppleCode("c1", "com.dialnfind.app", "https://back")).toBe("rt-1");
      expect(await exchangeAppleCode("c2", "com.dialnfind.app")).toBe("rt-2");
      expect(await exchangeAppleCode("c3", "com.dialnfind.web")).toBeNull();
      expect(await exchangeAppleCode("c4", "com.dialnfind.web")).toBeNull();
      expect(await revokeAppleToken("rt", "com.dialnfind.web")).toBe(true);
      expect(await revokeAppleToken("rt", "com.dialnfind.web")).toBe(false);
      expect(calls[0]![1].get("redirect_uri")).toBe("https://back");
      expect(calls[1]![1].get("redirect_uri")).toBeNull();
      // The client secret is cached per client id.
      expect(calls[0]![1].get("client_secret")).toBe(calls[1]![1].get("client_secret"));
      expect(calls[4]![1].get("token_type_hint")).toBe("refresh_token");

      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
      expect(await exchangeAppleCode("c", "com.dialnfind.app")).toBeNull();
      expect(await revokeAppleToken("rt", "com.dialnfind.app")).toBe(false);
    });
  });
});

describe("storage", () => {
  it("stores public and private files and removes them safely", async () => {
    const pub = await storage.put("t/a.webp", Buffer.from("a"), "image/webp");
    expect(pub).toBe(`${env.publicUrl}/uploads/t/a.webp`);
    const priv = await createStorage().put("t/b.pdf", Buffer.from("b"), "application/pdf", "private");
    expect(priv).toBe(`${PRIVATE_FILES_URL}t/b.pdf`);
    expect(await readFile(path.join(privateDir, "t/b.pdf"), "utf8")).toBe("b");
    await storage.remove("https://elsewhere/uploads/t/a.webp");
    await storage.remove(`${env.publicUrl}/uploads/../../escape`);
    await storage.remove(`${env.publicUrl}/uploads/missing.webp`);
    await storage.remove(`${priv}?exp=1&sig=2`);
    await expect(stat(path.join(privateDir, "t/b.pdf"))).rejects.toThrow();
    removeReplaced(pub, pub);
    removeReplaced(null, pub);
    removeReplaced(pub, null);
    await settle();
    await expect(stat(path.join(uploadDir, "t/a.webp"))).rejects.toThrow();
    expect(storageKey("portfolio", "webp")).toMatch(/^portfolio\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.webp$/);
  });
  it("validates upload URLs and maps them to keys", () => {
    const url = `${env.publicUrl}/uploads/a/b.webp`;
    expect(uploadedImageUrl.safeParse(url).success).toBe(true);
    expect(uploadedImageUrl.safeParse(`${url}?x`).success).toBe(false);
    expect(uploadedImageUrl.safeParse(`${env.publicUrl}/uploads/../x`).success).toBe(false);
    expect(uploadedImageUrl.safeParse("https://evil/uploads/a.webp").success).toBe(false);
    expect(optionalUploadedImageUrl.parse("")).toBeNull();
    expect(optionalUploadedImageUrl.parse(url)).toBe(url);
    expect(uploadKey(`https://old-host/uploads/a/b.webp?v=1`)).toBe("public:a/b.webp");
    expect(uploadKey(`${PRIVATE_FILES_URL}d.pdf`)).toBe("private:d.pdf");
    expect(uploadKey("https://x/other")).toBeNull();
  });
  it("lists referenced uploads and only releases unreferenced ones", async () => {
    const url = (k: string) => `${env.publicUrl}/uploads/${k}`;
    for (const k of ["u.webp", "logo.webp", "shared.webp", "free.webp"]) await writeFile(path.join(uploadDir, k), "x");
    const user = await createUser({ profilePhotoUrl: url("u.webp") });
    const provider = await createProvider({ logoUrl: url("logo.webp"), coverUrl: url("shared.webp") });
    await createProvider({ coverUrl: null, logoUrl: null });
    const cat = await createCategory({ iconUrl: "lucide:tv" });
    await prisma.subcategory.update({ where: { id: cat.subcategories[0]!.id }, data: { iconUrl: url("sub.webp") } });
    await prisma.badge.create({ data: { name: "B", iconUrl: url("badge.webp") } });
    await prisma.providerPortfolio.create({ data: { providerId: provider.id, title: "t", imageUrl: url("shared.webp") } });
    const review = await prisma.review.create({ data: { providerId: provider.id, userId: user.id, rating: 5, photos: { create: { photoUrl: url("r.webp") } } } });
    await prisma.verification.create({ data: { providerId: provider.id, type: "id_proof", documentUrl: `${PRIVATE_FILES_URL}v.pdf` } });
    await prisma.providerClaim.create({ data: { providerId: provider.id, userId: user.id, documentUrl: `${PRIVATE_FILES_URL}c.pdf` } });
    const ticket = await prisma.supportTicket.create({ data: { name: "n", email: "e@x.co", subject: "s" } });
    await prisma.ticketMessage.create({ data: { ticketId: ticket.id, body: "b", attachments: [`${PRIVATE_FILES_URL}t.pdf`] } });
    await prisma.ticketMessage.create({ data: { ticketId: ticket.id, body: "b" } });
    const urls = await allUploadUrls();
    expect(urls).toHaveLength(11);
    expect(review.id).toBeDefined();

    await releaseFile(null);
    await releaseFile("https://x/not-an-upload");
    await releaseFile(url("shared.webp"));
    await releaseFile(`${PRIVATE_FILES_URL}t.pdf`);
    await releaseFile(url("free.webp"));
    expect(await stat(path.join(uploadDir, "shared.webp"))).toBeTruthy();
    await expect(stat(path.join(uploadDir, "free.webp"))).rejects.toThrow();
    vi.spyOn(storage, "remove").mockRejectedValueOnce(new Error("disk"));
    await releaseFile(url("gone.webp"));
    expect(console.error).toHaveBeenCalledWith("[storage] could not release", url("gone.webp"), expect.any(Error));
  });
});

describe("storage housekeeping helpers", () => {
  it("can make aged files", async () => {
    const file = path.join(uploadDir, "aged", "x.webp");
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, "x");
    const old = new Date(Date.now() - 72 * 3600 * 1000);
    await utimes(file, old, old);
    expect((await stat(file)).mtimeMs).toBeLessThan(Date.now() - 48 * 3600 * 1000);
  });
});

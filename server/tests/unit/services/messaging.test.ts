import { describe, expect, it, vi } from "vitest";
import { prisma } from "../../../src/lib/prisma.js";
import { env } from "../../../src/env.js";
import { notify, notifyAndEmail } from "../../../src/services/notify.js";
import { sendPush } from "../../../src/services/push.js";
import { mailUser, sendMail } from "../../../src/services/mail.js";
import * as emails from "../../../src/services/emails.js";
import { createUser } from "../../helpers/factories.js";
import { json, mockFetch, sentMails, settle } from "../../helpers/app.js";

// 23:00 IST
const NIGHT = new Date("2026-09-28T17:30:00Z");

describe("sendPush", () => {
  it("sends in batches of 100 and drops unregistered devices", async () => {
    const user = await createUser();
    await prisma.pushToken.createMany({ data: Array.from({ length: 101 }, (_, i) => ({ userId: user.id, token: `tok-${i}`, platform: "ios" })) });
    const fetch = mockFetch(
      json({ data: [{ status: "error", details: { error: "DeviceNotRegistered" } }, { status: "ok" }, { status: "error", details: { error: "Other" } }] }),
      json({}, 200),
    );
    await sendPush(user.id, "Hi", "There");
    expect(fetch).toHaveBeenCalledTimes(2);
    const first = JSON.parse(String(fetch.mock.calls[0]![1]!.body));
    expect(first).toHaveLength(100);
    expect(first[0]).toMatchObject({ to: "tok-0", title: "Hi", data: {} });
    expect(await prisma.pushToken.count()).toBe(100);
  });
  it("logs non-ok answers and network errors without throwing", async () => {
    const user = await createUser();
    await prisma.pushToken.create({ data: { userId: user.id, token: "t", platform: "android" } });
    mockFetch(json({}, 500));
    await sendPush(user.id, "a", "b", { x: 1 });
    expect(console.error).toHaveBeenCalledWith("[push] Expo answered 500");
    mockFetch(new Error("offline"));
    await sendPush(user.id, "a", "b");
    expect(console.error).toHaveBeenCalledWith("[push] send failed", expect.any(Error));
  });
});

describe("notify", () => {
  it("ignores missing users and never throws", async () => {
    await notify(null, "system", "t", "b");
    await notify(999n, "system", "t", "b"); // FK error is logged
    expect(console.error).toHaveBeenCalledWith("[notify] failed", expect.anything());
  });

  it("pushes normal notifications up to a daily cap", async () => {
    const user = await createUser();
    const fetch = mockFetch(json({ data: [] }));
    await prisma.pushToken.create({ data: { userId: user.id, token: "t", platform: "ios" } });
    await notify(user.id, "system", "Hello", "Body", { a: 1 });
    await settle();
    const saved = await prisma.notification.findFirstOrThrow();
    expect(saved.dataJson).toEqual({ a: 1, pushed: true });
    expect(fetch).toHaveBeenCalledTimes(1);

    await prisma.notification.createMany({ data: Array.from({ length: 10 }, () => ({ userId: user.id, type: "system", title: "x", body: "y", dataJson: { pushed: true } })) });
    await notify(user.id, "system", "Capped", "Body");
    const capped = await prisma.notification.findFirstOrThrow({ where: { title: "Capped" } });
    expect(capped.dataJson).toBeNull();
  });

  it("keeps quiet types for the in-app list at night", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: NIGHT });
    const user = await createUser();
    await notify(user.id, "review", "New review", "Body");
    expect((await prisma.notification.findFirstOrThrow()).dataJson).toBeNull();
  });

  it("bundles bursts of leads", async () => {
    const user = await createUser();
    const fetch = mockFetch(json({ data: [] }));
    await prisma.pushToken.create({ data: { userId: user.id, token: "t", platform: "ios" } });
    await notify(user.id, "lead", "New lead", "Ravi called");
    await settle();
    expect(fetch).toHaveBeenCalledTimes(1);
    // Inside the 5 minute window: saved, not pushed.
    await notify(user.id, "lead", "New lead 2", "Asha called");
    await settle();
    expect(fetch).toHaveBeenCalledTimes(1);
    // After the window, the waiting ones are summarised.
    await prisma.notification.updateMany({ where: { title: "New lead" }, data: { createdAt: new Date(Date.now() - 7 * 60 * 1000) } });
    await prisma.notification.updateMany({ where: { title: "New lead 2" }, data: { createdAt: new Date(Date.now() - 6 * 60 * 1000) } });
    await notify(user.id, "lead", "New lead 3", "Mohan called");
    await settle();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetch.mock.calls[1]![1]!.body))[0].title).toBe("2 new enquiries");
  });

  it("notifyAndEmail also emails", async () => {
    const user = await createUser({ email: "who@example.com" });
    await notifyAndEmail(user.id, "listing", "Approved", "Your listing is live", undefined, { label: "Open", url: "https://x.test" });
    expect(sentMails()).toEqual([expect.objectContaining({ to: "who@example.com", subject: "Approved" })]);
  });
});

describe("mail", () => {
  it("prints to the console without SMTP", async () => {
    await sendMail({ to: "a@b.co", subject: "S <1>", lines: ["one"], code: "123456", action: { label: "Go", url: "https://x" } });
    expect(sentMails()[0]).toMatchObject({ to: "a@b.co", subject: "S <1>" });
    expect(sentMails()[0]!.text).toContain("Your code: 123456");
    expect(sentMails()[0]!.text).toContain("Go: https://x");
  });

  it("sends through SMTP and logs failures", async () => {
    const nodemailer = (await import("nodemailer")).default;
    const sendMailFn = vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("smtp down"));
    const create = vi.spyOn(nodemailer, "createTransport").mockReturnValue({ sendMail: sendMailFn } as never);
    const saved = { ...env.smtp };
    Object.assign(env.smtp, { host: "smtp.test", port: 465, user: "u", pass: "p" });
    try {
      await sendMail({ to: "a@b.co", subject: "Hi & bye", lines: ["<b>"], replyTo: "r@b.co" });
      expect(create).toHaveBeenCalledWith(expect.objectContaining({ secure: true, auth: { user: "u", pass: "p" } }));
      expect(sendMailFn.mock.calls[0]![0]).toMatchObject({ to: "a@b.co", replyTo: "r@b.co" });
      expect(sendMailFn.mock.calls[0]![0].html).toContain("Hi &amp; bye");
      expect(sendMailFn.mock.calls[0]![0].html).toContain("&lt;b&gt;");
      await sendMail({ to: "a@b.co", subject: "x", lines: [] });
      expect(sendMailFn.mock.calls[1]![0].replyTo).toBe(env.smtp.replyTo);
      expect(console.error).toHaveBeenCalledWith('[mail] could not send "x" to a@b.co', expect.any(Error));
    } finally {
      Object.assign(env.smtp, saved);
    }
  });

  it("builds a transport without auth when no SMTP user is set", async () => {
    // The transport is created once per process; reload the module to build a fresh one.
    vi.resetModules();
    const nodemailer = (await import("nodemailer")).default;
    const create = vi.spyOn(nodemailer, "createTransport").mockReturnValue({ sendMail: vi.fn() } as never);
    const { env: freshEnv } = await import("../../../src/env.js");
    const mail = await import("../../../src/services/mail.js");
    Object.assign(freshEnv.smtp, { host: "smtp.test", port: 587, user: "" });
    await mail.sendMail({ to: "a@b.co", subject: "x", lines: [] });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ secure: false, auth: undefined }));
  });

  it("mailUser skips missing and deleted accounts", async () => {
    await mailUser(null, { subject: "x", lines: [] });
    await mailUser(12345n, { subject: "x", lines: [] });
    const deleted = await createUser({ status: "deleted" });
    await mailUser(deleted.id, { subject: "x", lines: [] });
    const findSpy = vi.spyOn(prisma.user, "findUnique").mockRejectedValueOnce(new Error("db"));
    await mailUser(1n, { subject: "x", lines: [] });
    findSpy.mockRestore();
    expect(sentMails()).toEqual([]);
  });
});

describe("emails", () => {
  const recipient = (role: "customer" | "provider" = "customer", name = "Ravi Kumar") => createUser({ role, name }).then((u) => ({ ...u }));

  it("sends verification emails with a code and link to the right app", async () => {
    const provider = await recipient("provider");
    await emails.sendVerificationEmail(provider);
    const customer = await recipient("customer", " ");
    await emails.sendVerificationEmail(customer);
    const [p, c] = sentMails();
    expect(p!.subject).toMatch(/^\d{6} is your DialNFind code$/);
    expect(p!.text).toContain(`${env.providerUrl}/verify-email?token=`);
    expect(p!.text).toContain("Hi Ravi,");
    expect(c!.text).toContain(`${env.webUrl}/verify-email?token=`);
    expect(c!.text).toContain("Hi there,");
  });

  it("sends the other account emails", async () => {
    const provider = await recipient("provider");
    const customer = await recipient("customer");
    await emails.sendProviderWelcome(customer);
    await emails.sendProviderWelcome(provider);
    await emails.sendPasswordChanged(customer);
    await emails.sendSignInMethodAdded(customer, "google");
    await emails.sendSignInMethodAdded(customer, "apple");
    await emails.sendAccountDeleted(provider, "app_store");
    await emails.sendAccountDeleted(customer, "play_store");
    await emails.sendAccountDeleted(customer, null);
    await emails.sendAccountSuspended(customer.id);
    await emails.sendPaymentFailed(provider.id, "Pro", new Date("2026-10-01T00:00:00Z"));
    await emails.sendPaymentFailed(provider.id, "Pro", null);
    await emails.sendTicketReceived("g@x.co", "Guest", "DNF-000001", "Help", false);
    await emails.sendTicketReceived("g@x.co", "Guest", "DNF-000001", "Help", true);
    await emails.sendStaffInvite(provider, "Finance", "Boss");
    await emails.sendStaffDigest({ email: "s@x.co", name: "Staff" }, ["• 1 thing"], "https://admin");
    const subjects = sentMails().map((m) => m.subject);
    expect(subjects).toEqual([
      "Welcome to DialNFind for business",
      "Your DialNFind password was changed",
      "Sign in with Google was added to your account",
      "Sign in with Apple was added to your account",
      "Your DialNFind account was deleted",
      "Your DialNFind account was deleted",
      "Your DialNFind account was deleted",
      "Your DialNFind account has been suspended",
      "Payment for your Pro plan failed",
      "Payment for your Pro plan failed",
      "We got your request [DNF-000001]",
      "We got your request [DNF-000001]",
      "You have been added to the DialNFind team",
      "Today's DialNFind review queue",
    ]);
    const texts = sentMails().map((m) => m.text);
    expect(texts[4]).toContain("unclaimed listing");
    expect(texts[4]).toContain("the App Store");
    expect(texts[5]).toContain("Google Play");
    expect(texts[8]).toContain("keeps working until 1 October 2026");
    expect(texts[9]).toContain("Update your payment method to keep your plan.");
    expect(texts[10]).toContain("Reply to this email");
    expect(texts[11]).toContain("Help and support");
    expect(texts[12]).toContain("/reset-password?token=");
  });
});

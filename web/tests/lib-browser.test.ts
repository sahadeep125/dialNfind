// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import posthog from "posthog-js";
import { renderHook } from "@testing-library/react";
import { json, mockApi } from "./helpers";
import { DEFAULT_LOCATION } from "@/lib/default-location";

const loc = (label: string, city = "Pune") => ({ ...DEFAULT_LOCATION, label, city });
const setLocationCookie = (value: unknown) => {
  document.cookie = `dnf_location=${encodeURIComponent(typeof value === "string" ? value : JSON.stringify(value))}; path=/`;
};

async function freshAnalytics(key = "phc_key") {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", key);
  return import("@/lib/analytics");
}

describe("analytics", () => {
  it("does nothing without a key", async () => {
    const a = await freshAnalytics("");
    expect(a.analyticsEnabled).toBe(false);
    a.initAnalytics();
    a.track("x");
    a.identifyUser({ id: 1, role: "customer" } as never);
    a.resetUser();
    a.setCity(loc("A"));
    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
  });
  it("initialises, identifies, tracks and resets", async () => {
    const a = await freshAnalytics();
    setLocationCookie(loc("Kothrud, Pune"));
    a.initAnalytics();
    expect(posthog.init).toHaveBeenCalledWith("phc_key", expect.objectContaining({ api_host: "/ingest" }));
    expect(posthog.register).toHaveBeenCalledWith({ city: "Pune" });
    a.track("search", { q: "tv" });
    expect(posthog.capture).toHaveBeenCalledWith("search", { q: "tv" });
    a.identifyUser({ id: 5, role: "provider", email: "e", name: "n", provider: { id: 9 }, createdAt: "c" } as never);
    expect(posthog.identify).toHaveBeenCalledWith("5", expect.objectContaining({ provider_id: 9 }), { signed_up_at: "c" });
    expect(posthog.register).toHaveBeenCalledWith({ user_type: "provider" });
    a.identifyUser({ id: 6, role: "customer", provider: null } as never);
    expect(posthog.register).toHaveBeenCalledWith({ user_type: "customer" });
    a.resetUser();
    expect(posthog.reset).toHaveBeenCalled();
  });
  it("counts a location change only when the place is different", async () => {
    const a = await freshAnalytics();
    setLocationCookie(loc("Kothrud, Pune"));
    a.setCity(loc("Kothrud, Pune"));
    expect(posthog.capture).not.toHaveBeenCalled();
    a.setCity({ ...loc("Andheri, Mumbai", "Mumbai"), kind: "area", name: "Andheri" });
    expect(posthog.capture).toHaveBeenCalledWith("location_changed", { city: "Mumbai", area: "Andheri", location_kind: "area" });
    a.setCity({ ...loc("Mumbai", "Mumbai"), kind: "city" });
    expect(posthog.capture).toHaveBeenLastCalledWith("location_changed", { city: "Mumbai", area: undefined, location_kind: "city" });
  });
  it("copes with no or broken location cookies", async () => {
    const a = await freshAnalytics();
    a.initAnalytics();
    a.resetUser();
    expect(posthog.register).not.toHaveBeenCalledWith(expect.objectContaining({ city: expect.anything() }));
    setLocationCookie("{broken");
    a.resetUser();
    setLocationCookie({ ...loc("x"), city: "" });
    a.initAnalytics();
    a.resetUser();
  });
});

describe("clientApi", () => {
  it("goes through the proxy with JSON", async () => {
    const { clientApi } = await import("@/lib/client");
    const fetch = mockApi({ "POST /things": { ok: true } });
    expect(await clientApi("/things", { method: "POST", body: "{}" })).toEqual({ ok: true });
    expect(String(fetch.mock.calls[0]![0])).toBe("/api/proxy/things");
    expect((fetch.mock.calls[0]![1]!.headers as Headers).get("content-type")).toBe("application/json");
    await clientApi("/things", { method: "POST", body: "x", headers: { "content-type": "text/plain" } });
    expect((fetch.mock.calls[1]![1]!.headers as Headers).get("content-type")).toBe("text/plain");
  });
  it("throws ClientApiError and sends unconfirmed accounts to the code screen", async () => {
    const { clientApi, ClientApiError } = await import("@/lib/client");
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, pathname: "/dashboard", search: "?a=1", assign });
    mockApi({ "/a": json({ error: { code: "email_unverified", message: "Confirm", details: { retryAfter: 3 } } }, 403), "/b": new Response("x", { status: 500 }) });
    const err = await clientApi("/a").catch((e) => e);
    expect(err).toBeInstanceOf(ClientApiError);
    expect(err).toMatchObject({ status: 403, code: "email_unverified", details: { retryAfter: 3 } });
    expect(assign).toHaveBeenCalledWith("/verify-email?next=%2Fdashboard%3Fa%3D1");
    await expect(clientApi("/b")).rejects.toMatchObject({ status: 500, message: "Something went wrong", code: "error" });
    vi.stubGlobal("location", { ...window.location, pathname: "/verify-email", search: "", assign });
    await clientApi("/a").catch(() => undefined);
    expect(assign).toHaveBeenCalledTimes(1);
    expect(new ClientApiError(400, "m").code).toBe("error");
  });
  it("saves the location cookie", async () => {
    const { saveLocationCookie } = await import("@/lib/client");
    saveLocationCookie(loc("Here"));
    expect(document.cookie).toContain("dnf_location=");
  });
});

describe("saved location", () => {
  it("reads the cookie, falling back to the default", async () => {
    const { readSavedLocation, useSavedLocation } = await import("@/lib/saved-location");
    expect(readSavedLocation()).toEqual(DEFAULT_LOCATION);
    setLocationCookie(loc("Kothrud"));
    expect(readSavedLocation().label).toBe("Kothrud");
    setLocationCookie({ label: "no coords" });
    expect(readSavedLocation()).toEqual(DEFAULT_LOCATION);
    setLocationCookie("{bad");
    expect(readSavedLocation()).toEqual(DEFAULT_LOCATION);
    setLocationCookie(loc("Hook"));
    const { result } = renderHook(() => useSavedLocation());
    expect(result.current?.label).toBe("Hook");
  });
  it("is null while rendering on the server", async () => {
    const { useSavedLocation } = await import("@/lib/saved-location");
    const { renderToString } = await import("react-dom/server");
    const { createElement } = await import("react");
    let seen: unknown = "unset";
    const Probe = () => {
      seen = useSavedLocation();
      return null;
    };
    renderToString(createElement(Probe));
    expect(seen).toBeNull();
  });
});

describe("image hosts", () => {
  it("reads extra origins from the environment", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_IMAGE_ORIGINS", "https://cdn.example/, https://img.example");
    const { IMAGE_ORIGINS, isOptimizableImage } = await import("@/lib/image-hosts");
    expect(IMAGE_ORIGINS).toEqual(["https://cdn.example", "https://img.example"]);
    expect(isOptimizableImage("https://cdn.example/a.png")).toBe(true);
  });
  it("app links read their settings from the environment", async () => {
    vi.resetModules();
    vi.stubEnv("APPLE_TEAM_ID", "TEAM");
    vi.stubEnv("IOS_BUNDLE_ID", "com.x");
    vi.stubEnv("ANDROID_PACKAGE", "com.y");
    vi.stubEnv("ANDROID_SHA256_CERT_FINGERPRINTS", "AA, BB,");
    const links = await import("@/lib/app-links");
    expect(links.IOS_APP_ID).toBe("TEAM.com.x");
    expect(links.ANDROID_PACKAGE).toBe("com.y");
    expect(links.ANDROID_FINGERPRINTS).toEqual(["AA", "BB"]);
    vi.resetModules();
    vi.stubEnv("APPLE_TEAM_ID", "");
    vi.stubEnv("IOS_BUNDLE_ID", "");
    vi.stubEnv("ANDROID_PACKAGE", "");
    vi.stubEnv("ANDROID_SHA256_CERT_FINGERPRINTS", undefined as never);
    const defaults = await import("@/lib/app-links");
    expect(defaults.IOS_APP_ID).toBe("9HH33XNTUX.com.dialnfind.app");
    expect(defaults.ANDROID_FINGERPRINTS).toEqual([]);
  });
  it("config reads its settings from the environment", async () => {
    vi.resetModules();
    for (const [k, v] of Object.entries({ API_URL: "", NEXT_PUBLIC_SITE_URL: "https://x.co/", NEXT_PUBLIC_MAP_TILE_URL: "t", NEXT_PUBLIC_MAP_ATTRIBUTION: "a", NEXT_PUBLIC_OFFICE_ADDRESS: "o" })) vi.stubEnv(k, v);
    const c = await import("@/lib/config");
    expect(c.SITE_URL).toBe("https://x.co");
    expect(c.MAP_TILE_URL).toBe("t");
    expect(c.OFFICE_ADDRESS).toBe("o");
    vi.resetModules();
    for (const k of ["API_URL", "NEXT_PUBLIC_PROVIDER_APP_URL", "NEXT_PUBLIC_OFFICE_ADDRESS", "NEXT_PUBLIC_OFFICE_REGION", "NEXT_PUBLIC_GOOGLE_CLIENT_ID", "NEXT_PUBLIC_APPLE_SERVICES_ID", "NEXT_PUBLIC_APPLE_REDIRECT_URI", "NEXT_PUBLIC_APP_STORE_URL", "NEXT_PUBLIC_PLAY_STORE_URL"]) vi.stubEnv(k, undefined as never);
    const d = await import("@/lib/config");
    expect(d.API_URL).toBe("http://localhost:4000/api/v1");
    expect(d.GOOGLE_CLIENT_ID).toBe("");
  });
});

describe("social auth", () => {
  it("loads scripts once and forgets failed ones", async () => {
    vi.resetModules();
    const { loadScript } = await import("@/lib/social-auth");
    const append = vi.spyOn(document.head, "appendChild");
    const first = loadScript("https://x.test/a.js");
    expect(loadScript("https://x.test/a.js")).toBe(first);
    const el = append.mock.calls[0]![0] as HTMLScriptElement;
    el.onload!(new Event("load"));
    await first;
    const failing = loadScript("https://x.test/b.js");
    (append.mock.calls[1]![0] as HTMLScriptElement).onerror!(new Event("error"));
    await expect(failing).rejects.toThrow("Could not load the sign-in service");
    expect(loadScript("https://x.test/b.js")).not.toBe(failing);
  });
  it("makes a nonce and its hash", async () => {
    const { createNonce } = await import("@/lib/social-auth");
    const { raw, hashed } = await createNonce();
    expect(raw).toMatch(/^[0-9a-f]{64}$/);
    expect(hashed).toMatch(/^[0-9a-f]{64}$/);
  });

  async function withScriptsLoaded() {
    vi.resetModules();
    const mod = await import("@/lib/social-auth");
    vi.spyOn(document.head, "appendChild").mockImplementation((el) => {
      queueMicrotask(() => (el as HTMLScriptElement).onload?.(new Event("load")));
      return el;
    });
    return mod;
  }

  it("renders Google's button and hands over the credential", async () => {
    const mod = await withScriptsLoaded();
    const el = document.createElement("div");
    el.appendChild(document.createElement("span"));
    await expect(mod.renderGoogleButton(el, "cid", vi.fn(), "continue_with")).rejects.toThrow("Google sign-in is unavailable");
    let config: { callback: (r: { credential?: string }) => void; nonce: string } | undefined;
    const google = { initialize: vi.fn((c) => (config = c)), renderButton: vi.fn(), disableAutoSelect: vi.fn() };
    window.google = { accounts: { id: google } };
    const onToken = vi.fn();
    await mod.renderGoogleButton(el, "cid", onToken, "signup_with");
    expect(el.childElementCount).toBe(0);
    expect(google.renderButton).toHaveBeenCalledWith(el, expect.objectContaining({ text: "signup_with", width: 200 }));
    config!.callback({});
    expect(onToken).not.toHaveBeenCalled();
    config!.callback({ credential: "jwt" });
    expect(onToken).toHaveBeenCalledWith({ idToken: "jwt", nonce: expect.stringMatching(/^[0-9a-f]{64}$/) });
    mod.googleSignedOut();
    expect(google.disableAutoSelect).toHaveBeenCalled();
    delete window.google;
    mod.googleSignedOut();
  });
  it("signs in with Apple and maps its errors", async () => {
    const mod = await withScriptsLoaded();
    await expect(mod.appleSignIn("sid", "https://x/cb")).rejects.toThrow("Apple sign-in is unavailable");
    let state = "";
    const signIn = vi.fn();
    window.AppleID = { auth: { init: vi.fn((c) => (state = c.state!)), signIn } };
    signIn.mockImplementationOnce(async () => ({ authorization: { id_token: "t", code: "c", state }, user: { name: { firstName: "Asha" } } }));
    expect(await mod.appleSignIn("sid", "https://x/cb")).toMatchObject({ idToken: "t", authorizationCode: "c", name: { givenName: "Asha", familyName: null } });
    signIn.mockImplementationOnce(async () => ({ authorization: { id_token: "t", code: "c" }, user: { name: { lastName: "Rao" } } }));
    expect((await mod.appleSignIn("sid", "https://x/cb")).name).toEqual({ givenName: null, familyName: "Rao" });
    signIn.mockImplementationOnce(async () => ({ authorization: { id_token: "t", code: "c" } }));
    expect((await mod.appleSignIn("sid", "https://x/cb")).name).toBeUndefined();
    signIn.mockImplementationOnce(async () => ({ authorization: { id_token: "t", code: "c", state: "other" } }));
    await expect(mod.appleSignIn("sid", "https://x/cb")).rejects.toThrow("did not match");
    signIn.mockRejectedValueOnce({ error: "popup_closed_by_user" });
    await expect(mod.appleSignIn("sid", "https://x/cb")).rejects.toBeInstanceOf(mod.SocialCancelled);
    signIn.mockRejectedValueOnce({ error: "user_cancelled_authorize" });
    await expect(mod.appleSignIn("sid", "https://x/cb")).rejects.toBeInstanceOf(mod.SocialCancelled);
    signIn.mockRejectedValueOnce("weird");
    await expect(mod.appleSignIn("sid", "https://x/cb")).rejects.toThrow("Apple sign-in did not complete");
    delete window.AppleID;
  });
});

describe("uploads", () => {
  const file = (type: string, size = 10, name = "f") => new File([new Uint8Array(size)], name, { type });

  it("checks type, size and image dimensions", async () => {
    const { checkFile } = await import("@/lib/upload");
    expect(await checkFile(file("text/plain"), "avatar")).toBe("Choose a JPG, PNG or WebP image");
    expect(await checkFile(file("text/plain"), "document")).toBe("Choose a JPG, PNG, WebP or PDF file");
    expect(await checkFile(file("application/pdf", 0), "document")).toBe("This file is empty. Choose another one.");
    expect(await checkFile(file("application/pdf", 11 * 1024 * 1024), "document")).toBe("This file is 11.0 MB. The limit is 10 MB.");
    expect(await checkFile(file("application/pdf"), "document")).toBeNull();
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValueOnce({ width: 800, height: 600, close }).mockResolvedValueOnce({ width: 50, height: 600, close }));
    expect(await checkFile(file("image/png"), "portfolio")).toBeNull();
    expect(await checkFile(file("image/png"), "portfolio")).toBe("This image is 50 × 600 px. Use one at least 400 px on each side.");
  });
  it("falls back to an <img> when the bitmap cannot be made", async () => {
    const { checkFile } = await import("@/lib/upload");
    vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new Error("no")));
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    let decode = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("Image", class {
      src = "";
      naturalWidth = 500;
      naturalHeight = 500;
      decode = decode;
    });
    expect(await checkFile(file("image/jpeg"), "cover")).toBeNull();
    decode = vi.fn().mockRejectedValue(new Error("bad"));
    expect(await checkFile(file("image/jpeg"), "cover")).toBe("This image could not be read. Choose another file.");
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });
  it("uploads with progress through the proxy", async () => {
    const { uploadFile } = await import("@/lib/upload");
    const instances: FakeXhr[] = [];
    class FakeXhr {
      upload: { onprogress?: (e: { lengthComputable: boolean; loaded: number; total: number }) => void } = {};
      onload?: () => void;
      onerror?: () => void;
      status = 0;
      responseText = "";
      open = vi.fn();
      setRequestHeader = vi.fn();
      send = vi.fn();
      constructor() {
        instances.push(this);
      }
    }
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    const onProgress = vi.fn();
    const ok = uploadFile(file("image/png"), "avatar", onProgress);
    const x = instances[0]!;
    expect(x.open).toHaveBeenCalledWith("POST", "/api/proxy/uploads?purpose=avatar");
    x.upload.onprogress!({ lengthComputable: true, loaded: 5, total: 10 });
    x.upload.onprogress!({ lengthComputable: false, loaded: 5, total: 10 });
    expect(onProgress).toHaveBeenCalledWith(50);
    x.status = 201;
    x.responseText = JSON.stringify({ url: "https://u/1.webp" });
    x.onload!();
    expect(await ok).toBe("https://u/1.webp");

    const bad = uploadFile(file("image/png"), "avatar");
    instances[1]!.status = 400;
    instances[1]!.responseText = JSON.stringify({ error: { message: "Too small" } });
    instances[1]!.upload.onprogress!({ lengthComputable: true, loaded: 1, total: 1 });
    instances[1]!.onload!();
    await expect(bad).rejects.toThrow("Too small");
    const html = uploadFile(file("image/png"), "avatar");
    instances[2]!.status = 502;
    instances[2]!.responseText = "<html>";
    instances[2]!.onload!();
    await expect(html).rejects.toThrow("Upload failed. Please try again.");
    const noUrl = uploadFile(file("image/png"), "avatar");
    instances[3]!.status = 200;
    instances[3]!.responseText = "{}";
    instances[3]!.onload!();
    await expect(noUrl).rejects.toThrow("Upload failed. Please try again.");
    const offline = uploadFile(file("image/png"), "avatar");
    instances[4]!.onerror!();
    await expect(offline).rejects.toThrow("Check your connection");
  });
});

import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import posthog from "posthog-js";
import { api, ApiError, download, errorMessage, tokenStore, UPGRADE_EVENT } from "@/lib/api";
import { clearDraft, loadDraft, saveDraft } from "@/lib/draft";
import { formatDate, formatPhone, formatPrice, formatRelative, initials, telLink, whatsappLink } from "@/lib/format";
import { GST_STATES, GSTIN_PATTERN } from "@/lib/gst";
import { FAQ } from "@/lib/help";
import { planFor, usePlan, useEntitlement, FEATURE_COPY } from "@/lib/plan";
import { openCheckout, openOrderCheckout } from "@/lib/razorpay";
import { checkFile, uploadFile } from "@/lib/upload";
import { useDebounced } from "@/lib/use-debounced";
import { email, normalizePhone, optionalEmail, optionalInt, optionalPhone, optionalPincode, optionalUrl, orNull, password, personName, phone, pincode } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { LEGAL_DOCS } from "@/lib/legal";
import { useAppConfig } from "@/lib/app-config";
import { AuthProvider, useAuth } from "@/lib/auth";
import { QueryClientProvider } from "@tanstack/react-query";
import { json, mockApi, newQueryClient, providerMe, signedIn, user } from "./helpers";

describe("api client", () => {
  it("sends JSON with the stored token", async () => {
    tokenStore.set("tok");
    const fetch = mockApi({ "POST /x": { ok: true } });
    expect(await api("/x", { method: "POST", json: { a: 1 } })).toEqual({ ok: true });
    const headers = fetch.mock.calls[0]![1]!.headers as Headers;
    expect(headers.get("authorization")).toBe("Bearer tok");
    expect(headers.get("content-type")).toBe("application/json");
    tokenStore.clear();
    await api("/x", { method: "POST", body: "raw" });
    expect((fetch.mock.calls[1]![1]!.headers as Headers).get("authorization")).toBeNull();
  });
  it("signs out on 401, redirects unconfirmed accounts and announces upgrades", async () => {
    tokenStore.set("tok");
    const logout = vi.fn();
    const upgrade = vi.fn();
    window.addEventListener("dnf:logout", logout);
    window.addEventListener(UPGRADE_EVENT, upgrade);
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, pathname: "/leads", assign });
    mockApi({
      "/a": json({ error: { message: "Expired" } }, 401),
      "/b": json({ error: { code: "email_unverified", message: "Confirm" } }, 403),
      "/c": json({ error: { code: "upgrade_required", message: "Upgrade", details: { entitlement: "provider_pro", feature: "analytics" } } }, 402),
      "/d": new Response("x", { status: 500 }),
      "/e": json({ error: { code: "other" } }, 403),
      "/f": json({ error: { code: "other" } }, 402),
    });
    await expect(api("/a")).rejects.toMatchObject({ status: 401, message: "Expired" });
    expect(logout).toHaveBeenCalled();
    expect(tokenStore.get()).toBeNull();
    await expect(api("/a")).rejects.toBeInstanceOf(ApiError);
    expect(logout).toHaveBeenCalledTimes(1);
    await expect(api("/b")).rejects.toMatchObject({ code: "email_unverified" });
    expect(assign).toHaveBeenCalledWith("/verify-email");
    vi.stubGlobal("location", { ...window.location, pathname: "/verify-email", assign });
    await expect(api("/b")).rejects.toBeInstanceOf(ApiError);
    expect(assign).toHaveBeenCalledTimes(1);
    await expect(api("/c")).rejects.toMatchObject({ status: 402 });
    expect((upgrade.mock.calls[0]![0] as CustomEvent).detail).toEqual({ entitlement: "provider_pro", feature: "analytics", message: "Upgrade" });
    await expect(api("/d")).rejects.toMatchObject({ message: "Something went wrong" });
    await expect(api("/e")).rejects.toBeInstanceOf(ApiError);
    await expect(api("/f")).rejects.toBeInstanceOf(ApiError);
    expect(upgrade).toHaveBeenCalledTimes(1);
    expect(errorMessage(new Error("m"))).toBe("m");
    expect(errorMessage("x")).toBe("Something went wrong");
  });
  it("token store survives blocked storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(tokenStore.get()).toBeNull();
  });
  it("downloads files with the token", async () => {
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    tokenStore.set("tok");
    const fetch = mockApi({ "/leads/export.csv": new Response("a,b", { headers: { "content-disposition": 'attachment; filename="leads.csv"' } }) });
    await download("/leads/export.csv", "fallback.csv");
    expect(click).toHaveBeenCalled();
    expect((fetch.mock.calls[0]![1]!.headers as Record<string, string>).authorization).toBe("Bearer tok");
    vi.advanceTimersByTime(1000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:x");
    tokenStore.clear();
    mockApi({ "/x": new Response("a") });
    await download("/x", "fallback.csv");
    mockApi({ "/bad": json({ error: { message: "Too many", code: "rate_limited" } }, 429), "/worse": new Response("x", { status: 500 }) });
    await expect(download("/bad", "f")).rejects.toMatchObject({ message: "Too many", code: "rate_limited" });
    await expect(download("/worse", "f")).rejects.toMatchObject({ message: "Could not download the file" });
  });
});

describe("small helpers", () => {
  it("drafts survive blocked storage", () => {
    saveDraft("k", { a: 1 });
    expect(loadDraft("k")).toEqual({ a: 1 });
    clearDraft("k");
    expect(loadDraft("k")).toBeNull();
    const boom = () => {
      throw new Error("blocked");
    };
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(boom);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(boom);
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(boom);
    expect(loadDraft("k")).toBeNull();
    saveDraft("k", 1);
    clearDraft("k");
  });
  it("format, gst, help, legal and utils", () => {
    expect(formatPhone("+919876543210")).toBe("+91 98765 43210");
    expect(formatPhone("123")).toBe("123");
    expect(telLink("+91 98765")).toBe("tel:+9198765");
    expect(whatsappLink("+91 98765")).toBe("https://wa.me/9198765");
    expect(formatPrice(null)).toBe("");
    expect(formatPrice(undefined)).toBe("");
    expect(formatPrice(599)).toBe("₹599");
    const ago = (ms: number) => formatRelative(new Date(Date.now() - ms).toISOString());
    expect(ago(1000)).toBe("Just now");
    expect(ago(5 * 60_000)).toBe("5 min ago");
    expect(ago(3 * 3.6e6)).toBe("3h ago");
    expect(ago(1.5 * 864e5)).toBe("Yesterday");
    expect(ago(5 * 864e5)).toBe("5 days ago");
    expect(formatRelative("2024-01-05T00:00:00Z")).toBe("5 Jan 2024");
    expect(formatDate("2024-01-05T00:00:00Z")).toBe("5 Jan 2024");
    expect(initials(" Ravi kumar singh")).toBe("RK");
    expect(GST_STATES.find((s) => s.code === "27")?.name).toBe("Maharashtra");
    expect(GSTIN_PATTERN.test("27ABCDE1234F1Z5")).toBe(true);
    expect(FAQ.length).toBeGreaterThan(5);
    expect(LEGAL_DOCS.terms.title).toBeTruthy();
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(planFor("provider_business")).toBe("Business");
    expect(planFor("provider_pro")).toBe("Pro");
    expect(FEATURE_COPY.promote.entitlement).toBe("provider_business");
  });
  it("validation rules", () => {
    expect(normalizePhone("098765 43210")).toBe("+919876543210");
    expect(normalizePhone("919876543210")).toBe("+919876543210");
    expect(normalizePhone("0123456789")).toBeNull();
    expect(normalizePhone("ab")).toBeNull();
    expect(phone.safeParse("").success).toBe(false);
    expect(phone.safeParse("9876543210").success).toBe(true);
    expect(optionalPhone.safeParse("").success).toBe(true);
    expect(optionalPhone.safeParse("1").success).toBe(false);
    expect(personName.safeParse("Ravi").success).toBe(true);
    expect(email.safeParse("x").success).toBe(false);
    expect(optionalEmail.safeParse("").success).toBe(true);
    expect(optionalEmail.safeParse("x").success).toBe(false);
    expect(password.safeParse("abcdefg1").success).toBe(true);
    expect(pincode.safeParse("400001").success).toBe(true);
    expect(optionalPincode.safeParse("").success).toBe(true);
    expect(optionalPincode.safeParse("1").success).toBe(false);
    expect(optionalUrl.safeParse("").success).toBe(true);
    expect(optionalUrl.safeParse("https://x.co").success).toBe(true);
    expect(optionalUrl.safeParse("x.co").success).toBe(false);
    const n = optionalInt(0, 1000, "Years");
    expect(n.safeParse("").success).toBe(true);
    expect(n.safeParse("7").success).toBe(true);
    expect(n.safeParse("x").success).toBe(false);
    expect(n.safeParse("2000").error?.issues[0]!.message).toBe("Years must be a whole number from 0 to 1,000");
    expect(orNull(" ")).toBeNull();
    expect(orNull(" a ")).toBe("a");
  });
  it("debounces values", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ v }) => useDebounced(v, 100), { initialProps: { v: "a" } });
    rerender({ v: "b" });
    expect(result.current).toBe("a");
    act(() => void vi.advanceTimersByTime(100));
    expect(result.current).toBe("b");
    const { result: r2 } = renderHook(() => useDebounced(1));
    expect(r2.current).toBe(1);
  });
});

describe("analytics", () => {
  async function load(key: string) {
    vi.resetModules();
    vi.stubEnv("VITE_POSTHOG_KEY", key);
    return import("@/lib/analytics");
  }
  it("does nothing without a key", async () => {
    const a = await load("");
    a.track("x");
    a.identifyUser(user() as never);
    a.resetUser();
    expect(posthog.init).not.toHaveBeenCalled();
  });
  it("initialises and follows the account", async () => {
    vi.stubEnv("VITE_POSTHOG_HOST", "/ingest");
    const a = await load("phc");
    expect(posthog.init).toHaveBeenCalledWith("phc", expect.objectContaining({ api_host: "/ingest" }));
    a.track("e", { a: 1 });
    expect(posthog.capture).toHaveBeenCalledWith("e", { a: 1 });
    a.identifyUser(user() as never, "pro");
    expect(posthog.identify).toHaveBeenCalledWith("7", expect.objectContaining({ plan: "pro", provider_id: 3 }), { signed_up_at: "2026-01-01T00:00:00.000Z" });
    a.identifyUser(user({ role: "customer", provider: null, createdAt: undefined }) as never);
    expect(posthog.identify).toHaveBeenLastCalledWith("7", expect.not.objectContaining({ plan: expect.anything() }), undefined);
    expect(posthog.register).toHaveBeenCalledWith({ user_type: "customer" });
    a.resetUser();
    expect(posthog.reset).toHaveBeenCalled();
  });
  it("uses the default PostHog host", async () => {
    vi.stubEnv("VITE_POSTHOG_HOST", "");
    await load("phc");
    expect(posthog.init).toHaveBeenCalledWith("phc", expect.objectContaining({ api_host: "https://us.i.posthog.com" }));
  });
  it("config reads settings from the environment", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_API_URL", undefined as never);
    vi.stubEnv("VITE_WEB_URL", undefined as never);
    vi.stubEnv("VITE_MAP_TILE_URL", "t");
    vi.stubEnv("VITE_MAP_ATTRIBUTION", "a");
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "g");
    vi.stubEnv("VITE_APPLE_SERVICES_ID", "s");
    vi.stubEnv("VITE_APPLE_REDIRECT_URI", "r");
    const c = await import("@/lib/config");
    expect(c.API_URL).toBe("http://localhost:4000/api/v1");
    expect(c.WEB_URL).toBe("http://localhost:3000");
    expect(c.MAP_TILE_URL).toBe("t");
    expect(c.GOOGLE_CLIENT_ID).toBe("g");
    vi.resetModules();
    for (const k of ["VITE_MAP_TILE_URL", "VITE_MAP_ATTRIBUTION", "VITE_GOOGLE_CLIENT_ID", "VITE_APPLE_SERVICES_ID", "VITE_APPLE_REDIRECT_URI"]) vi.stubEnv(k, undefined as never);
    const d = await import("@/lib/config");
    expect(d.MAP_TILE_URL).toContain("openstreetmap");
    expect(d.GOOGLE_CLIENT_ID).toBe("");
  });
});

describe("razorpay checkout", () => {
  it("loads the script once, resolves, dismisses and rejects", async () => {
    vi.resetModules();
    const mod = await import("@/lib/razorpay");
    const append = vi.spyOn(document.body, "appendChild");
    let options!: { handler: (r: unknown) => void; modal: { ondismiss: () => void } };
    let failed!: (r: { error: { description: string } }) => void;
    const open = vi.fn();
    const pending = mod.openCheckout({ key: "k", subscription_id: "sub", name: "n", description: "d" });
    const script = append.mock.calls[0]![0] as HTMLScriptElement;
    window.Razorpay = vi.fn(function (o: typeof options) {
      options = o;
      return { open, on: (_e: string, cb: typeof failed) => (failed = cb) };
    }) as never;
    script.onload!(new Event("load"));
    await waitFor(() => expect(open).toHaveBeenCalled());
    options.handler({ razorpay_payment_id: "p" });
    expect(await pending).toEqual({ razorpay_payment_id: "p" });

    const dismissed = mod.openOrderCheckout({ key: "k", order_id: "o", amount: 100, name: "n", description: "d" });
    await waitFor(() => expect(open).toHaveBeenCalledTimes(2));
    options.modal.ondismiss();
    expect(await dismissed).toBeNull();

    const fails = openCheckout({ key: "k", subscription_id: "s", name: "n", description: "d" });
    await waitFor(() => expect(open).toHaveBeenCalledTimes(3));
    failed({ error: { description: "" } });
    await expect(fails).rejects.toThrow("The payment did not go through");
    const fails2 = openOrderCheckout({ key: "k", order_id: "o", amount: 1, name: "n", description: "d" });
    await waitFor(() => expect(open).toHaveBeenCalledTimes(4));
    failed({ error: { description: "Card declined" } });
    await expect(fails2).rejects.toThrow("Card declined");
    delete window.Razorpay;
  });
  it("reports when the script cannot load, and tries again next time", async () => {
    vi.resetModules();
    const mod = await import("@/lib/razorpay");
    const append = vi.spyOn(document.body, "appendChild");
    const first = mod.openCheckout({ key: "k", subscription_id: "s", name: "n", description: "d" });
    (append.mock.calls[0]![0] as HTMLScriptElement).onerror!(new Event("error"));
    await expect(first).rejects.toThrow("Could not load the payment window");
    void mod.openCheckout({ key: "k", subscription_id: "s", name: "n", description: "d" }).catch(() => undefined);
    await waitFor(() => expect(append).toHaveBeenCalledTimes(2));
  });
});

describe("uploads", () => {
  const file = (type: string, size = 10) => new File([new Uint8Array(size)], "f", { type });
  it("checks files", async () => {
    expect(await checkFile(file("text/plain"), "logo")).toBe("Choose a JPG, PNG or WebP image");
    expect(await checkFile(file("text/plain"), "document")).toBe("Choose a JPG, PNG, WebP or PDF file");
    expect(await checkFile(file("application/pdf", 0), "document")).toBe("This file is empty. Choose another one.");
    expect(await checkFile(file("application/pdf", 11 * 1024 * 1024), "document")).toBe("This file is 11.0 MB. The limit is 10 MB.");
    expect(await checkFile(file("application/pdf"), "document")).toBeNull();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValueOnce({ width: 500, height: 500, close: vi.fn() }).mockResolvedValueOnce({ width: 10, height: 500, close: vi.fn() }).mockRejectedValue(new Error("no")));
    expect(await checkFile(file("image/png"), "cover")).toBeNull();
    expect(await checkFile(file("image/png"), "cover")).toContain("at least 400 px");
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    let decode = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("Image", class {
      src = "";
      naturalWidth = 500;
      naturalHeight = 500;
      decode = decode;
    });
    expect(await checkFile(file("image/png"), "cover")).toBeNull();
    decode = vi.fn().mockRejectedValue(new Error("bad"));
    expect(await checkFile(file("image/png"), "cover")).toBe("This image could not be read. Choose another file.");
  });
  it("uploads with the token and progress", async () => {
    const xhrs: Record<string, unknown>[] = [];
    vi.stubGlobal("XMLHttpRequest", class {
      upload: Record<string, (e: unknown) => void> = {};
      open = vi.fn();
      setRequestHeader = vi.fn();
      send = vi.fn();
      status = 0;
      responseText = "";
      onload?: () => void;
      onerror?: () => void;
      constructor() {
        xhrs.push(this as never);
      }
    });
    tokenStore.set("tok");
    const progress = vi.fn();
    const ok = uploadFile(file("image/png"), "logo", progress);
    const x = xhrs[0] as { upload: { onprogress: (e: unknown) => void }; setRequestHeader: ReturnType<typeof vi.fn>; status: number; responseText: string; onload: () => void };
    expect(x.setRequestHeader).toHaveBeenCalledWith("authorization", "Bearer tok");
    x.upload.onprogress({ lengthComputable: true, loaded: 1, total: 4 });
    x.upload.onprogress({ lengthComputable: false });
    expect(progress).toHaveBeenCalledWith(25);
    x.status = 201;
    x.responseText = '{"url":"u"}';
    x.onload();
    expect(await ok).toBe("u");
    tokenStore.clear();
    const bad = uploadFile(file("image/png"), "logo");
    const y = xhrs[1] as typeof x & { onerror: () => void };
    expect(y.setRequestHeader).not.toHaveBeenCalledWith("authorization", expect.anything());
    y.upload.onprogress({ lengthComputable: true, loaded: 1, total: 1 });
    y.status = 400;
    y.responseText = '{"error":{"message":"Nope"}}';
    y.onload();
    await expect(bad).rejects.toThrow("Nope");
    const html = uploadFile(file("image/png"), "logo");
    const z = xhrs[2] as typeof x;
    z.status = 502;
    z.responseText = "<html>";
    z.onload();
    await expect(html).rejects.toThrow("Upload failed. Please try again.");
    const off = uploadFile(file("image/png"), "logo");
    (xhrs[3] as { onerror: () => void }).onerror();
    await expect(off).rejects.toThrow("Check your connection");
  });
});

describe("auth provider and plan hooks", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={newQueryClient()}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
  const both = () => ({ auth: useAuth(), plan: usePlan(), pro: useEntitlement("provider_pro"), config: useAppConfig() });

  it("loads the account and business, signs in and out", async () => {
    mockApi(signedIn({}, { plan: { ...providerMe().plan, entitlements: ["provider_pro"] } }));
    const { result } = renderHook(both, { wrapper });
    expect(result.current.auth.loading).toBe(true);
    await waitFor(() => expect(result.current.auth.user?.id).toBe(7));
    expect(result.current.pro).toBe(true);
    await waitFor(() => expect(result.current.config.data?.support_email).toBe("help@x.co"));
    const fetch = mockApi({ "POST /auth/logout": () => Promise.reject(new Error("offline")) as never });
    act(() => result.current.auth.signOut());
    expect(result.current.auth.user).toBeNull();
    expect(result.current.plan.plan.code).toBe("free");
    expect(localStorage.getItem("dnf_provider_token")).toBeNull();
    expect(fetch).toHaveBeenCalled();
    mockApi(signedIn({ emailVerifiedAt: null }));
    await act(async () => result.current.auth.signIn("tok2"));
    await waitFor(() => expect(result.current.auth.user?.emailVerifiedAt).toBeNull());
    expect(result.current.auth.providerState).toBeNull();
    await act(async () => result.current.auth.refresh());
  });
  it("separates an outage from being signed out, and reacts to a 401 anywhere", async () => {
    localStorage.setItem("dnf_provider_token", "tok");
    mockApi({ "/auth/me": json({}, 500) });
    const { result } = renderHook(both, { wrapper });
    await waitFor(() => expect(result.current.auth.unreachable).toBe(true));
    mockApi({ "/auth/me": json({ error: { message: "Expired" } }, 401) });
    await act(async () => result.current.auth.refresh());
    await waitFor(() => expect(result.current.auth.user).toBeNull());
    expect(result.current.auth.unreachable).toBe(false);
    act(() => void window.dispatchEvent(new Event("dnf:logout")));
  });
  it("identifies with analytics once per account change and resets on sign-out", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_POSTHOG_KEY", "phc");
    const rtl = await import("@testing-library/react");
    const rq = await import("@tanstack/react-query");
    const { AuthProvider: A, useAuth: use } = await import("@/lib/auth");
    const W = ({ children }: { children: React.ReactNode }) => (
      <rq.QueryClientProvider client={new rq.QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <A>{children}</A>
      </rq.QueryClientProvider>
    );
    mockApi(signedIn({}, { plan: null }));
    const { result } = rtl.renderHook(() => use(), { wrapper: W });
    await rtl.waitFor(() => expect(posthog.identify).toHaveBeenCalledTimes(1));
    await rtl.act(async () => result.current.refresh());
    expect(posthog.identify).toHaveBeenCalledTimes(1);
    mockApi({ "POST /auth/logout": { ok: true } });
    rtl.act(() => result.current.signOut());
    expect(posthog.reset).toHaveBeenCalled();
  });
  it("useAuth outside the provider throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => renderHook(() => useAuth())).toThrow("useAuth must be used inside AuthProvider");
  });
});

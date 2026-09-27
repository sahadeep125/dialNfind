import supertest from "supertest";
import type { User } from "@prisma/client";
import { vi } from "vitest";
import { createApp } from "../../src/app.js";
import { startSession } from "../../src/services/sessions.js";

const app = createApp();
export const api = () => supertest(app);

/** A bearer token for a real session of this user. */
export const tokenFor = (user: Pick<User, "id" | "role">) => startSession(user.id, user.role);

export async function authed(user: Pick<User, "id" | "role">) {
  const auth = `Bearer ${await tokenFor(user)}`;
  const agent = api();
  return {
    get: (url: string) => agent.get(url).set("Authorization", auth),
    post: (url: string) => agent.post(url).set("Authorization", auth),
    put: (url: string) => agent.put(url).set("Authorization", auth),
    patch: (url: string) => agent.patch(url).set("Authorization", auth),
    delete: (url: string) => agent.delete(url).set("Authorization", auth),
  };
}

/** Emails printed by services/mail.ts (SMTP is off in tests), as { to, subject, text }. */
export function sentMails() {
  const spy = vi.mocked(console.info);
  return spy.mock.calls
    .map((c) => String(c[0]))
    .filter((s) => s.startsWith("\n[mail] to "))
    .map((s) => {
      const m = /^\n\[mail\] to (\S+): ([^\n]*)\n([\s\S]*)\n$/.exec(s)!;
      return { to: m[1], subject: m[2], text: m[3] };
    });
}

/** Lets fire-and-forget work (notifications, emails, pushes) finish. */
export const settle = (ms = 60) => new Promise((r) => setTimeout(r, ms));

/** A fetch stub that answers each call with the next response (or the last one, repeatedly). */
export function mockFetch(...responses: (Response | Error | ((url: string, init?: RequestInit) => Response | Promise<Response>))[]) {
  let i = 0;
  const fn = vi.fn(async (input: unknown, init?: RequestInit) => {
    const r = responses[Math.min(i++, responses.length - 1)];
    if (r instanceof Error) throw r;
    if (typeof r === "function") return r(String(input), init);
    return r.clone();
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

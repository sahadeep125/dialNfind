import { vi } from "vitest";

/**
 * What the mocked Next.js request and router APIs return. Tests change these fields; tests/setup.tsx
 * resets them before each test.
 */
export const nav = {
  pathname: "/",
  search: "",
  router: {
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  },
};

export const request = {
  cookies: new Map<string, string>(),
  headers: new Headers(),
};

export function resetNextState() {
  nav.pathname = "/";
  nav.search = "";
  for (const fn of Object.values(nav.router)) fn.mockReset();
  request.cookies.clear();
  request.headers = new Headers();
}

/** What redirect() and notFound() throw, so tests can assert on them. */
export class RedirectError extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT ${url}`);
  }
}
export class NotFoundError extends Error {
  constructor() {
    super("NEXT_NOT_FOUND");
  }
}

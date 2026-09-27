import { afterEach, beforeEach, vi } from "vitest";
import * as React from "react";
import { nav, NotFoundError, RedirectError, request, resetNextState } from "./next-state";

// Matchers such as toBeInTheDocument; harmless in node-environment files.
await import("@testing-library/jest-dom/vitest");

vi.mock("next/navigation", () => ({
  useRouter: () => nav.router,
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
  permanentRedirect: (url: string) => {
    throw new RedirectError(url);
  },
  notFound: () => {
    throw new NotFoundError();
  },
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (request.cookies.has(name) ? { name, value: request.cookies.get(name)! } : undefined),
    has: (name: string) => request.cookies.has(name),
    set: (name: string, value: string) => request.cookies.set(name, value),
    delete: (name: string) => request.cookies.delete(name),
  }),
  headers: async () => request.headers,
}));

vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidateTag: vi.fn(), revalidatePath: vi.fn() }));

vi.mock("next/font/google", () => ({
  Inter: () => ({ className: "font-inter", variable: "--font-inter", style: {} }),
  Plus_Jakarta_Sans: () => ({ className: "font-jakarta", variable: "--font-jakarta", style: {} }),
}));

// Social images: render the element to markup (running every component in it) instead of drawing a PNG.
vi.mock("next/og", async () => {
  const { renderToStaticMarkup } = await import("react-dom/server");
  class ImageResponse {
    markup: string;
    constructor(
      element: React.ReactElement,
      public options?: unknown,
    ) {
      this.markup = renderToStaticMarkup(element);
    }
  }
  return { ImageResponse };
});

// next/dynamic: load the module through React.lazy so the loader and the loading state both run.
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>, options?: { loading?: () => React.ReactNode }) => {
    const Lazy = React.lazy(async () => {
      const mod = (await loader()) as { default?: React.ComponentType } | React.ComponentType;
      return { default: (typeof mod === "function" ? mod : (mod as { default: React.ComponentType }).default) as React.ComponentType };
    });
    const Dynamic = (props: Record<string, unknown>) => (
      <React.Suspense fallback={options?.loading ? options.loading() : null}>
        <Lazy {...props} />
      </React.Suspense>
    );
    return Dynamic;
  },
}));

vi.mock("posthog-js", () => ({
  default: { init: vi.fn(), register: vi.fn(), capture: vi.fn(), identify: vi.fn(), reset: vi.fn() },
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureRequestError: vi.fn(),
  captureRouterTransitionStart: vi.fn(),
  init: vi.fn(),
}));

// Browser APIs jsdom leaves out, used by Radix primitives, maps and lazy images.
if (typeof window !== "undefined") {
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  window.ResizeObserver ??= Observer as unknown as typeof ResizeObserver;
  window.IntersectionObserver ??= Observer as unknown as typeof IntersectionObserver;
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  Element.prototype.scrollIntoView ??= function () {};
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => undefined;
  Element.prototype.setPointerCapture ??= () => undefined;
  window.scrollTo = (() => undefined) as typeof window.scrollTo;
}

const unmockedFetch = vi.fn(async (input: unknown) => {
  throw new Error(`Unmocked fetch: ${String(input instanceof Request ? input.url : input)}`);
});

beforeEach(() => {
  resetNextState();
  vi.stubGlobal("fetch", unmockedFetch);
  if (typeof document !== "undefined") {
    for (const c of document.cookie.split("; ")) {
      const name = c.split("=")[0];
      if (name) document.cookie = `${name}=; max-age=0; path=/`;
    }
  }
});

afterEach(async () => {
  if (typeof document !== "undefined") {
    const { cleanup } = await import("@testing-library/react");
    cleanup();
  }
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

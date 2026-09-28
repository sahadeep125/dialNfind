import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { act, cleanup, configure } from "@testing-library/react";
import { toast } from "sonner";

vi.mock("posthog-js", () => ({
  default: { init: vi.fn(), register: vi.fn(), capture: vi.fn(), identify: vi.fn(), reset: vi.fn() },
}));

// Leaflet needs real layout. These stand-ins render children; clicking the marker "drags" it to
// 12.3456789, 77.9876543, and map events are reachable through globalThis.__mapEvents.
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: ({ position, eventHandlers }: { position: [number, number]; eventHandlers?: { dragend?: (e: unknown) => void } }) => (
    <button type="button" data-testid="marker" onClick={() => eventHandlers?.dragend?.({ target: { getLatLng: () => ({ lat: 12.3456789, lng: 77.9876543 }) } })}>
      {position.join(",")}
    </button>
  ),
  Circle: ({ radius }: { radius: number }) => <div data-testid="circle" data-radius={radius} />,
  useMap: () => ({ setView: vi.fn(), flyTo: vi.fn(), getZoom: () => 13, fitBounds: vi.fn() }),
  useMapEvents: (handlers: Record<string, (e: unknown) => void>) => {
    (globalThis as { __mapEvents?: typeof handlers }).__mapEvents = handlers;
    return null;
  },
}));

// Recharts measures its container; give it a fixed size.
vi.mock("recharts", async (orig) => {
  const mod = await orig<typeof import("recharts")>();
  const { cloneElement } = await import("react");
  return {
    ...mod,
    ResponsiveContainer: ({ children }: { children: React.ReactElement<{ width?: number; height?: number }> }) => (
      <div style={{ width: 600, height: 300 }}>{cloneElement(children, { width: 600, height: 300 })}</div>
    ),
  };
});

// The default 1 s wait for findBy/waitFor is tight when the whole suite runs with coverage.
configure({ asyncUtilTimeout: 5000 });

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

const unmockedFetch = vi.fn(async (input: unknown) => {
  throw new Error(`Unmocked fetch: ${String(input instanceof Request ? input.url : input)}`);
});

beforeEach(() => {
  vi.stubGlobal("fetch", unmockedFetch);
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  // Sonner keeps toasts in a module-level store; drop them so they do not show up in the next test.
  act(() => {
    toast.dismiss();
  });
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { DistanceFromYou } from "@/components/provider/distance-from-you";
import { ServicesList } from "@/components/provider/services-list";
import { formatKm, kmBetween } from "@/lib/format";
import { detail } from "../helpers";

const clearCookie = () => {
  document.cookie = "kjv_location=; path=/; max-age=0";
};

afterEach(() => {
  clearCookie();
  vi.unstubAllGlobals();
});

describe("distance from the visitor", () => {
  it("measures and formats distances", () => {
    expect(kmBetween({ lat: 26.7, lng: 88.4 }, { lat: 26.7, lng: 88.4 })).toBe(0);
    expect(kmBetween({ lat: 26.7271, lng: 88.3953 }, { lat: 26.734, lng: 88.433 })).toBeCloseTo(3.8, 0);
    expect(formatKm(0.02)).toBe("100 m");
    expect(formatKm(0.42)).toBe("400 m");
    expect(formatKm(3.84)).toBe("3.8 km");
    expect(formatKm(23.4)).toBe("23 km");
  });

  it("uses the area the visitor picked", () => {
    document.cookie = `kjv_location=${encodeURIComponent(JSON.stringify({ label: "Hakimpara, Siliguri", name: "Hakimpara", city: "Siliguri", state: "WB", kind: "area", latitude: 26.71, longitude: 88.43 }))}; path=/`;
    render(<DistanceFromYou lat={26.72} lng={88.43} />);
    expect(screen.getByText("1.1 km")).toBeInTheDocument();
    expect(screen.getByText("from Hakimpara")).toBeInTheDocument();
  });

  it("asks for the browser's location once, and says nothing if it is refused", async () => {
    let succeed: (p: unknown) => void = () => undefined;
    let fail: () => void = () => undefined;
    vi.stubGlobal("navigator", { ...navigator, geolocation: { getCurrentPosition: (ok: (p: unknown) => void, err: () => void) => ((succeed = ok), (fail = err)) } });
    const { unmount } = render(<DistanceFromYou lat={26.72} lng={88.43} />);
    fireEvent.click(screen.getByRole("button", { name: /How far is this from me/ }));
    expect(screen.getByRole("button", { name: /Finding you/ })).toBeDisabled();
    act(() => succeed({ coords: { latitude: 26.72, longitude: 88.4 } }));
    expect(screen.getByText("from you")).toBeInTheDocument();
    expect(document.cookie).toContain("kjv_location");
    unmount();
    clearCookie();
    const second = render(<DistanceFromYou lat={26.72} lng={88.43} />);
    fireEvent.click(screen.getByRole("button", { name: /How far/ }));
    act(() => fail());
    expect(second.container).toBeEmptyDOMElement();
    second.unmount();
    vi.stubGlobal("navigator", { ...navigator, geolocation: undefined });
    const third = render(<DistanceFromYou lat={1} lng={1} />);
    fireEvent.click(screen.getByRole("button", { name: /How far/ }));
    expect(third.container).toBeEmptyDOMElement();
  });
});

describe("services offered", () => {
  it("names what a whole-category listing covers, and shows prices only where set", () => {
    const services = [
      { id: 1, category: { id: 2, name: "Home Appliances", slug: "home-appliances" }, subcategory: null, startingPrice: null, priceUnit: "per_visit", isPrimary: true },
      { id: 2, category: { id: 2, name: "Home Appliances", slug: "home-appliances" }, subcategory: { id: 5, name: "AC Repair", slug: "ac-repair" }, startingPrice: 400, priceUnit: "per_visit", isPrimary: false },
    ];
    const categories = [{ id: 2, name: "Home Appliances", slug: "home-appliances", subcategories: [{ id: 5, name: "AC Repair", slug: "ac-repair" }, { id: 6, name: "Mixer Grinder Repair", slug: "mixer-grinder-repair" }] }];
    render(<ServicesList services={services as never} businessName="Tech Fix" categories={categories as never} />);
    expect(screen.getByRole("heading", { name: "Services offered by Tech Fix" })).toBeInTheDocument();
    expect(screen.getByText(/Listed for all home appliances work/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mixer Grinder Repair" })).toHaveAttribute("href", "/services/home-appliances/mixer-grinder-repair");
    // AC Repair is already listed on its own, so it is not repeated as "covered".
    expect(screen.getAllByText("AC Repair")).toHaveLength(1);
    expect(screen.getByText(/Prices are starting rates/)).toBeInTheDocument();
  });
  it("a listing in a category the page does not know lists only its own services", () => {
    render(<ServicesList services={detail().services as never} businessName="X" />);
    expect(screen.queryByText(/Listed for all/)).toBeNull();
  });
});

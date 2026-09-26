import type { Address } from "@/types";
import { addressToLocation, toCoordinate, validatePincode } from "@/utils/addresses";
import { distanceChipLabel, ratingChipLabel, resultsSummary } from "@/utils/filters";

const address: Address = {
  id: 1,
  label: "Home",
  addressLine: "12 Main Road",
  city: "Siliguri",
  state: "West Bengal",
  pincode: "734001",
  latitude: 26.73,
  longitude: 88.43,
  isDefault: true,
};

describe("addresses", () => {
  it("reads decimal strings from the API as numbers", () => {
    expect(toCoordinate("26.734000")).toBe(26.734);
    expect(toCoordinate(null)).toBeNull();
    expect(toCoordinate("abc")).toBeNull();
  });

  it("turns an address with a position into a saved search location", () => {
    expect(addressToLocation(address)).toMatchObject({ kind: "saved", name: "Home", latitude: 26.73, longitude: 88.43 });
  });

  it("skips addresses without a position", () => {
    expect(addressToLocation({ ...address, latitude: null })).toBeNull();
  });

  it("checks PIN codes like the API", () => {
    expect(validatePincode("734001")).toBeNull();
    expect(validatePincode("034001")).not.toBeNull();
    expect(validatePincode("7340")).not.toBeNull();
  });
});

describe("filter labels", () => {
  it("shows what is picked", () => {
    expect(ratingChipLabel(undefined)).toBe("Rating");
    expect(ratingChipLabel(4.5)).toBe("4.5+ rating");
    expect(distanceChipLabel(undefined)).toBe("Distance");
    expect(distanceChipLabel(5)).toBe("Within 5 km");
  });

  it("summarises results with the searched radius", () => {
    expect(resultsSummary(1, 15, "Sevoke Road")).toBe("1 provider within 15 km of Sevoke Road");
    expect(resultsSummary(12, undefined, "Sevoke Road")).toBe("12 providers found");
  });
});

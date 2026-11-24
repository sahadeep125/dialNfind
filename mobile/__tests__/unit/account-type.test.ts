/// <reference types="jest" />
import { ACCOUNT_FILTERS, accountChipLabel, isIndividual, listingLine } from "@/utils/accountType";

const base = {
  businessType: "individual" as const,
  profession: "Plumber",
  categoryLabel: "Plumber",
  serviceAreaLabel: "Ghoraguli",
  locality: "Ghoraguli",
  city: "Siliguri",
  primaryCategory: { id: 1, name: "Plumbing", slug: "plumbing" },
};

describe("who the listing is", () => {
  test("an individual is named by profession, a business by its categories", () => {
    expect(isIndividual(base)).toBe(true);
    expect(listingLine(base)).toEqual({ middle: "Plumber", area: "Ghoraguli" });
    expect(
      listingLine({
        ...base,
        businessType: "company",
        profession: null,
        categoryLabel: "Plumbing & Electricians",
        serviceAreaLabel: "Siliguri",
      }),
    ).toEqual({ middle: "Plumbing & Electricians", area: "Siliguri" });
  });

  test("older API responses fall back to the main category and locality or city", () => {
    const old = {
      ...base,
      profession: undefined,
      categoryLabel: undefined,
      serviceAreaLabel: undefined,
    };
    expect(listingLine(old)).toEqual({ middle: "Plumbing", area: "Ghoraguli" });
    expect(listingLine({ ...old, locality: null, primaryCategory: null })).toEqual({
      middle: null,
      area: "Siliguri",
    });
  });

  test("the Who filter", () => {
    expect(ACCOUNT_FILTERS.map((f) => f.value)).toEqual([undefined, "individual", "business"]);
    expect(accountChipLabel(undefined)).toBe("Who");
    expect(accountChipLabel("individual")).toBe("Individuals");
    expect(accountChipLabel("business")).toBe("Businesses");
  });
});

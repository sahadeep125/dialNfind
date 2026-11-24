/// <reference types="jest" />
// Rules for individual professionals and businesses: run without the API.
import { toFormValues, toProfileBody, validateProfile } from "@/components/profile/profileForm";
import type { OwnListing, Profession, ProviderProfile } from "@/types";
import type { ServiceDraft } from "@/types/onboarding";
import { filterProfessions, listingTitle, professionKey } from "@/utils/accountType";
import {
  initialDraft,
  servicesForProfession,
  servicesForType,
  stepsFor,
  toPayload,
  validateBusiness,
  validateServices,
  validateStep,
} from "@/utils/onboarding";

const user = { name: "Deep Saha", email: "deep@example.com", phone: "9876543210" };
const service = (
  categoryId: number,
  subcategoryId: number | null,
  isPrimary = false,
): ServiceDraft => ({
  categoryId,
  subcategoryId,
  startingPrice: null,
  priceUnit: "per_visit",
  isPrimary,
});
const listing = (over: Partial<OwnListing> = {}): OwnListing => ({
  id: 1,
  slug: "deep-saha-plumber-siliguri",
  businessName: "Deep Saha",
  businessType: "individual",
  professionLabel: "Plumber",
  primaryCategory: { id: 2, name: "Plumbing" },
  locality: "Ghoraguli",
  city: "Siliguri",
  status: "active",
  profileCompletenessPct: 80,
  verificationStatus: "none",
  ...over,
});

describe("account type and steps", () => {
  test("a first listing asks for the account type; another profession skips it", () => {
    expect(stepsFor(false)[0]).toBe("Account type");
    expect(stepsFor(true)).toEqual(["About", "Services", "Location", "Hours", "Contact"]);
  });

  test("a new listing starts as an individual professional under the account's name", () => {
    const d = initialDraft(user);
    expect(d.business).toMatchObject({
      businessName: "Deep Saha",
      businessType: "individual",
      professionKey: "",
    });
    expect(validateStep("Account type", d)).toEqual({});
  });

  test("an individual must pick a profession; a business does not", () => {
    const d = initialDraft(user).business;
    expect(validateBusiness(d)).toEqual({ professionKey: "Pick your profession" });
    expect(validateBusiness({ ...d, professionKey: "2:" })).toEqual({});
    expect(validateBusiness({ ...d, businessType: "company" })).toEqual({});
    expect(validateBusiness({ ...d, businessName: "", professionKey: "2:" }).businessName).toBe(
      "Enter your full name",
    );
    expect(validateBusiness({ ...d, businessType: "company", businessName: "" }).businessName).toBe(
      "Enter your business name",
    );
    expect(
      validateBusiness({ ...d, professionKey: "2:", profession: "x".repeat(81) }).profession,
    ).toMatch(/80/);
  });

  test("an individual's listing is one profession", () => {
    const two = [service(1, 10, true), service(2, 20)];
    expect(validateServices(two, true).services).toMatch(/one profession/);
    expect(validateServices(two, false)).toEqual({});
    const d = { ...initialDraft(user), services: two };
    expect(validateStep("Services", d).services).toMatch(/one profession/);
    expect(
      validateStep("Services", { ...d, business: { ...d.business, businessType: "company" } }),
    ).toEqual({});
  });
});

describe("picking a profession", () => {
  test("makes it the main service and keeps others of the same category", () => {
    const next = servicesForProfession([service(1, 10, true), service(1, 11), service(2, 20)], {
      categoryId: 1,
      subcategoryId: 11,
    });
    expect(next).toEqual([service(1, 11, true), service(1, 10)]);
  });

  test("switching to individual keeps only the profession's category", () => {
    const list = [service(2, 20, true), service(1, 10)];
    expect(servicesForType(list, "company", 1)).toBe(list);
    expect(servicesForType(list, "individual", null)).toBe(list);
    expect(servicesForType(list, "individual", 1)).toEqual([service(1, 10, true)]);
  });

  test("the payload sends the title for an individual and none for a business", () => {
    const d = initialDraft(user);
    const individual = {
      ...d,
      business: { ...d.business, professionKey: "1:", profession: "  Senior AC Technician " },
    };
    expect(toPayload(individual)).toMatchObject({
      businessType: "individual",
      profession: "Senior AC Technician",
    });
    expect(
      toPayload({ ...individual, business: { ...individual.business, profession: "" } }).profession,
    ).toBeNull();
    expect(
      toPayload({ ...individual, business: { ...individual.business, businessType: "company" } })
        .profession,
    ).toBeNull();
  });

  test("search matches the title, category or service", () => {
    const list: Profession[] = [
      {
        label: "Plumber",
        categoryId: 1,
        categoryName: "Plumbing",
        categorySlug: "plumbing",
        subcategoryId: null,
        subcategoryName: null,
      },
      {
        label: "AC Technician",
        categoryId: 2,
        categoryName: "Home Appliances",
        categorySlug: "home-appliances",
        subcategoryId: 5,
        subcategoryName: "AC Repair",
      },
    ];
    expect(filterProfessions(list, "")).toBe(list);
    expect(filterProfessions(list, " ac repair").map((p) => p.label)).toEqual(["AC Technician"]);
    expect(filterProfessions(list, "plumb").map((p) => p.label)).toEqual(["Plumber"]);
    expect(professionKey(list[0])).toBe("1:");
    expect(professionKey(list[1])).toBe("2:5");
  });
});

describe("listing titles", () => {
  test("Name – Profession – Area for individuals, Name – Category – Area for businesses", () => {
    expect(listingTitle(listing())).toBe("Deep Saha – Plumber – Ghoraguli");
    expect(
      listingTitle(
        listing({
          businessName: "ABC Services",
          businessType: "company",
          professionLabel: null,
          locality: null,
        }),
      ),
    ).toBe("ABC Services – Plumbing – Siliguri");
    expect(
      listingTitle(listing({ professionLabel: null, primaryCategory: null, locality: " " })),
    ).toBe("Deep Saha – Siliguri");
  });
});

describe("profile editor", () => {
  const profile = {
    businessName: "Deep Saha",
    businessType: "individual",
    profession: "Senior Plumber",
    description: null,
    yearsExperience: null,
    selfReportedCompletedJobs: null,
    phone: "9876543210",
    whatsappNumber: null,
    email: null,
    website: null,
    logoUrl: null,
    coverUrl: null,
    acceptsCalls: true,
    acceptsWhatsapp: true,
    addressLine: null,
    locality: null,
    city: "Siliguri",
    state: "West Bengal",
    pincode: null,
    latitude: 26.7,
    longitude: 88.4,
  } as unknown as ProviderProfile;

  test("keeps an individual's title and clears it for a business", () => {
    const v = toFormValues(profile);
    expect(v.profession).toBe("Senior Plumber");
    expect(toProfileBody(v).profession).toBe("Senior Plumber");
    expect(toProfileBody({ ...v, profession: " " }).profession).toBeNull();
    expect(toProfileBody({ ...v, businessType: "company" }).profession).toBeNull();
    expect(toFormValues({ ...profile, profession: undefined }).profession).toBe("");
  });

  test("names the field by account type", () => {
    const v = toFormValues(profile);
    expect(validateProfile({ ...v, businessName: "" }).businessName).toBe("Enter your full name");
    expect(validateProfile({ ...v, businessType: "company", businessName: "" }).businessName).toBe(
      "Enter your business name",
    );
    expect(validateProfile({ ...v, profession: "x".repeat(81) }).profession).toMatch(/80/);
  });
});

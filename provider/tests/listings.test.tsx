import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { categories, inApp, json, mockApi, profile, renderApp } from "./helpers";
import { listingStore } from "@/lib/api";

const listing = (id: number, professionLabel: string, over: Record<string, unknown> = {}) => ({
  id,
  slug: `ravi-${id}`,
  businessName: "Ravi Kumar",
  businessType: "individual",
  professionLabel,
  status: "active",
  profileCompletenessPct: 60,
  verificationStatus: "none",
  locality: "Ghoraguli",
  city: "Siliguri",
  ...over,
});

describe("an individual's listings", () => {
  it("switches between professions and sends the picked listing with every request", async () => {
    const plumber = listing(3, "Plumber");
    const electrician = listing(4, "Electrician", { status: "pending" });
    const fetch = mockApi({
      ...inApp({}, { provider: plumber, listings: [plumber, electrician], accountType: "individual", canAddListing: true }),
      "/provider/me": (_u: URL, init?: RequestInit) => {
        const picked = new Headers(init?.headers).get("x-listing-id");
        return json({ provider: picked === "4" ? electrician : plumber, listings: [plumber, electrician], accountType: "individual", canAddListing: true, claims: [] });
      },
      "/provider/profile": { provider: profile({ businessType: "individual", businessName: "Ravi Kumar" }) },
      "/provider/dashboard": json({ error: { message: "x" } }, 500),
    });
    await renderApp("/profile");
    const trigger = await screen.findByRole("button", { name: "Switch listing" });
    expect(trigger).toHaveTextContent("Ravi Kumar · Plumber");
    expect(trigger).toHaveTextContent("Individual professional");
    expect(screen.getByRole("link", { name: /Profile details/ })).toBeInTheDocument();
    await userEvent.click(trigger);
    expect(await screen.findByRole("menuitem", { name: /Ravi Kumar – Electrician – Ghoraguli/ })).toHaveTextContent("Pending");
    expect(screen.getByRole("menuitem", { name: /Add another profession/ })).toHaveAttribute("href", "/onboarding?add=1");
    await userEvent.click(screen.getByRole("menuitem", { name: /Electrician/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Switch listing" })).toHaveTextContent("Electrician"));
    expect(listingStore.get()).toBe("4");
    const last = fetch.mock.calls.at(-1)!;
    expect(new Headers(last[1]?.headers).get("x-listing-id")).toBe("4");
    // Picking the current listing again does nothing.
    await userEvent.click(screen.getByRole("button", { name: "Switch listing" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /Electrician/ }));
    expect(listingStore.get()).toBe("4");
  });

  it("forgets a picked listing the account does not own and shows a business without a menu", async () => {
    listingStore.set(99);
    const shop = { ...listing(5, "", { businessName: "ABC Services", businessType: "company" }), professionLabel: null };
    mockApi({ ...inApp({}, { provider: shop, listings: [shop], accountType: "business", canAddListing: false }), "/provider/dashboard": json({ error: { message: "x" } }, 500) });
    await renderApp("/profile");
    expect(await screen.findByText("ABC Services")).toBeInTheDocument();
    expect(screen.getByText("Business", { selector: "span" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Switch listing" })).not.toBeInTheDocument();
    await waitFor(() => expect(listingStore.get()).toBeNull());
  });

  it("keeps an individual's services to their profession's category", async () => {
    mockApi({
      ...inApp(),
      "/provider/profile": { provider: profile({ businessType: "individual", services: [{ id: 1, categoryId: 2, subcategoryId: null, startingPrice: null, priceUnit: "per_visit", isPrimary: true }] }) },
      "/categories": { categories },
      "/provider/attributes": { groups: [] },
    });
    await renderApp("/services");
    expect(await screen.findByText(/This listing is for one profession/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Electronics Repair" })).not.toBeInTheDocument();
  });

  it("stores the picked listing safely", () => {
    listingStore.set(7);
    expect(listingStore.get()).toBe("7");
    listingStore.clear();
    expect(listingStore.get()).toBeNull();
  });
});

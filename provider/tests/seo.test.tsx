import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { inApp, json, lastBody, mockApi, profile, renderApp, seoAnalysis } from "./helpers";
import { seoFieldErrors, splitKeywords } from "@/lib/seo";

const saveButton = () => screen.getByRole("button", { name: /Save changes/ });

describe("Search and Google page", () => {
  it("shows the Google preview, score, completion and checks, scores edits live and saves them", async () => {
    const state = { profile: profile() };
    const fetch = mockApi({
      ...inApp(),
      "/provider/profile": (_u: URL, init?: RequestInit) => {
        if (init?.method === "PATCH") {
          const body = JSON.parse(String(init.body));
          state.profile = profile({ ...body, seo: seoAnalysis({ score: 81, grade: "good", titleSource: "custom", title: `${body.seoTitle} | KaajVa` }) });
        }
        return json({ provider: state.profile });
      },
      "POST /provider/seo/check": () => json({ seo: seoAnalysis({ score: 70, title: "TV repair in Mumbai, same day | KaajVa" }) }),
    });
    await renderApp("/seo");
    expect(await screen.findByRole("heading", { name: "Search and Google" })).toBeInTheDocument();
    const preview = screen.getByLabelText("Search result preview");
    expect(within(preview).getByText("Sharma TV Repair: TV Repair in Mumbai | KaajVa")).toBeInTheDocument();
    expect(within(preview).getByText(/providers › sharma-tv/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "SEO score 62 of 100, Needs work" })).toBeInTheDocument();
    expect(screen.getByText("1 of 4 checks pass")).toBeInTheDocument();
    expect(screen.getAllByText("tv repair in Mumbai").length).toBeGreaterThan(0);
    // Each suggestion links to the page that fixes it.
    for (const link of screen.getAllByRole("link", { name: "Open Business details" })) expect(link).toHaveAttribute("href", "/profile");
    expect(screen.getByRole("link", { name: "Open Service areas" })).toHaveAttribute("href", "/areas");

    await userEvent.type(screen.getByLabelText(/SEO title/), "Short");
    expect(await screen.findByText(/Write at least 10 characters/)).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText(/SEO title/));
    await userEvent.type(screen.getByLabelText(/SEO title/), "TV repair in Mumbai, same day");
    await userEvent.type(screen.getByLabelText(/Secondary keywords/), "LED TV repair Mumbai, tv repair near me");
    expect(await screen.findByRole("img", { name: "SEO score 70 of 100, Needs work" })).toBeInTheDocument();
    expect(screen.getByText(/With your unsaved changes/)).toBeInTheDocument();
    await waitFor(() => expect(lastBody(fetch, "/provider/seo/check")).toMatchObject({ seoTitle: "TV repair in Mumbai, same day", seoKeywords: ["LED TV repair Mumbai", "tv repair near me"] }));

    await userEvent.click(saveButton());
    await waitFor(() => expect(lastBody(fetch, "/provider/profile")).toEqual({ seoTitle: "TV repair in Mumbai, same day", seoDescription: null, focusKeyword: null, seoKeywords: ["LED TV repair Mumbai", "tv repair near me"] }));
    expect(await screen.findByText("SEO saved. Your score is 81.")).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: "SEO score 81 of 100, Good" })).toBeInTheDocument();
  });

  it("explains when search engines cannot show the page", async () => {
    mockApi({ ...inApp(), "/provider/profile": { provider: profile({ seo: seoAnalysis({ indexable: false, notIndexedReason: "The listing is waiting for approval; search engines see it once it is live." }) }) } });
    await renderApp("/seo");
    expect(await screen.findByText(/waiting for approval; search engines see it/)).toBeInTheDocument();
  });

  it("checks SEO text like the API does", () => {
    expect(splitKeywords("a b, A B\nc | d;e")).toEqual(["a b", "c", "d", "e"]);
    expect(seoFieldErrors({ seoTitle: "", seoDescription: "", focusKeyword: "", seoKeywords: "" })).toEqual({});
    const bad = seoFieldErrors({ seoTitle: "x".repeat(71), seoDescription: "too short", focusKeyword: "one two three four five six seven eight nine", seoKeywords: Array.from({ length: 11 }, (_, i) => `k${i}`).join(",") });
    expect(Object.keys(bad).sort()).toEqual(["focusKeyword", "seoDescription", "seoKeywords", "seoTitle"]);
    expect(seoFieldErrors({ seoTitle: "<b>hello world</b>", seoDescription: "", focusKeyword: "x", seoKeywords: "y" })).toMatchObject({ seoTitle: "Remove the < and > characters", focusKeyword: "Enter at least 2 characters", seoKeywords: "Each keyword needs 2-60 characters" });
  });
});

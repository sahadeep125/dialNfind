import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { inApp, json, mockApi, profile, renderApp, renderWith, seoAnalysis } from "./helpers";
import { LengthHint, SeoReport, SeoScoreBadge, SeoScoreRing } from "@/components/seo";
import { SeoEditor } from "@/components/seo-editor";
import { seoFieldErrors } from "@/lib/seo";
import type { SeoAnalysis } from "@/lib/seo";

const fields = { seoTitle: "Sharma TV: TV repair in Mumbai", seoDescription: null, focusKeyword: "tv repair Mumbai", seoKeywords: ["a b"], seoNoIndex: false };

describe("SEO building blocks", () => {
  it("grades scores and lengths", () => {
    render(
      <>
        <SeoScoreBadge score={85} />
        <SeoScoreBadge score={30} className="x" />
        <SeoScoreRing score={20} />
        <LengthHint length={0} min={10} max={20} />
        <LengthHint length={5} min={10} max={20} />
        <LengthHint length={15} min={10} max={20} />
        <LengthHint length={25} min={10} max={20} hard={30} />
        <LengthHint length={35} min={10} max={20} hard={30} unit="words" />
      </>,
    );
    expect(screen.getByTitle("SEO score 85 of 100: Good")).toHaveTextContent("85");
    expect(screen.getByTitle("SEO score 30 of 100: Poor")).toHaveClass("x");
    expect(screen.getByRole("img", { name: "SEO score 20 of 100, Poor" })).toBeInTheDocument();
    expect(screen.getByText("0 characters")).toHaveClass("text-muted-foreground");
    expect(screen.getByText(/5 characters · aim for 10-20/)).toBeInTheDocument();
    expect(screen.getByText(/15 characters · good length/)).toHaveClass("text-success");
    expect(screen.getByText(/25 characters · search results cut after 20/)).toBeInTheDocument();
    expect(screen.getByText(/35 words/)).toHaveClass("text-destructive");
  });

  it("celebrates a page where every check passes", () => {
    render(<SeoReport analysis={seoAnalysis({ suggestions: [], checks: [] }) as SeoAnalysis} />);
    expect(screen.getByText("Every check passes.")).toBeInTheDocument();
  });

  it("checks every rule the API checks", () => {
    const ok = { seoTitle: "", seoDescription: "", focusKeyword: "", seoKeywords: "" };
    expect(seoFieldErrors({ ...ok, seoTitle: "a title with <b>" }).seoTitle).toBe("Remove the < and > characters");
    expect(seoFieldErrors({ ...ok, seoDescription: "x".repeat(201) }).seoDescription).toMatch(/200 characters or fewer/);
    expect(seoFieldErrors({ ...ok, seoDescription: `${"x".repeat(60)} <i>` }).seoDescription).toBe("Remove the < and > characters");
    expect(seoFieldErrors({ ...ok, focusKeyword: "x".repeat(81) }).focusKeyword).toMatch(/80 characters/);
    expect(seoFieldErrors({ ...ok, focusKeyword: "tv <b>" }).focusKeyword).toBe("Remove the < and > characters");
    expect(seoFieldErrors({ ...ok, seoKeywords: "tv <b>" }).seoKeywords).toBe("Remove the < and > characters");
  });
});

describe("SEO editor", () => {
  it("lets the team hide a page from search, shows custom text, server errors and discards edits", async () => {
    mockApi({ ...inApp(), "POST /check": json({ seo: seoAnalysis({ score: 90, grade: "good" }) }) });
    const onSave = vi.fn();
    const seo = seoAnalysis({ titleSource: "custom", descriptionSource: "custom", focusKeywordSource: "custom", focusKeyword: "tv repair Mumbai", keywords: ["tv repair Mumbai"] }) as SeoAnalysis;
    renderWith(<SeoEditor seo={seo} fields={fields} slug="shop" checkPath="/check" onSave={onSave} saving={false} saveError="Could not save" allowNoIndex />);
    expect(await screen.findByText("Could not save")).toBeInTheDocument();
    expect(screen.getByLabelText(/SEO title/)).toHaveAttribute("placeholder", "");
    expect(screen.getByLabelText(/Meta description/)).toHaveAttribute("placeholder", "");
    expect(screen.getByText(/Leave it empty to target “tv repair in your city”/)).toBeInTheDocument();
    expect(screen.queryByText(/KaajVa writes it from your profile/)).toBeNull();

    await userEvent.click(screen.getByRole("switch", { name: "Hide from search engines" }));
    expect(await screen.findByRole("img", { name: "SEO score 90 of 100, Good" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Save changes/ }));
    expect(onSave).toHaveBeenCalledWith({ seoTitle: "Sharma TV: TV repair in Mumbai", seoDescription: null, focusKeyword: "tv repair Mumbai", seoKeywords: ["a b"], seoNoIndex: true });

    await userEvent.type(screen.getByLabelText(/Meta description/), "Short");
    expect(screen.getByText(/Write at least 50 characters, or leave it empty/)).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText(/Meta description/));
    await userEvent.type(screen.getByLabelText(/Focus keyword/), " <b>");
    await userEvent.click(screen.getByRole("button", { name: /Save changes/ }));
    expect(screen.getByText("Remove the < and > characters")).toBeInTheDocument();
    expect(onSave).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(screen.getByLabelText(/Focus keyword/)).toHaveValue("tv repair Mumbai");
    expect(screen.queryByText("Remove the < and > characters")).toBeNull();
    expect(screen.getByRole("switch", { name: "Hide from search engines" })).not.toBeChecked();
    // An empty title goes back to the automatic one.
    await userEvent.clear(screen.getByLabelText(/SEO title/));
    await userEvent.click(screen.getByRole("button", { name: /Save changes/ }));
    expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ seoTitle: null }));
  });
});

describe("SEO in the business dashboard", () => {
  it("shows a save error and suggestions that no page fixes", async () => {
    mockApi({
      ...inApp(),
      "/provider/profile": (_u: URL, init?: RequestInit) => (init?.method === "PATCH" ? json({ error: { message: "That title is taken" } }, 400) : json({ provider: profile({ seo: seoAnalysis({ suggestions: [{ key: "title_keyword", text: "Put the keyword in the title.", points: 8 }] }) }) })),
      "POST /provider/seo/check": json({ seo: seoAnalysis() }),
    });
    await renderApp("/seo");
    expect(await screen.findByText("Put the keyword in the title.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Open / })).toBeNull();
    await userEvent.type(screen.getByLabelText(/SEO title/), "TV repair in Mumbai, same day");
    await userEvent.click(screen.getByRole("button", { name: /Save changes/ }));
    expect(await screen.findByText("That title is taken")).toBeInTheDocument();
  });

  it("links dashboard suggestions without their own page to the SEO page, and waits for the profile", async () => {
    const dashboard = { provider: { businessName: "Sharma TV Repair", avgRating: 0, totalReviews: 0, profileCompletenessPct: 60, verificationStatus: "none", responseSignal: null, favorites: 0, city: "Mumbai", status: "active" }, analyticsLocked: true, totals: { leads: 0, calls: 0, whatsapp: 0, views: null, impressions: null, leadsChangePct: null, viewsChangePct: null, conversionPct: null, unrepliedReviews: 0 }, ranking: null, series: [], checklist: [], recentLeads: [], recentReviews: [], subscription: null };
    let release: (() => void) | undefined;
    const gate = new Promise<void>((r) => (release = r));
    mockApi({
      ...inApp(),
      "/provider/dashboard": dashboard,
      "/provider/profile": async () => {
        await gate;
        return json({ provider: profile({ seo: seoAnalysis({ suggestions: [{ key: "title_keyword", text: "x", points: 8 }], checks: [{ key: "title_keyword", category: "search", label: "Focus keyword in the title", status: "fail", weight: 8, earned: 0, message: "", suggestion: "x" }] }) }) });
      },
    });
    await renderApp("/");
    expect(await screen.findByText("Good to see you")).toBeInTheDocument();
    release!();
    const link = await screen.findByRole("link", { name: /Focus keyword in the title/ });
    expect(link).toHaveAttribute("href", "/seo");
  });

  it("hides the suggestion list once every check passes", async () => {
    const dashboard = { provider: { businessName: "Sharma TV Repair", avgRating: 0, totalReviews: 0, profileCompletenessPct: 100, verificationStatus: "none", responseSignal: null, favorites: 0, city: "Mumbai", status: "active" }, analyticsLocked: true, totals: { leads: 0, calls: 0, whatsapp: 0, views: null, impressions: null, leadsChangePct: null, viewsChangePct: null, conversionPct: null, unrepliedReviews: 0 }, ranking: null, series: [], checklist: [], recentLeads: [], recentReviews: [], subscription: null };
    mockApi({ ...inApp(), "/provider/dashboard": dashboard, "/provider/profile": { provider: profile({ seo: seoAnalysis({ score: 100, grade: "good", suggestions: [] }) }) } });
    await renderApp("/");
    expect(await screen.findByRole("img", { name: "SEO score 100 of 100, Good" })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/\+\d+$/)).toBeNull());
  });
});

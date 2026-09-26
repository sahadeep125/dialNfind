import { expect, test } from "@playwright/test";

const API = process.env.E2E_API_URL ?? "http://localhost:4000/api/v1";

let providerSlug = "";

test.beforeAll(async ({ request }) => {
  const health = await request.get(`${API}/health`).catch(() => null);
  test.skip(!health?.ok(), "The API is not running on :4000 (start it with pnpm dev).");
  const res = await request.get(`${API}/providers/sitemap?pageSize=1`);
  providerSlug = (await res.json()).results[0].slug;
});

test("home page loads with a heading and a working skip link", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});

test("provider page has a canonical URL and business structured data", async ({ page }) => {
  await page.goto(`/providers/${providerSlug}`);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://dialnfind.com/providers/${providerSlug}`);
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const types = blocks.flatMap((b) => [JSON.parse(b)].flat().map((x: { "@type": string }) => x["@type"]));
  expect(types).toEqual(expect.arrayContaining(["Organization", "WebSite", "BreadcrumbList"]));
  expect(types.some((t) => !["Organization", "WebSite", "BreadcrumbList"].includes(t))).toBe(true);
});

test("robots.txt and the sitemap index are served", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Sitemap: https://dialnfind.com/sitemap.xml");
  const index = await request.get("/sitemap.xml");
  expect(index.headers()["content-type"]).toContain("xml");
  expect(await index.text()).toContain("/sitemaps/sitemap/0.xml");
  const providers = await request.get("/sitemaps/sitemap/1.xml");
  expect(await providers.text()).toContain(`/providers/${providerSlug}`);
});

test("signing in never redirects to another site", async ({ page }) => {
  await page.goto("/login?next=//evil.example");
  await page.getByLabel("Email").fill("demo@dialnfind.com");
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL("**/dashboard", { timeout: 30_000 });
  expect(new URL(page.url()).host).toBe(new URL(test.info().project.use.baseURL ?? "http://localhost:3000").host);
});

test("search results are paginated accessibly", async ({ page }) => {
  // Everything within 100 km of Siliguri spans several pages in the demo data.
  await page.goto("/search?lat=26.734&lng=88.433&loc=Siliguri&radius=100");
  const nav = page.getByRole("navigation", { name: "Pagination" });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Previous page" })).toHaveCount(0);
});

test("legal and help pages are public", async ({ page }) => {
  for (const [path, heading] of [
    ["/terms", "Terms of use"],
    ["/privacy", "Privacy policy"],
    ["/help", "Help centre"],
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }
});

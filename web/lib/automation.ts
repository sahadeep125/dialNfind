/**
 * True in a browser driven by automation (Puppeteer, Playwright, Selenium) or one that names itself a bot.
 * Such visits are left out of PostHog, GA4 and the Meta Pixel: on 22 Nov 2026 one crawl from cloud data
 * centres (Council Bluffs, Covington) made up about 80% of a week's GA4 users, each a single page view.
 * Googlebot does not need analytics to index a page, so nothing is lost for search.
 */
const BOT_UA = /bot\b|crawl|spider|slurp|HeadlessChrome|Lighthouse|PageSpeed|Chrome-Lighthouse|PTST|GTmetrix|facebookexternalhit|Bytespider|python-requests|curl\//i;

export function isAutomatedBrowser(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if (navigator.webdriver) return true;
  return BOT_UA.test(navigator.userAgent ?? "");
}

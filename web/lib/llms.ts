import { BUSINESS, SITE_NAME, SITE_URL, SOCIAL_LINKS } from "./config";
import { FAQ_SECTIONS } from "./faq";
import { GUIDES } from "./guides";
import type { Category } from "./types";

/**
 * /llms.txt: a plain-text map of the site for AI assistants and answer engines (the llmstxt.org format): a title,
 * a one-paragraph summary, then links grouped under headings. Kept free of React so it can be tested.
 */
const PAGES = [
  { name: "All service categories", path: "/services", note: "Every kind of local service listed in Siliguri." },
  { name: "Guides", path: "/guides", note: "Typical prices and how to hire for common home services in Siliguri." },
  { name: "Help centre", path: "/help", note: "Answers on searching, contacting providers, verification, reviews and listing a business." },
  { name: `About ${SITE_NAME}`, path: "/about", note: "Who runs the directory and how listings are checked and ranked." },
  { name: "List your business", path: "/claim", note: "For Siliguri businesses: list for free or claim an existing listing." },
  { name: "Contact", path: "/contact", note: `Phone, email and office address in ${BUSINESS.address.addressLocality}.` },
];

const KEY_QUESTIONS = ["What is KaajVa?", "Is KaajVa free to use?", "What does Verified mean?", "How are providers ranked?", "Does KaajVa guarantee the work?"];

type LlmsCategory = Pick<Category, "name" | "slug" | "providerCount" | "description">;

export function llmsTxt(categories: LlmsCategory[]): string {
  const link = (name: string, path: string, note?: string | null) => `- [${name}](${SITE_URL}${path})${note ? `: ${note}` : ""}`;
  const faq = FAQ_SECTIONS.flatMap((s) => s.items);
  const facts = KEY_QUESTIONS.map((q) => faq.find((f) => f.q === q))
    .filter((f) => f !== undefined)
    .map((f) => `- ${f.q} ${f.a}`);
  const services = categories
    .filter((c) => c.providerCount > 0)
    .sort((a, b) => b.providerCount - a.providerCount)
    .map((c) => link(`${c.name} in Siliguri`, `/services/${c.slug}`, `${c.providerCount} ${c.providerCount === 1 ? "listing" : "listings"}`));
  const { streetAddress, addressLocality, addressRegion, postalCode } = BUSINESS.address;
  return [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_NAME} (${BUSINESS.domain}) is a local services directory for Siliguri, West Bengal, India. People find electricians, plumbers, AC, TV and appliance repair, packers and movers, tutors, cleaners and other local businesses in and around Siliguri (Matigara, Bagdogra, Sevoke Road, Pradhan Nagar, Champasari), compare ratings, reviews and verification, then call or WhatsApp the business directly. Searching and contacting is free; ${SITE_NAME} takes no bookings or payments for the work.`,
    "",
    "## Key facts",
    `- Coverage: Siliguri and nearby areas of North Bengal (Darjeeling and Jalpaiguri districts).`,
    `- Contact: ${BUSINESS.infoEmail}, ${BUSINESS.supportEmail} (support), phone ${BUSINESS.phone}.`,
    `- Office: ${streetAddress}, ${addressLocality}, ${addressRegion} ${postalCode}, India.`,
    ...facts,
    "",
    "## Main pages",
    ...PAGES.map((p) => link(p.name, p.path, p.note)),
    "",
    ...(services.length ? ["## Services in Siliguri", ...services, ""] : []),
    "## Guides",
    ...GUIDES.map((g) => link(g.title, `/guides/${g.slug}`, g.description)),
    "",
    "## Official profiles",
    ...SOCIAL_LINKS.map((url) => `- ${url}`),
    "",
    "## Optional",
    link("Terms of use", "/terms"),
    link("Privacy policy", "/privacy"),
    link("Sitemap", "/sitemap.xml"),
    "",
  ].join("\n");
}

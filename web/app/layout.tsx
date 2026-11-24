import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/site/session-provider";
import { JsonLd } from "@/components/json-ld";
import { getAppConfig } from "@/lib/app-config";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { organizationJsonLd, websiteJsonLd } from "@/lib/structured-data";

// "Para Board" type (DESIGN.md): Bricolage Grotesque for the signboard voice, Instrument Sans for everything you read.
const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const heading = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-heading", display: "swap" });

const TITLE = "KaajVa: Local Services & Businesses in Siliguri";
const DESCRIPTION =
  "Siliguri's local services directory: beauty parlours, bike and car service, home tutors, mobile and TV repair, electricians and more. Compare and call directly.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s | KaajVa" },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  // Search engines mostly ignore this tag; the real targets are in docs/seo/keyword-map.md.
  keywords: [
    "KaajVa",
    "local services in Siliguri",
    "beauty parlour in Siliguri",
    "bike service centre in Siliguri",
    "electrician in Siliguri",
    "plumber in Siliguri",
    "AC repair in Siliguri",
    "TV repair in Siliguri",
    "packers and movers in Siliguri",
    "home tutor in Siliguri",
    "services near me",
    "Siliguri business directory",
    "North Bengal local services",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "Local services directory",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  formatDetection: { telephone: false },
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : {}),
    ...(process.env.BING_SITE_VERIFICATION ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } } : {}),
  },
  // Regional hints some engines (Bing, local directories) still read.
  other: { "geo.region": "IN-WB", "geo.placename": "Siliguri, West Bengal" },
};

export const viewport: Viewport = { themeColor: "#042161" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const config = await getAppConfig();
  return (
    <html lang="en-IN" className={`${body.variable} ${heading.variable}`}>
      <body className="flex min-h-dvh flex-col font-sans">
        <a
          href="#main"
          className="sr-only z-50 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <JsonLd data={[organizationJsonLd({ email: config.support_email, phone: config.support_phone, infoEmail: config.info_email, address: config.office_address }), websiteJsonLd()]} />
        <SessionProvider>
          <SiteHeader />
          <main id="main" tabIndex={-1} className="flex-1 outline-none">
            {children}
          </main>
          <SiteFooter />
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}

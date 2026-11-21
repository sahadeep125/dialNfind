import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/site/session-provider";
import { JsonLd } from "@/components/json-ld";
import { getAppConfig } from "@/lib/app-config";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { organizationJsonLd, websiteJsonLd } from "@/lib/structured-data";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap", weight: ["500", "600", "700", "800"] });

const TITLE = "KaajVa: Electrician, Plumber & AC Repair in Siliguri";
const DESCRIPTION =
  "Find verified electricians, plumbers, AC & TV repair, packers and movers and tutors near you in Siliguri. Compare ratings and call local pros directly, free.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s | KaajVa" },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  // Search engines mostly ignore this tag; the real targets are in docs/seo/keyword-map.md.
  keywords: [
    "KaajVa",
    "local services in Siliguri",
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
    <html lang="en-IN" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="flex min-h-dvh flex-col font-sans">
        <a
          href="#main"
          className="sr-only z-50 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <JsonLd data={[organizationJsonLd({ email: config.support_email, phone: config.support_phone }), websiteJsonLd()]} />
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

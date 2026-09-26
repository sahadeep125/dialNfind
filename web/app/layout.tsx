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

const DESCRIPTION =
  "Find reliable electricians, plumbers, TV and AC repair, cleaners, tutors and more near you. Compare ratings, check who is open now, and call local pros directly. No booking fees.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "DialNFind | Find trusted local service providers near you", template: "%s | DialNFind" },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["local services", "electrician near me", "plumber near me", "AC repair", "TV repair", "home services", "Siliguri"],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
    title: "DialNFind | Find trusted local service providers near you",
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: "DialNFind | Find trusted local service providers near you", description: DESCRIPTION },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  formatDetection: { telephone: false },
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
};

export const viewport: Viewport = { themeColor: "#3f51e0" };

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

import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { LEGAL_DOCS } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 600;

export const metadata: Metadata = pageMetadata({ title: LEGAL_DOCS.privacy.title, description: LEGAL_DOCS.privacy.description, path: "/privacy" });

export default function Page() {
  return <LegalPage doc="privacy" />;
}

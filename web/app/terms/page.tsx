import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { LEGAL_DOCS } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 600;

export const metadata: Metadata = pageMetadata({ title: LEGAL_DOCS.terms.title, description: LEGAL_DOCS.terms.description, path: "/terms" });

export default function Page() {
  return <LegalPage doc="terms" />;
}

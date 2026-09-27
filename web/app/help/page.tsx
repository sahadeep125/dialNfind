import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, LifeBuoy, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/json-ld";
import { getAppConfig } from "@/lib/app-config";
import { FAQ, FAQ_SECTIONS } from "@/lib/faq";
import { formatPhone, telHref } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { faqJsonLd } from "@/lib/structured-data";

export const revalidate = 600;

export const metadata: Metadata = pageMetadata({
  title: "Help centre: FAQs about DialNFind",
  description: "Answers to common questions about finding and contacting local service providers near you on DialNFind: prices, verification, reviews, listing your business and your account.",
  path: "/help",
});

export default async function HelpPage() {
  const config = await getAppConfig();
  return (
    <div className="container-page max-w-3xl py-12">
      <JsonLd data={faqJsonLd(FAQ)} />
      <h1 className="text-3xl font-bold text-brand-deep md:text-4xl">Help centre</h1>
      <p className="mt-2 text-muted-foreground">Answers to the questions we hear most often.</p>
      <nav aria-label="Help topics" className="mt-6 flex flex-wrap gap-2">
        {FAQ_SECTIONS.map((section) => (
          <a key={section.id} href={`#${section.id}`} className="rounded-full bg-muted px-3.5 py-1.5 text-sm font-medium text-foreground/80 hover:bg-primary/10 hover:text-primary">
            {section.title}
          </a>
        ))}
      </nav>
      {FAQ_SECTIONS.map((section) => (
        <section key={section.id} id={section.id} className="mt-10 scroll-mt-24" aria-labelledby={`${section.id}-title`}>
          <h2 id={`${section.id}-title`} className="text-xl font-bold">{section.title}</h2>
          <div className="mt-4 divide-y card-surface">
            {section.items.map((item) => (
              <details key={item.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  <h3 className="text-base">{item.q}</h3>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <p className="mt-3 leading-relaxed text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      ))}
      <p className="mt-8 text-sm text-muted-foreground">
        Looking for prices and tips for a specific job?{" "}
        <Link href="/guides" className="font-semibold text-primary hover:underline">Read our home service guides</Link>.
      </p>
      <section className="mt-10 rounded-2xl bg-accent/60 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <LifeBuoy className="size-5 text-primary" aria-hidden /> Still need help?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {config.support_hours ? `Our team is available ${config.support_hours}. ` : ""}We usually reply within one working day.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/dashboard/support">Open a support request</Link>
          </Button>
          {config.support_email && (
            <Button asChild variant="outline">
              <a href={`mailto:${config.support_email}`}>
                <Mail aria-hidden /> {config.support_email}
              </a>
            </Button>
          )}
          {config.support_phone && (
            <Button asChild variant="outline">
              <a href={telHref(config.support_phone)}>
                <Phone aria-hidden /> {formatPhone(config.support_phone)}
              </a>
            </Button>
          )}
          <Button asChild variant="ghost">
            <Link href="/contact">Contact form</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

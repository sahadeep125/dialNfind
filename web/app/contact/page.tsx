import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Clock, Headphones, LifeBuoy, Mail, MapPin, Phone } from "lucide-react";
import { getAppConfig } from "@/lib/app-config";
import { OFFICE_ADDRESS } from "@/lib/config";
import { formatPhone, telHref } from "@/lib/format";
import { ContactForm } from "@/components/site/contact-form";

export const metadata: Metadata = pageMetadata({
  title: "Contact us",
  description: "Questions, feedback or a problem with a listing? Contact the DialNFind support team and we will get back to you.",
  path: "/contact",
});

export const revalidate = 600;

export default async function ContactPage() {
  const config = await getAppConfig();
  // Only the details the team has filled in under Settings are shown.
  const cards = [
    config.support_email && { icon: Mail, title: "Email", body: config.support_email, href: `mailto:${config.support_email}` },
    config.support_phone && { icon: Phone, title: "Phone", body: formatPhone(config.support_phone), href: telHref(config.support_phone) },
    config.support_hours && { icon: Clock, title: "Support hours", body: config.support_hours },
    OFFICE_ADDRESS && { icon: MapPin, title: "Office", body: OFFICE_ADDRESS },
  ].filter((c): c is { icon: typeof Mail; title: string; body: string; href?: string } => !!c);
  return (
    <div className="container-page py-12 md:py-16">
      <div className="max-w-2xl">
        <span className="text-sm font-semibold uppercase tracking-wider text-primary">Contact</span>
        <h1 className="mt-2 text-4xl font-bold text-brand-deep">We are here to help</h1>
        <p className="mt-3 text-muted-foreground">Questions about a provider, your listing, or the platform? Send us a message and a real person will get back to you.</p>
      </div>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="rounded-3xl border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
          <ContactForm />
        </div>
        <aside className="space-y-4">
          {cards.map((c) => (
            <div key={c.title} className="flex gap-4 rounded-2xl border bg-card p-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                <c.icon className="size-5" />
              </span>
              <div>
                <div className="text-sm text-muted-foreground">{c.title}</div>
                {c.href ? (
                  <a href={c.href} className="font-semibold hover:text-primary">
                    {c.body}
                  </a>
                ) : (
                  <div className="font-semibold">{c.body}</div>
                )}
              </div>
            </div>
          ))}
          <div className="rounded-2xl bg-brand-deep p-5 text-white">
            <div className="flex items-center gap-2 font-semibold">
              <LifeBuoy className="size-5 text-[oklch(0.8_0.1_200)]" /> Support tips
            </div>
            <ul className="mt-3 space-y-2 text-sm text-[oklch(0.85_0.03_266)]">
              <li>For a problem with a provider, include their name and the date you called.</li>
              <li>Business owners can update details directly from the provider dashboard.</li>
              <li>To report a wrong number, use Report on the listing page.</li>
            </ul>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Headphones className="size-4" aria-hidden /> We usually reply within one working day
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

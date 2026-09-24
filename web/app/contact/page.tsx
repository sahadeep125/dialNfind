import type { Metadata } from "next";
import { Clock, Headphones, LifeBuoy, Mail, MapPin, Phone } from "lucide-react";
import { getSession } from "@/lib/session";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "@/lib/config";
import { formatPhone } from "@/lib/format";
import { ContactForm } from "@/components/site/contact-form";

export const metadata: Metadata = { title: "Contact us" };

export default async function ContactPage() {
  const user = await getSession();
  return (
    <div className="container-page py-12 md:py-16">
      <div className="max-w-2xl">
        <span className="text-sm font-semibold uppercase tracking-wider text-primary">Contact</span>
        <h1 className="mt-2 text-4xl font-bold text-brand-deep">We are here to help</h1>
        <p className="mt-3 text-muted-foreground">Questions about a provider, your listing, or the platform? Send us a message and a real person will get back to you.</p>
      </div>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="rounded-3xl border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
          <ContactForm defaultName={user?.name} defaultEmail={user?.email} signedIn={!!user} />
        </div>
        <aside className="space-y-4">
          {[
            { icon: Mail, title: "Email", body: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
            { icon: Phone, title: "Phone", body: formatPhone(SUPPORT_PHONE), href: `tel:${SUPPORT_PHONE}` },
            { icon: Clock, title: "Support hours", body: "Monday to Saturday, 9 AM to 7 PM IST" },
            { icon: MapPin, title: "Office", body: "2nd Floor, City Centre, Matigara, Siliguri 734010" },
          ].map((c) => (
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
              <Headphones className="size-4" /> Average reply time: under 6 hours
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

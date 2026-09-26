import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bell, Heart, History, MessageSquare, Search } from "lucide-react";
import { api } from "@/lib/api";
import { getSavedLocation, getSession, requireSession } from "@/lib/session";
import type { ContactHistoryItem, ProviderCard as ProviderCardType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ContactRow } from "@/components/dashboard/contact-row";
import { ProviderCard } from "@/components/provider/provider-card";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  await requireSession("/dashboard");
  const [user, location] = await Promise.all([getSession(), getSavedLocation()]);
  const [overview, { results: recommended }] = await Promise.all([
    api<{ stats: { favorites: number; reviews: number; contacts: number; unreadNotifications: number }; recentContacts: ContactHistoryItem[] }>("/me/overview"),
    api<{ results: ProviderCardType[] }>("/providers/featured", { query: { lat: location.latitude, lng: location.longitude, limit: 2 } }),
  ]);
  const firstName = user?.name.split(" ")[0] ?? "there";
  const stats = [
    { label: "Favorites", value: overview.stats.favorites, icon: Heart, href: "/dashboard/favorites" },
    { label: "Providers contacted", value: overview.stats.contacts, icon: History, href: "/dashboard/contacts" },
    { label: "Reviews written", value: overview.stats.reviews, icon: MessageSquare, href: "/dashboard/reviews" },
    { label: "Unread updates", value: overview.stats.unreadNotifications, icon: Bell, href: "/dashboard/notifications" },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-primary to-[oklch(0.45_0.19_275)] p-7 text-primary-foreground md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Hello, {firstName}</h1>
          <p className="mt-1 text-primary-foreground/80">Need something fixed? Find a trusted provider near {location.name}.</p>
        </div>
        <Button asChild variant="secondary" size="lg">
          <Link href="/search">
            <Search /> Find a service
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-2xl border bg-card p-5 transition-shadow hover:shadow-[var(--shadow-lift)]">
            <s.icon className="size-5 text-primary" />
            <div className="mt-3 font-display text-3xl font-bold text-brand-deep">{s.value}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
          </Link>
        ))}
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Recent contacts</h2>
          <Link href="/dashboard/contacts" className="flex items-center gap-1 text-sm font-semibold text-primary">
            View all <ArrowRight className="size-4" />
          </Link>
        </div>
        {overview.recentContacts.length ? (
          <div className="space-y-3">
            {overview.recentContacts.map((c) => (
              <ContactRow key={c.id} item={c} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Providers you call or message will appear here.</p>
        )}
      </section>

      {recommended.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">Top rated near {location.name}</h2>
          <div className="grid gap-5 xl:grid-cols-2">
            {recommended.map((p) => (
              <ProviderCard key={p.id} provider={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

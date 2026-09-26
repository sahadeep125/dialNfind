import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";
import { api } from "@/lib/api";
import { requireSession } from "@/lib/session";
import type { Paged, ProviderCard as ProviderCardType } from "@/lib/types";
import { Pagination, type SearchParamsRecord } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { ProviderCard } from "@/components/provider/provider-card";

export const metadata: Metadata = { title: "Favorites" };

export default async function FavoritesPage({ searchParams }: { searchParams: Promise<SearchParamsRecord> }) {
  await requireSession("/dashboard/favorites");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const data = await api<{ results: ProviderCardType[] } & Paged>("/me/favorites", { query: { page, pageSize: 12 } });
  const results = data.results;
  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-deep">Favorites</h1>
      <p className="mt-1 text-muted-foreground">Providers you saved for later. Tap the heart on any listing to add it here.</p>
      {results.length ? (
        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          {results.map((p) => (
            <ProviderCard key={p.id} provider={p} />
          ))}
        </div>
      ) : page > 1 ? (
        <p className="mt-8 rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          This page is empty. <Link href="/dashboard/favorites" className="font-medium text-primary hover:underline">Back to the first page</Link>
        </p>
      ) : (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed p-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-accent text-primary">
            <Heart className="size-6" />
          </span>
          <h2 className="mt-4 font-semibold">No favorites yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Save providers you trust so you can call them again quickly.</p>
          <Button asChild className="mt-5">
            <Link href="/search">Find providers</Link>
          </Button>
        </div>
      )}
      <Pagination page={data.page} totalPages={data.totalPages} searchParams={sp} basePath="/dashboard/favorites" />
    </div>
  );
}

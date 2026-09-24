"use client";

import { useState } from "react";
import { BadgeCheck, Loader2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clientApi } from "@/lib/client";
import type { ProviderCard, SearchResponse } from "@/lib/types";
import { ProviderAvatar } from "@/components/provider/provider-avatar";

const CITIES = ["Siliguri", "Kolkata", "Bengaluru", "Delhi", "Mumbai"];

export function ClaimSearch({ providerAppUrl }: { providerAppUrl: string }) {
  const [q, setQ] = useState("");
  const [city, setCity] = useState("Siliguri");
  const [results, setResults] = useState<ProviderCard[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) return setError("Enter at least 2 characters of your business name");
    setError(null);
    setLoading(true);
    try {
      const data = await clientApi<SearchResponse>(`/search/providers?q=${encodeURIComponent(q.trim())}&city=${encodeURIComponent(city)}&pageSize=8&log=false`);
      setResults(data.results);
    } catch {
      setError("Search is not available right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={search} noValidate className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              maxLength={100}
              aria-label="Business name"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "claim-q-error" : undefined}
              onChange={(e) => {
                setQ(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Business name, e.g. Metro Electronics"
              className="h-12 pl-9"
            />
          </div>
          {error && (
            <p id="claim-q-error" role="alert" className="mt-1.5 text-xs font-medium text-destructive">
              {error}
            </p>
          )}
        </div>
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="h-12 sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CITIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" size="lg" className="h-12" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <Search />} Find my listing
        </Button>
      </form>
      {results && (
        <div className="mt-4 space-y-2">
          {results.length === 0 && (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              We could not find that business. You can create a new listing for free instead.
            </p>
          )}
          {results.map((p) => (
            <div key={p.id} className="flex items-center gap-4 rounded-xl border bg-card p-3">
              <ProviderAvatar name={p.businessName} categorySlug={p.primaryCategory?.slug} className="size-12" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{p.businessName}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" /> {p.locality}, {p.city} · {p.primaryCategory?.name}
                </div>
              </div>
              {p.isClaimed ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <BadgeCheck className="size-4" /> Already claimed
                </span>
              ) : (
                <Button asChild size="sm">
                  <a href={`${providerAppUrl}/claim?listing=${p.id}`}>Claim</a>
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

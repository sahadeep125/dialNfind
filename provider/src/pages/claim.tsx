import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, BadgeCheck, CheckCircle2, FileText, Loader2, MapPin, Search, ShieldCheck, Star } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/file-upload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Listing {
  id: number;
  businessName: string;
  locality: string | null;
  city: string;
  phone: string;
  category: string | null;
  avgRating: number;
  totalReviews: number;
  isClaimed: boolean;
}

const CITIES = ["Siliguri", "Kolkata", "Bengaluru", "Delhi", "Mumbai"];

type Step = { kind: "search" } | { kind: "confirm"; listing: Listing } | { kind: "otp"; listing: Listing; claimId: number; sentTo: string; devCode?: string } | { kind: "document-sent"; listing: Listing };

export function ClaimPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { signIn, refresh } = useAuth();
  const [step, setStep] = useState<Step>({ kind: "search" });
  const [q, setQ] = useState("");
  const [city, setCity] = useState("Siliguri");
  const [results, setResults] = useState<Listing[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [docUploading, setDocUploading] = useState(false);
  const [errors, setErrors] = useState<{ q?: string; code?: string; doc?: string }>({});

  useEffect(() => {
    const id = params.get("listing");
    if (!id) return;
    api<{ listing: Listing }>(`/provider/claims/listing/${id}`)
      .then(({ listing }) => setStep({ kind: "confirm", listing }))
      .catch(() => toast.error("We could not find that listing"));
  }, [params]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) return setErrors({ q: "Enter at least 2 characters of the business name or phone" });
    setErrors({});
    setBusy(true);
    try {
      const data = await api<{ results: Listing[] }>(`/provider/claims/search?q=${encodeURIComponent(q)}&city=${encodeURIComponent(city)}`);
      setResults(data.results);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function start(listing: Listing, method: "phone_otp" | "document") {
    if (method === "document" && !docUrl) return setErrors({ doc: "Upload a document before submitting" });
    setErrors({});
    setBusy(true);
    try {
      const res = await api<{ claim: { id: number }; sentTo: string | null; devCode?: string; token: string | null }>("/provider/claims", {
        method: "POST",
        json: { providerId: listing.id, method, documentUrl: method === "document" ? docUrl : undefined },
      });
      if (res.token) await signIn(res.token);
      if (method === "phone_otp") setStep({ kind: "otp", listing, claimId: res.claim.id, sentTo: res.sentTo ?? listing.phone, devCode: res.devCode });
      else setStep({ kind: "document-sent", listing });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (step.kind !== "otp") return;
    if (!/^\d{6}$/.test(code)) return setErrors({ code: "Enter the 6-digit code" });
    setErrors({});
    setBusy(true);
    try {
      await api(`/provider/claims/${step.claimId}/verify`, { method: "POST", json: { code } });
      await refresh();
      toast.success(`${step.listing.businessName} is now yours`);
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/start" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-brand-deep">Claim your business</h1>
      <p className="mt-2 text-muted-foreground">Find your listing, then prove it is yours. Your reviews and history stay with it.</p>

      <div className="mt-8 rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
        {step.kind === "search" && (
          <>
            <form onSubmit={search} noValidate className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      if (errors.q) setErrors({});
                    }}
                    maxLength={100}
                    aria-label="Business name or phone number"
                    aria-invalid={!!errors.q || undefined}
                    aria-describedby={errors.q ? "q-error" : undefined}
                    placeholder="Business name or phone number"
                    className="pl-9"
                  />
                </div>
                {errors.q && (
                  <p id="q-error" role="alert" className="mt-1.5 text-xs font-medium text-destructive">
                    {errors.q}
                  </p>
                )}
              </div>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger className="sm:w-36">
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
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <Search />} Search
              </Button>
            </form>
            {results && (
              <div className="mt-5 space-y-2">
                {results.length === 0 && (
                  <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No match found.{" "}
                    <Link to="/onboarding" className="font-semibold text-primary">
                      Create a new listing instead
                    </Link>
                  </div>
                )}
                {results.map((l) => (
                  <ListingRow key={l.id} listing={l} action={l.isClaimed ? <span className="text-xs text-muted-foreground">Already claimed</span> : <Button size="sm" onClick={() => setStep({ kind: "confirm", listing: l })}>Select</Button>} />
                ))}
              </div>
            )}
          </>
        )}

        {step.kind === "confirm" && (
          <div className="space-y-6">
            <ListingRow listing={step.listing} />
            {step.listing.isClaimed ? (
              <p className="rounded-xl bg-muted p-4 text-sm">This listing already has an owner. If you believe that is wrong, contact support@dialnfind.com.</p>
            ) : (
              <>
                <div className="rounded-xl bg-accent p-4">
                  <div className="flex items-center gap-2 font-semibold">
                    <ShieldCheck className="size-4 text-primary" /> Verify by phone
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">We will send a 6-digit code to {step.listing.phone}, the number on this listing.</p>
                  <Button className="mt-4" onClick={() => start(step.listing, "phone_otp")} disabled={busy}>
                    {busy && <Loader2 className="animate-spin" />} Send code
                  </Button>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-2 font-semibold">
                    <FileText className="size-4 text-primary" /> No access to that number?
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Upload a trade licence, GST certificate or shop registration. Our team reviews it within two working days.</p>
                  <div className="mt-3 space-y-3">
                    <FileUpload
                      id="claim-doc"
                      purpose="document"
                      value={docUrl}
                      onChange={(v) => {
                        setDocUrl(v);
                        if (v) setErrors({});
                      }}
                      invalid={!!errors.doc}
                      describedBy={errors.doc ? "claim-doc-error" : undefined}
                      onUploadingChange={setDocUploading}
                    />
                    {errors.doc && (
                      <p id="claim-doc-error" role="alert" className="text-xs font-medium text-destructive">
                        {errors.doc}
                      </p>
                    )}
                    <Button variant="outline" disabled={busy || docUploading} onClick={() => start(step.listing, "document")}>
                      Submit document
                    </Button>
                  </div>
                </div>
              </>
            )}
            <Button variant="ghost" onClick={() => setStep({ kind: "search" })}>
              Choose a different listing
            </Button>
          </div>
        )}

        {step.kind === "otp" && (
          <form onSubmit={verify} noValidate className="space-y-5">
            <ListingRow listing={step.listing} />
            <div className="space-y-2">
              <Label htmlFor="code">Enter the code sent to {step.sentTo}</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  if (errors.code) setErrors({});
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-invalid={!!errors.code || undefined}
                aria-describedby={errors.code ? "code-error" : undefined}
                placeholder="6-digit code"
                className="h-12 text-center font-mono text-xl tracking-[0.5em]"
                autoFocus
              />
              {errors.code && (
                <p id="code-error" role="alert" className="text-xs font-medium text-destructive">
                  {errors.code}
                </p>
              )}
              {step.devCode && <p className="text-xs text-muted-foreground">Development mode: SMS is not connected yet, use code {step.devCode}.</p>}
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Verify and claim
            </Button>
          </form>
        )}

        {step.kind === "document-sent" && (
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="size-12 text-success" />
            <h2 className="mt-4 text-xl font-bold">Claim submitted</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">We will review your document for {step.listing.businessName} and email you once it is approved.</p>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/start">Back</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ListingRow({ listing, action }: { listing: Listing; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border p-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
        <BadgeCheck className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{listing.businessName}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3" /> {listing.locality ? `${listing.locality}, ` : ""}
            {listing.city}
          </span>
          {listing.category && <span>{listing.category}</span>}
          {listing.totalReviews > 0 && (
            <span className="inline-flex items-center gap-1">
              <Star className="size-3 fill-warning text-warning" /> {Number(listing.avgRating).toFixed(1)} ({listing.totalReviews})
            </span>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

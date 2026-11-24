import { useState, type MouseEvent } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Award, BadgeCheck, Building2, ExternalLink, EyeOff, Search, MapPin, Pencil, Phone, Plus, Star, Store, Trash2, Upload, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { WEB_URL } from "@/lib/config";
import { formatDate, formatPhone, formatPrice, formatRelative } from "@/lib/format";
import { type Badge as BadgeT, type Paged, type ProviderRow, VERIFICATION_LABEL } from "@/lib/types";
import { PageHeader, Panel } from "@/components/page-header";
import { DEFAULT_PAGE_SIZE, Pager, pageSizeOf, PageSkeleton } from "@/components/common";
import { ConfirmDialog, EmptyRow, Facts, FilterSelect, SearchInput, StatCard, StatusBadge, Table, TableSkeleton, Td, Th, Toolbar, useUrlState } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { BulkBar, ExportButton, SelectAllBox, SelectRowBox, useSelection } from "@/components/bulk";
import { AddListingDialog, ImportListingsDialog } from "./provider-create";
import { DeleteListingDialog, DeleteListingPanel, OwnerActions } from "./provider-manage";
import { AccountTypeFilterTabs } from "@/components/account-type";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NotIndexedNote, SearchPreview, SeoCompletion, SeoReport, SeoScoreBadge, SeoScoreRing } from "@/components/seo";
import type { SeoAnalysis } from "@/lib/seo";

const STATUS_OPTIONS = [
  { value: "pending", label: "Waiting for approval" },
  { value: "active", label: "Live" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
];

export function ProvidersPage() {
  const [f, setF] = useUrlState({ q: "", type: "", status: "", verification: "", claimed: "", seo: "", sort: "", page: "1", pageSize: DEFAULT_PAGE_SIZE });
  const qs = new URLSearchParams({ ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)), pageSize: String(pageSizeOf(f.pageSize)) });
  const { data, isLoading } = useQuery({ queryKey: ["admin-providers", qs.toString()], queryFn: () => api<{ providers: ProviderRow[] } & Paged>(`/admin/providers?${qs}`) });
  const selection = useSelection(data?.providers.map((p) => p.id) ?? []);
  const [dialog, setDialog] = useState<"add" | "import" | null>(null);
  const [deleting, setDeleting] = useState<{ id: number; businessName: string } | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const qc = useQueryClient();
  const bulk = useMutation({
    mutationFn: (action: "approve" | "suspend" | "reject" | "verify" | "hide_from_search" | "show_in_search") => api<{ updated: number }>("/admin/providers/bulk", { method: "POST", json: { ids: selection.selected, action } }),
    onSuccess: ({ updated }) => {
      toast.success(`${updated} listing${updated === 1 ? "" : "s"} updated`);
      selection.clear();
      void qc.invalidateQueries({ queryKey: ["admin-providers"] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  const bulkDelete = useMutation({
    mutationFn: () => api<{ deleted: number }>("/admin/providers/bulk-delete", { method: "POST", json: { ids: selection.selected } }),
    onSuccess: ({ deleted }) => {
      toast.success(`${deleted} listing${deleted === 1 ? "" : "s"} deleted`);
      selection.clear();
      setBulkDeleting(false);
      void qc.invalidateQueries({ queryKey: ["admin-providers"] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <>
      <PageHeader
        title="Providers"
        description="Every business listed on KaajVa. Approve new listings, suspend bad actors and check each profile."
        actions={
          <div className="flex flex-wrap gap-2">
            <ExportButton entity="providers" filters={f} />
            <Button variant="outline" size="sm" onClick={() => setDialog("import")}>
              <Upload /> Import CSV
            </Button>
            <Button size="sm" onClick={() => setDialog("add")}>
              <Plus /> Add listing
            </Button>
          </div>
        }
      />
      <AddListingDialog open={dialog === "add"} onOpenChange={(o) => setDialog(o ? "add" : null)} />
      <ImportListingsDialog open={dialog === "import"} onOpenChange={(o) => setDialog(o ? "import" : null)} />
      <Toolbar>
        <SearchInput value={f.q} onChange={(q) => setF({ q, page: "1" })} placeholder="Search name or phone" />
        <AccountTypeFilterTabs value={f.type} onChange={(type) => setF({ type, page: "1" })} />
        <FilterSelect label="Status" allLabel="Any status" value={f.status} onChange={(status) => setF({ status, page: "1" })} options={STATUS_OPTIONS} />
        <FilterSelect
          label="Verification"
          allLabel="Any verification"
          value={f.verification}
          onChange={(verification) => setF({ verification, page: "1" })}
          options={[
            { value: "verified", label: "Verified" },
            { value: "partial", label: "Partly verified" },
            { value: "none", label: "Not verified" },
          ]}
        />
        <FilterSelect
          label="Owner"
          allLabel="Claimed or not"
          value={f.claimed}
          onChange={(claimed) => setF({ claimed, page: "1" })}
          options={[
            { value: "yes", label: "Has an owner" },
            { value: "no", label: "Unclaimed" },
          ]}
        />
        <FilterSelect
          label="SEO"
          allLabel="Any SEO score"
          value={f.seo}
          onChange={(seo) => setF({ seo, page: "1" })}
          options={[
            { value: "good", label: "SEO good (80+)" },
            { value: "fair", label: "SEO needs work (50-79)" },
            { value: "poor", label: "SEO poor (under 50)" },
            { value: "noindex", label: "Hidden from search" },
          ]}
        />
        <FilterSelect
          label="Sort"
          allLabel="Newest first"
          value={f.sort}
          onChange={(sort) => setF({ sort, page: "1" })}
          options={[
            { value: "seo_asc", label: "Lowest SEO first" },
            { value: "seo_desc", label: "Highest SEO first" },
          ]}
        />
        {data && <span className="text-sm text-muted-foreground sm:ml-auto">{data.total.toLocaleString("en-IN")} listings</span>}
      </Toolbar>
      <BulkBar selection={selection} noun="listing">
        {(
          [
            ["approve", "Approve"],
            ["verify", "Mark verified"],
            ["suspend", "Suspend"],
            ["reject", "Reject"],
            ["hide_from_search", "Hide from search"],
            ["show_in_search", "Show in search"],
          ] as const
        ).map(([action, label]) => (
          <Button key={action} size="sm" variant={action === "approve" || action === "verify" ? "default" : "outline"} disabled={bulk.isPending} onClick={() => bulk.mutate(action)}>
            {label}
          </Button>
        ))}
        {isSuperAdmin && (
          <Button size="sm" variant="destructive" disabled={bulkDelete.isPending} onClick={() => setBulkDeleting(true)}>
            <Trash2 /> Delete
          </Button>
        )}
      </BulkBar>
      <ConfirmDialog
        open={bulkDeleting}
        onOpenChange={setBulkDeleting}
        title={`Delete ${selection.count} listing${selection.count === 1 ? "" : "s"}?`}
        description="They are removed for good with their leads, reviews, claims and photos. Their old pages redirect to their category, so search engines don't find a 404."
        confirmLabel={bulkDelete.isPending ? "Deleting…" : "Delete for good"}
        destructive
        busy={bulkDelete.isPending}
        onConfirm={() => bulkDelete.mutate()}
      />
      <Table>
        <thead>
          <tr>
            <Th className="w-10">
              <SelectAllBox selection={selection} />
            </Th>
            <Th>Business</Th>
            <Th>Type and profession</Th>
            <Th>Owner</Th>
            <Th>Rating</Th>
            <Th>SEO</Th>
            <Th>Status</Th>
            <Th>Added</Th>
            <Th className="w-12">
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <TableSkeleton cols={9} />}
          {data?.providers.length === 0 && <EmptyRow cols={9} text="No providers match these filters." />}
          {data?.providers.map((p) => (
            <tr key={p.id} className="hover:bg-muted/40">
              <Td>
                <SelectRowBox selection={selection} id={p.id} label={`Select ${p.businessName}`} />
              </Td>
              <Td>
                <Link to={`/providers/${p.id}`} className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-accent text-primary">
                    {p.logoUrl ? <img src={p.logoUrl} alt="" className="size-full object-cover" /> : <Store className="size-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1 font-medium hover:text-primary">
                      <span className="truncate">{p.businessName}</span>
                      {p.verificationStatus === "verified" && <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-label="Verified" />}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {p.locality ? `${p.locality}, ` : ""}
                      {p.city}
                    </span>
                  </span>
                </Link>
              </Td>
              <Td>
                <AccountType type={p.businessType} />
                <span className="mt-0.5 block max-w-44 truncate text-xs text-muted-foreground">
                  {(p.businessType === "individual" ? p.profession : null) ?? p.services[0]?.category.name ?? "No category"}
                </span>
              </Td>
              <Td>{p.user ? <span className="block max-w-44 truncate">{p.user.email}</span> : <span className="text-muted-foreground">Unclaimed</span>}</Td>
              <Td>
                {p.totalReviews ? (
                  <span className="inline-flex items-center gap-1">
                    <Star className="size-3.5 fill-warning text-warning" /> {Number(p.avgRating).toFixed(1)} <span className="text-xs text-muted-foreground">({p.totalReviews})</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">None yet</span>
                )}
              </Td>
              <Td>
                <Link to={`/providers/${p.id}/edit#seo`} className="inline-flex items-center gap-1.5" aria-label={`SEO score ${p.seoScore}${p.seoNoIndex ? ", hidden from search" : ""}. Open SEO`}>
                  <SeoScoreBadge score={p.seoScore} />
                  {p.seoNoIndex && <EyeOff className="size-3.5 text-muted-foreground" aria-hidden />}
                </Link>
              </Td>
              <Td>
                <StatusBadge status={p.status} label={p.status === "active" ? "Live" : undefined} />
              </Td>
              <Td className="whitespace-nowrap text-muted-foreground">{formatDate(p.createdAt)}</Td>
              <Td>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Delete ${p.businessName}`}
                  title="Delete listing"
                  onClick={() => setDeleting({ id: p.id, businessName: p.businessName })}
                >
                  <Trash2 />
                </Button>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {deleting && (
        <DeleteListingDialog
          key={deleting.id}
          providerId={deleting.id}
          businessName={deleting.businessName}
          open
          onOpenChange={(o) => !o && setDeleting(null)}
          onDeleted={() => selection.clear()}
        />
      )}
      {data && <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={(p) => setF({ page: String(p) })} pageSize={pageSizeOf(f.pageSize)} onPageSize={(n) => setF({ pageSize: String(n), page: "1" })} />}
      {!f.status && !f.verification && f.claimed !== "no" && <ProviderSignups key={f.q} q={f.q} />}
    </>
  );
}

/** The listing's SEO at a glance: Google preview, score, completion and what to fix first. */
function ProviderSeoPanel({ providerId, slug, seo }: { providerId: number; slug: string; seo: SeoAnalysis }) {
  return (
    <Panel
      title="Search and Google"
      description={`Targets “${seo.focusKeyword}”${seo.focusKeywordSource === "automatic" ? " (automatic)" : ""}.`}
      actions={
        <Button asChild size="sm" variant="outline">
          <Link to={`/providers/${providerId}/edit#seo`}>
            <Pencil /> Edit SEO
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        <NotIndexedNote analysis={seo} />
        <SearchPreview title={seo.title} url={`${WEB_URL.replace(/^https?:\/\//, "")} › providers › ${slug}`} description={seo.description} />
        <div className="flex items-center gap-4">
          <SeoScoreRing score={seo.score} size={80} />
          <div className="min-w-0 flex-1">
            <SeoCompletion analysis={seo} />
          </div>
        </div>
        <SeoReport analysis={seo} limit={4} showChecks={false} />
      </div>
    </Panel>
  );
}

interface SignupRow {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

/** Provider accounts that have not created a listing yet, including ones still to confirm their email. */
function ProviderSignups({ q }: { q: string }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(Number(DEFAULT_PAGE_SIZE));
  const qs = new URLSearchParams({ ...(q ? { q } : {}), page: String(page), pageSize: String(pageSize) });
  const { data, isLoading } = useQuery({ queryKey: ["admin-provider-signups", qs.toString()], queryFn: () => api<{ users: SignupRow[] } & Paged>(`/admin/provider-signups?${qs}`) });
  if (!isLoading && !data?.total) return null;

  return (
    <Panel
      className="mt-8"
      title="Signed up, no listing yet"
      description="Provider accounts that have not created a business profile. Accounts must confirm their email before they can add one."
      actions={data && <span className="text-sm text-muted-foreground">{data.total.toLocaleString("en-IN")} accounts</span>}
    >
      <Table>
        <thead>
          <tr>
            <Th>Account</Th>
            <Th>Phone</Th>
            <Th>Email</Th>
            <Th>Status</Th>
            <Th>Last sign-in</Th>
            <Th>Signed up</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <TableSkeleton cols={6} />}
          {data?.users.map((u) => (
            <tr key={u.id} className="hover:bg-muted/40">
              <Td>
                <Link to={`/users/${u.id}`} className="block min-w-0">
                  <span className="block truncate font-medium hover:text-primary">{u.name}</span>
                  <span className="block max-w-56 truncate text-xs text-muted-foreground">{u.email}</span>
                </Link>
              </Td>
              <Td className="text-muted-foreground">{u.phone ? formatPhone(u.phone) : "Not set"}</Td>
              <Td>
                <StatusBadge status={u.emailVerifiedAt ? "verified" : "pending"} label={u.emailVerifiedAt ? "Confirmed" : "Not confirmed"} />
              </Td>
              <Td>
                <StatusBadge status={u.status} />
              </Td>
              <Td className="whitespace-nowrap text-muted-foreground">{u.lastLoginAt ? formatRelative(u.lastLoginAt) : "Never"}</Td>
              <Td className="whitespace-nowrap text-muted-foreground">{formatDate(u.createdAt)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {data && <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} pageSize={pageSize} onPageSize={(n) => { setPageSize(n); setPage(1); }} />}
    </Panel>
  );
}

interface ProviderDetail {
  provider: {
    id: number;
    slug: string;
    businessName: string;
    description: string | null;
    logoUrl: string | null;
    coverUrl: string | null;
    businessType: string;
    profession?: string | null;
    phone: string;
    whatsappNumber: string | null;
    email: string | null;
    website: string | null;
    addressLine: string | null;
    locality: string | null;
    city: string;
    state: string;
    pincode: string | null;
    serviceRadiusKm: number;
    status: ProviderRow["status"];
    verificationStatus: ProviderRow["verificationStatus"];
    avgRating: number;
    totalReviews: number;
    profileCompletenessPct: number;
    rankingScore: number;
    seoNoIndex: boolean;
    isAvailable: boolean;
    createdAt: string;
    claimedAt: string | null;
    user: { id: number; name: string; email: string; phone: string | null; status: string; createdAt: string; lastLoginAt: string | null } | null;
    services: { id: number; isPrimary: boolean; startingPrice: number | null; category: { name: string }; subcategory: { name: string } | null }[];
    verifications: { id: number; type: string; status: string; documentUrl: string | null; notes: string | null; createdAt: string }[];
    badges: { badge: BadgeT; awardedAt?: string }[];
    portfolio: { id: number; imageUrl: string; title: string }[];
  };
  stats: { leads30: number; leadsAll: number; openTickets: number };
  recentReviews: { id: number; rating: number; reviewText: string | null; status: string; createdAt: string; user: { name: string } }[];
  seo: SeoAnalysis;
}

/** A listing that is not live has no public page; the team gets a short-lived preview link instead. */
function openPreview(event: MouseEvent, providerId: number) {
  event.preventDefault();
  // Opened before the request so the browser does not block it as a popup.
  const tab = window.open("", "_blank");
  api<{ url: string }>(`/admin/providers/${providerId}/preview-link`)
    .then(({ url }) => {
      if (!tab) return void (window.location.href = url);
      tab.opener = null;
      tab.location.href = url;
    })
    .catch((err: unknown) => {
      tab?.close();
      toast.error(errorMessage(err));
    });
}

const STATUS_COPY: Record<string, { label: string; confirm: string; text: string; destructive?: boolean }> = {
  active: { label: "Approve and publish", confirm: "Publish listing", text: "The listing becomes visible in search and the owner is notified." },
  suspended: { label: "Suspend", confirm: "Suspend listing", text: "The listing is hidden from search straight away. The owner is notified and can contact support.", destructive: true },
  rejected: { label: "Reject", confirm: "Reject listing", text: "The listing stays hidden and the owner is told it was not approved.", destructive: true },
  pending: { label: "Move back to review", confirm: "Move to review", text: "The listing is hidden until someone approves it again." },
};

export function ProviderDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-provider", id], queryFn: () => api<ProviderDetail>(`/admin/providers/${id}`) });
  const { data: badgeData } = useQuery({ queryKey: ["badges"], queryFn: () => api<{ badges: BadgeT[] }>("/admin/badges") });
  const [pending, setPending] = useState<string | null>(null);
  const [badgeId, setBadgeId] = useState("");

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin-provider", id] });
    void qc.invalidateQueries({ queryKey: ["admin-providers"] });
    void qc.invalidateQueries({ queryKey: ["overview"] });
  };
  const update = useMutation({
    mutationFn: (json: Record<string, string>) => api(`/admin/providers/${id}`, { method: "PATCH", json }),
    onSuccess: () => {
      toast.success("Listing updated");
      setPending(null);
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const award = useMutation({
    mutationFn: (badge: number) => api(`/admin/providers/${id}/badges`, { method: "POST", json: { badgeId: badge } }),
    onSuccess: () => {
      toast.success("Badge awarded");
      setBadgeId("");
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const revoke = useMutation({
    mutationFn: (badge: number) => api(`/admin/providers/${id}/badges/${badge}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Badge removed");
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (!data) return <PageSkeleton />;
  const p = data.provider;
  const owned = new Set(p.badges.map((b) => b.badge.id));
  const actions = (["active", "suspended", "rejected", "pending"] as const).filter((s) => s !== p.status && !(p.status === "pending" && s === "pending"));

  return (
    <>
      <Link to="/providers" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All providers
      </Link>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-accent text-primary">
            {p.logoUrl ? <img src={p.logoUrl} alt="" className="size-full object-cover" /> : <Store className="size-7" />}
          </span>
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold text-brand-deep">
              {p.businessName} {p.verificationStatus === "verified" && <BadgeCheck className="size-5 text-primary" />}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <StatusBadge status={p.status} label={p.status === "active" ? "Live" : undefined} />
              <StatusBadge status={p.verificationStatus} label={p.verificationStatus === "none" ? "Not verified" : p.verificationStatus === "partial" ? "Partly verified" : "Verified"} />
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" /> {p.locality ? `${p.locality}, ` : ""}
                {p.city}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a href={`${WEB_URL}/providers/${p.slug}`} target="_blank" rel="noreferrer" onClick={p.status === "active" ? undefined : (e) => openPreview(e, p.id)}>
              <ExternalLink /> {p.status === "active" ? "Public page" : "Preview"}
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link to={`/providers/${p.id}/edit`}>
              <Pencil /> Edit listing
            </Link>
          </Button>
          {actions.map((s) => (
            <Button key={s} variant={STATUS_COPY[s].destructive ? "outline" : "default"} className={STATUS_COPY[s].destructive ? "text-destructive" : ""} onClick={() => setPending(s)}>
              {STATUS_COPY[s].label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Leads, last 30 days" value={data.stats.leads30} hint={`${data.stats.leadsAll} all time`} />
        <StatCard label="Rating" value={p.totalReviews ? Number(p.avgRating).toFixed(1) : "None"} hint={`${p.totalReviews} reviews`} />
        <StatCard label="Profile complete" value={`${p.profileCompletenessPct}%`} hint={`Ranking score ${Number(p.rankingScore).toFixed(2)}`} />
        <StatCard label="SEO score" value={`${data.seo.score}/100`} hint={data.seo.indexable ? `${data.seo.suggestions.length} things to improve` : "Not shown in search"} icon={Search} tone={data.seo.grade === "good" ? "success" : data.seo.grade === "fair" ? "default" : "warning"} to={`/providers/${p.id}/edit#seo`} />
        <StatCard label="Open tickets" value={data.stats.openTickets} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Business details">
            <Facts
              items={[
                ["Phone", formatPhone(p.phone)],
                ["WhatsApp", p.whatsappNumber ? formatPhone(p.whatsappNumber) : null],
                ["Email", p.email],
                ["Website", p.website],
                ["Address", [p.addressLine, p.locality, p.city, p.state, p.pincode].filter(Boolean).join(", ")],
                ["Travel distance", `${p.serviceRadiusKm} km`],
                ["Account type", p.businessType === "company" ? "Business" : "Individual professional"],
                ["Profession", p.businessType === "individual" ? (p.profession ?? "From the main service") : null],
                ["Listed", formatDate(p.createdAt)],
              ]}
            />
            {p.description && <p className="mt-5 whitespace-pre-line border-t pt-4 text-sm text-muted-foreground">{p.description}</p>}
          </Panel>
          <Panel title="Services">
            <div className="flex flex-wrap gap-2">
              {p.services.map((s) => (
                <span key={s.id} className="rounded-full border px-3 py-1 text-sm">
                  {s.subcategory?.name ?? s.category.name}
                  {s.startingPrice ? <span className="text-muted-foreground"> from {formatPrice(s.startingPrice)}</span> : null}
                  {s.isPrimary && <span className="ml-1 text-xs font-semibold text-primary">Main</span>}
                </span>
              ))}
              {!p.services.length && <p className="text-sm text-muted-foreground">No services added.</p>}
            </div>
          </Panel>
          <ProviderSeoPanel providerId={p.id} slug={p.slug} seo={data.seo} />
          <Panel title="Recent reviews">
            {data.recentReviews.length ? (
              <ul className="divide-y">
                {data.recentReviews.map((r) => (
                  <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{r.user.name}</span>
                      <span className="inline-flex items-center gap-0.5 text-xs">
                        <Star className="size-3 fill-warning text-warning" /> {r.rating}
                      </span>
                      {r.status !== "published" && <StatusBadge status={r.status} />}
                      <span className="ml-auto text-xs text-muted-foreground">{formatRelative(r.createdAt)}</span>
                    </div>
                    {r.reviewText && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.reviewText}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            )}
          </Panel>
          {p.portfolio.length > 0 && (
            <Panel title="Photos">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {p.portfolio.map((ph) => (
                  <a key={ph.id} href={ph.imageUrl} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-lg bg-muted">
                    <img src={ph.imageUrl} alt={ph.title} className="size-full object-cover" />
                  </a>
                ))}
              </div>
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <Panel title="Owner" actions={<OwnerActions providerId={p.id} businessName={p.businessName} hasOwner={!!p.user} onDone={invalidate} />}>
            {p.user ? (
              <Facts
                items={[
                  ["Name", <Link to={`/users/${p.user.id}`} className="text-primary hover:underline">{p.user.name}</Link>],
                  ["Email", p.user.email],
                  ["Phone", p.user.phone ? formatPhone(p.user.phone) : null],
                  ["Last sign in", p.user.lastLoginAt ? formatRelative(p.user.lastLoginAt) : "Never"],
                ]}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Nobody has claimed this listing yet.</p>
            )}
          </Panel>
          <Panel title="Verification">
            <ul className="space-y-2 text-sm">
              {p.verifications.length ? (
                p.verifications.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-2">
                    <span>
                      {VERIFICATION_LABEL[v.type] ?? v.type}
                      {v.documentUrl && (
                        <a href={v.documentUrl} target="_blank" rel="noreferrer" className="ml-2 text-xs font-medium text-primary hover:underline">
                          View
                        </a>
                      )}
                    </span>
                    <StatusBadge status={v.status} />
                  </li>
                ))
              ) : (
                <li className="text-muted-foreground">No documents submitted.</li>
              )}
            </ul>
            {p.verifications.some((v) => v.status === "pending") && (
              <Button asChild size="sm" className="mt-4 w-full">
                <Link to="/verifications">Review documents</Link>
              </Button>
            )}
          </Panel>
          <Panel title="Badges">
            <div className="flex flex-wrap gap-2">
              {p.badges.map(({ badge }) => (
                <span key={badge.id} className="inline-flex items-center gap-1.5 rounded-full bg-accent py-1 pl-2.5 pr-1 text-sm font-medium text-accent-foreground">
                  <Award className="size-3.5" /> {badge.name}
                  <button type="button" onClick={() => revoke.mutate(badge.id)} className="cursor-pointer rounded-full p-0.5 hover:bg-white" aria-label={`Remove ${badge.name}`}>
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
              {!p.badges.length && <span className="text-sm text-muted-foreground">No badges.</span>}
            </div>
            <div className="mt-4 flex gap-2">
              <Select value={badgeId} onValueChange={setBadgeId}>
                <SelectTrigger className="flex-1" aria-label="Badge to award">
                  <SelectValue placeholder="Choose a badge" />
                </SelectTrigger>
                <SelectContent>
                  {badgeData?.badges
                    .filter((b) => !owned.has(b.id))
                    .map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button variant="outline" disabled={!badgeId || award.isPending} onClick={() => award.mutate(Number(badgeId))}>
                Award
              </Button>
            </div>
          </Panel>
          <Panel title="Contact">
            <Button asChild variant="outline" className="w-full">
              <a href={`tel:${p.phone}`}>
                <Phone /> Call {formatPhone(p.phone)}
              </a>
            </Button>
          </Panel>
          <DeleteListingPanel providerId={p.id} businessName={p.businessName} />
        </div>
      </div>

      {pending && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setPending(null)}
          title={`${STATUS_COPY[pending].confirm}?`}
          description={STATUS_COPY[pending].text}
          confirmLabel={STATUS_COPY[pending].confirm}
          destructive={STATUS_COPY[pending].destructive}
          busy={update.isPending}
          onConfirm={() => update.mutate({ status: pending })}
        />
      )}
    </>
  );
}

/** Individual professional (a person) or business, the same words and icons as the customer apps. */
function AccountType({ type }: { type: ProviderRow["businessType"] }) {
  const individual = type === "individual";
  const Icon = individual ? UserRound : Building2;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${individual ? "bg-warning/15 text-foreground" : "bg-accent text-primary"}`}>
      <Icon className="size-3.5" aria-hidden />
      {individual ? "Individual" : "Business"}
    </span>
  );
}

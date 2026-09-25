import { useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, LogOut, MailCheck, MailWarning, Phone, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatPhone, formatRelative, initials } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { PageHeader, Panel } from "@/components/page-header";
import { PageSkeleton } from "@/components/common";
import { ConfirmDialog, Facts, StatCard, StatusBadge } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";

interface UserDetail {
  user: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    role: "super_admin" | "admin" | "provider" | "customer";
    status: "active" | "suspended" | "deleted";
    emailVerifiedAt: string | null;
    profilePhotoUrl: string | null;
    createdAt: string;
    lastLoginAt: string | null;
    provider: { id: number; businessName: string; slug: string; status: string; city: string } | null;
    _count: { reviews: number; leads: number; favorites: number; tickets: number };
  };
  reviews: { id: number; rating: number; reviewText: string | null; status: string; createdAt: string; provider: { id: number; businessName: string } }[];
  leads: { id: number; channel: string; createdAt: string; customerReportedResponse: boolean | null; provider: { id: number; businessName: string } }[];
  favorites: { id: number; businessName: string; city: string }[];
  tickets: { id: number; reference: string; subject: string; status: string; lastActivityAt: string }[];
  sessions: { id: string; createdAt: string; expiresAt: string; ip: string | null; userAgent: string | null }[];
}

const ROLE_LABEL = { super_admin: "Super admin", admin: "Team member", provider: "Business account", customer: "Customer" };

/** A short device description from a user agent, e.g. "Chrome on Android". */
function device(ua: string | null) {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : /okhttp|Expo|CFNetwork|Dalvik/i.test(ua) ? "DialNFind app" : "Browser";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad|iOS/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

export function UserDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { user: me, can } = useAuth();
  const { data } = useQuery({ queryKey: ["admin-user", id], queryFn: () => api<UserDetail>(`/admin/users/${id}`) });
  const [confirm, setConfirm] = useState<"suspended" | "active" | "deleted" | "sign-out" | null>(null);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-user", id] });
    void qc.invalidateQueries({ queryKey: ["admin-users"] });
  };
  const setStatus = useMutation({
    mutationFn: (status: "active" | "suspended" | "deleted") => api(`/admin/users/${id}`, { method: "PATCH", json: { status } }),
    onSuccess: (_r, status) => {
      toast.success(status === "active" ? "Account reactivated" : status === "suspended" ? "Account suspended" : "Account deleted");
      setConfirm(null);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const signOut = useMutation({
    mutationFn: () => api(`/admin/users/${id}/sign-out`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Signed out on every device");
      setConfirm(null);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const resend = useMutation({
    mutationFn: () => api(`/admin/users/${id}/resend-verification`, { method: "POST" }),
    onSuccess: () => toast.success("Confirmation email sent"),
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (!data) return <PageSkeleton />;
  const u = data.user;
  const staff = u.role === "admin" || u.role === "super_admin";
  const editable = !staff && u.status !== "deleted" && u.id !== me?.id;
  const copy = {
    suspended: { title: `Suspend ${u.name}?`, text: "They are signed out and cannot sign in until you reactivate the account.", label: "Suspend" },
    active: { title: `Reactivate ${u.name}?`, text: "They can sign in again straight away.", label: "Reactivate" },
    deleted: {
      title: `Delete ${u.name}?`,
      text: "Their name, email, phone, reviews and favourites are erased and they are signed out everywhere. A business they owned stays listed as unclaimed. This cannot be undone.",
      label: "Delete account",
    },
    "sign-out": { title: `Sign ${u.name} out everywhere?`, text: "Every app and browser they use has to sign in again. Use this after a lost phone or a shared password.", label: "Sign out everywhere" },
  };

  return (
    <>
      <Link to="/users" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All users
      </Link>
      <PageHeader
        title={u.name}
        description={`${ROLE_LABEL[u.role]} since ${formatDate(u.createdAt)}`}
        actions={
          editable ? (
            <>
              {!u.emailVerifiedAt && u.status === "active" && (
                <Button variant="outline" disabled={resend.isPending} onClick={() => resend.mutate()}>
                  <MailWarning /> Resend confirmation
                </Button>
              )}
              <Button variant="outline" onClick={() => setConfirm("sign-out")}>
                <LogOut /> Sign out everywhere
              </Button>
              {u.status === "active" ? (
                <Button variant="outline" className="text-destructive" onClick={() => setConfirm("suspended")}>
                  Suspend
                </Button>
              ) : (
                <Button onClick={() => setConfirm("active")}>Reactivate</Button>
              )}
              <Button variant="outline" className="text-destructive" onClick={() => setConfirm("deleted")}>
                <Trash2 /> Delete
              </Button>
            </>
          ) : staff && can("team") ? (
            <Button asChild variant="outline">
              <Link to="/team">Manage in Team</Link>
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Contacts made" value={u._count.leads} />
        <StatCard label="Reviews" value={u._count.reviews} />
        <StatCard label="Favourites" value={u._count.favorites} />
        <StatCard label="Support tickets" value={u._count.tickets} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Recent reviews">
            {data.reviews.length ? (
              <ul className="divide-y">
                {data.reviews.map((r) => (
                  <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2 text-sm">
                      <Link to={`/providers/${r.provider.id}`} className="font-medium hover:text-primary">
                        {r.provider.businessName}
                      </Link>
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
              <p className="text-sm text-muted-foreground">No reviews.</p>
            )}
          </Panel>
          <Panel title="Recent contacts">
            {data.leads.length ? (
              <ul className="divide-y text-sm">
                {data.leads.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                    <span>
                      <Phone className="mr-1.5 inline size-3.5 text-muted-foreground" />
                      {l.channel === "whatsapp" ? "WhatsApp" : "Call"} to{" "}
                      <Link to={`/providers/${l.provider.id}`} className="font-medium hover:text-primary">
                        {l.provider.businessName}
                      </Link>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {l.customerReportedResponse === true ? "They responded · " : l.customerReportedResponse === false ? "No response · " : ""}
                      {formatRelative(l.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No contacts.</p>
            )}
          </Panel>
          {data.tickets.length > 0 && (
            <Panel title="Support tickets">
              <ul className="divide-y text-sm">
                {data.tickets.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                    <Link to={`/support/${t.id}`} className="min-w-0 truncate hover:text-primary">
                      <span className="font-mono text-xs text-muted-foreground">{t.reference}</span> {t.subject}
                    </Link>
                    <StatusBadge status={t.status} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
        <div className="space-y-6">
          <Panel title="Account">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-12 items-center justify-center overflow-hidden rounded-full bg-accent font-semibold text-primary">
                {u.profilePhotoUrl ? <img src={u.profilePhotoUrl} alt="" className="size-full object-cover" /> : initials(u.name)}
              </span>
              <StatusBadge status={u.status} />
            </div>
            <Facts
              items={[
                ["Email", u.email],
                ["Email confirmed", u.emailVerifiedAt ? <span className="inline-flex items-center gap-1 text-success"><MailCheck className="size-3.5" /> {formatDate(u.emailVerifiedAt)}</span> : "Not yet"],
                ["Phone", u.phone ? formatPhone(u.phone) : null],
                ["Last sign in", u.lastLoginAt ? formatRelative(u.lastLoginAt) : "Never"],
              ]}
            />
          </Panel>
          {u.provider && (
            <Panel title="Business">
              <Link to={`/providers/${u.provider.id}`} className="font-medium hover:text-primary">
                {u.provider.businessName}
              </Link>
              <p className="text-sm text-muted-foreground">{u.provider.city}</p>
              <div className="mt-2">
                <StatusBadge status={u.provider.status} label={u.provider.status === "active" ? "Live" : undefined} />
              </div>
            </Panel>
          )}
          <Panel title="Signed in on">
            {data.sessions.length ? (
              <ul className="space-y-2 text-sm">
                {data.sessions.map((s) => (
                  <li key={s.id}>
                    <div className="font-medium">{device(s.userAgent)}</div>
                    <div className="text-xs text-muted-foreground">
                      Since {formatRelative(s.createdAt)}
                      {s.ip ? ` · ${s.ip}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Not signed in anywhere.</p>
            )}
          </Panel>
          {data.favorites.length > 0 && (
            <Panel title="Favourites">
              <ul className="space-y-1 text-sm">
                {data.favorites.map((f) => (
                  <li key={f.id}>
                    <Link to={`/providers/${f.id}`} className="hover:text-primary">
                      {f.businessName}
                    </Link>{" "}
                    <span className="text-muted-foreground">{f.city}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>

      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={copy[confirm].title}
          description={copy[confirm].text}
          confirmLabel={copy[confirm].label}
          destructive={confirm !== "active"}
          busy={setStatus.isPending || signOut.isPending}
          onConfirm={() => (confirm === "sign-out" ? signOut.mutate() : setStatus.mutate(confirm))}
        />
      )}
    </>
  );
}

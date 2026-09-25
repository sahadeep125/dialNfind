import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatRelative, initials } from "@/lib/format";
import type { Paged } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Pager } from "@/components/common";
import { ConfirmDialog, EmptyRow, FilterSelect, SearchInput, StatusBadge, Table, TableSkeleton, Td, Th, Toolbar, useUrlState } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { BulkBar, ExportButton, SelectAllBox, SelectRowBox, useSelection } from "@/components/bulk";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface UserRow {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: "super_admin" | "admin" | "provider" | "customer";
  status: "active" | "suspended" | "deleted";
  createdAt: string;
  lastLoginAt: string | null;
  profilePhotoUrl: string | null;
  provider: { id: number; businessName: string; slug: string } | null;
  _count: { reviews: number; leads: number };
}

const ROLE_LABEL: Record<UserRow["role"], string> = { super_admin: "Super admin", admin: "Team", provider: "Provider", customer: "Customer" };

export function UsersPage() {
  const qc = useQueryClient();
  const { can } = useAuth();
  const [f, setF] = useUrlState({ q: "", role: "", status: "", page: "1" });
  const params = new URLSearchParams({ pageSize: "20", page: f.page });
  for (const k of ["q", "role", "status"] as const) if (f[k]) params.set(k, f[k]);
  const { data, isLoading } = useQuery({ queryKey: ["admin-users", params.toString()], queryFn: () => api<{ users: UserRow[] } & Paged>(`/admin/users?${params}`) });
  const [pending, setPending] = useState<{ user: UserRow; status: UserRow["status"] } | null>(null);
  const selectable = data?.users.filter((u) => (u.role === "customer" || u.role === "provider") && u.status !== "deleted") ?? [];
  const selection = useSelection(selectable.map((u) => u.id));
  const bulk = useMutation({
    mutationFn: (action: "suspend" | "reactivate") => api<{ updated: number }>("/admin/users/bulk", { method: "POST", json: { ids: selection.selected, action } }),
    onSuccess: ({ updated }, action) => {
      toast.success(`${updated} account${updated === 1 ? "" : "s"} ${action === "suspend" ? "suspended" : "reactivated"}`);
      selection.clear();
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: number; status: UserRow["status"] }) => api(`/admin/users/${id}`, { method: "PATCH", json: { status } }),
    onSuccess: (_r, v) => {
      toast.success(v.status === "active" ? "Account reactivated" : v.status === "suspended" ? "Account suspended" : "Account deleted");
      setPending(null);
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const copy = pending && {
    active: { title: `Reactivate ${pending.user.name}?`, text: "They can sign in again straight away.", label: "Reactivate" },
    suspended: { title: `Suspend ${pending.user.name}?`, text: "They are signed out and cannot sign in until you reactivate the account. Their reviews stay visible.", label: "Suspend" },
    deleted: {
      title: `Delete ${pending.user.name}?`,
      text: "Their name, email, phone, reviews and favourites are erased and they are signed out everywhere. A business they owned stays listed as unclaimed. This cannot be undone.",
      label: "Delete account",
    },
  }[pending.status];

  return (
    <>
      <PageHeader title="Users" description="Customers and provider accounts. Team members are managed from Team." actions={<ExportButton entity="users" filters={f} />} />
      <Toolbar>
        <SearchInput value={f.q} onChange={(q) => setF({ q, page: "1" })} placeholder="Search name, email or phone" />
        <FilterSelect
          label="Role"
          allLabel="Every role"
          value={f.role}
          onChange={(role) => setF({ role, page: "1" })}
          options={[
            { value: "customer", label: "Customers" },
            { value: "provider", label: "Providers" },
            { value: "admin", label: "Team" },
          ]}
        />
        <FilterSelect
          label="Status"
          allLabel="Any status"
          value={f.status}
          onChange={(status) => setF({ status, page: "1" })}
          options={[
            { value: "active", label: "Active" },
            { value: "suspended", label: "Suspended" },
            { value: "deleted", label: "Deleted" },
          ]}
        />
        {data && <span className="text-sm text-muted-foreground sm:ml-auto">{data.total.toLocaleString("en-IN")} accounts</span>}
      </Toolbar>
      <BulkBar selection={selection} noun="account">
        <Button size="sm" variant="outline" disabled={bulk.isPending} onClick={() => bulk.mutate("suspend")}>
          Suspend
        </Button>
        <Button size="sm" disabled={bulk.isPending} onClick={() => bulk.mutate("reactivate")}>
          Reactivate
        </Button>
      </BulkBar>
      <Table>
        <thead>
          <tr>
            <Th className="w-10">
              <SelectAllBox selection={selection} />
            </Th>
            <Th>Person</Th>
            <Th>Role</Th>
            <Th>Activity</Th>
            <Th>Last sign in</Th>
            <Th>Joined</Th>
            <Th>Status</Th>
            <Th className="w-12" />
          </tr>
        </thead>
        <tbody>
          {isLoading && <TableSkeleton cols={8} />}
          {data?.users.length === 0 && <EmptyRow cols={8} text="No accounts match these filters." />}
          {data?.users.map((u) => {
            const staff = u.role === "admin" || u.role === "super_admin";
            return (
              <tr key={u.id} className="hover:bg-muted/40">
                <Td>{selectable.includes(u) && <SelectRowBox selection={selection} id={u.id} label={`Select ${u.name}`} />}</Td>
                <Td>
                  <Link to={`/users/${u.id}`} className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-xs font-semibold text-primary">
                      {u.profilePhotoUrl ? <img src={u.profilePhotoUrl} alt="" className="size-full object-cover" /> : initials(u.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium hover:text-primary">{u.name}</span>
                      <span className="block max-w-56 truncate text-xs text-muted-foreground">{u.email}</span>
                    </span>
                  </Link>
                </Td>
                <Td>
                  {ROLE_LABEL[u.role]}
                  {u.provider && (
                    <Link to={`/providers/${u.provider.id}`} className="block max-w-40 truncate text-xs text-primary hover:underline">
                      {u.provider.businessName}
                    </Link>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-muted-foreground">
                  {u._count.leads} contacts, {u._count.reviews} reviews
                </Td>
                <Td className="whitespace-nowrap text-muted-foreground">{u.lastLoginAt ? formatRelative(u.lastLoginAt) : "Never"}</Td>
                <Td className="whitespace-nowrap text-muted-foreground">{formatDate(u.createdAt)}</Td>
                <Td>
                  <StatusBadge status={u.status} />
                </Td>
                <Td>
                  {staff ? (
                    can("team") && (
                      <Button asChild variant="ghost" size="sm">
                        <Link to="/team">Team</Link>
                      </Button>
                    )
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${u.name}`}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {u.status === "suspended" && <DropdownMenuItem onSelect={() => setPending({ user: u, status: "active" })}>Reactivate</DropdownMenuItem>}
                        {u.status === "active" && <DropdownMenuItem onSelect={() => setPending({ user: u, status: "suspended" })}>Suspend</DropdownMenuItem>}
                        {u.status !== "deleted" && (
                          <DropdownMenuItem className="text-destructive" onSelect={() => setPending({ user: u, status: "deleted" })}>
                            Delete account
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      {data && <Pager page={data.page} totalPages={data.totalPages} onPage={(p) => setF({ page: String(p) })} />}
      {pending && copy && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setPending(null)}
          title={copy.title}
          description={copy.text}
          confirmLabel={copy.label}
          destructive={pending.status !== "active"}
          busy={update.isPending}
          onConfirm={() => update.mutate({ id: pending.user.id, status: pending.status })}
        />
      )}
    </>
  );
}

import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import type { Paged } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Pager } from "@/components/common";
import { EmptyRow, FilterSelect, humanize, Table, TableSkeleton, Td, Th, Toolbar, useUrlState } from "@/components/admin-ui";

interface LogRow {
  id: number;
  action: string;
  targetType: string;
  targetId: number | null;
  detailsJson: Record<string, unknown> | null;
  createdAt: string;
  admin: { id: number; name: string };
}

const TARGETS: { value: string; label: string }[] = [
  { value: "provider", label: "Providers" },
  { value: "provider_claim", label: "Claims" },
  { value: "verification", label: "Verifications" },
  { value: "category", label: "Categories" },
  { value: "subcategory", label: "Subcategories" },
  { value: "review", label: "Reviews" },
  { value: "report_flag", label: "Reports" },
  { value: "user", label: "Users and team" },
  { value: "admin_role", label: "Roles" },
  { value: "subscription_plan", label: "Plans" },
  { value: "provider_subscription", label: "Subscriptions" },
  { value: "sponsored_listing", label: "Promotions" },
  { value: "badge", label: "Badges" },
  { value: "support_ticket", label: "Tickets" },
  { value: "setting", label: "Settings" },
  { value: "notification", label: "Announcements" },
];

const VERBS: Record<string, string> = {
  create: "created",
  update: "updated",
  delete: "deleted",
  deactivate: "deactivated",
  moderate: "moderated",
  award: "awarded a badge to",
  revoke: "revoked a badge from",
  invite: "invited",
  remove: "removed",
  reset_password: "reset the password of",
  grant: "granted a plan to",
  reply: "replied to",
  note: "added a note to",
  broadcast: "sent",
  approved: "approved",
  rejected: "rejected",
  resolved: "resolved",
  dismissed: "dismissed",
};

function describe(l: LogRow) {
  const [, verb = l.action] = l.action.split(".");
  const target = TARGETS.find((t) => t.value === l.targetType)?.label.replace(/s$/, "").toLowerCase() ?? humanize(l.targetType).toLowerCase();
  const d = l.detailsJson ?? {};
  let what = `${target}${l.targetId ? ` #${l.targetId}` : ""}`;
  if (l.action === "notification.broadcast") what = `an announcement to ${d.recipients ?? "some"} people`;
  if (l.action === "settings.update") what = `${Array.isArray(d.changes) ? d.changes.length : "some"} settings`;
  if (typeof d.status === "string" && verb === "update") return `set ${what} to ${humanize(d.status).toLowerCase()}`;
  return `${VERBS[verb] ?? humanize(verb).toLowerCase()} ${what}`;
}

export function AuditPage() {
  const [f, setF] = useUrlState({ targetType: "", page: "1" });
  const [open, setOpen] = useState<number | null>(null);
  const params = new URLSearchParams({ pageSize: "30", page: f.page });
  if (f.targetType) params.set("targetType", f.targetType);
  const { data, isLoading } = useQuery({ queryKey: ["admin-audit", params.toString()], queryFn: () => api<{ logs: LogRow[] } & Paged>(`/admin/activity-logs?${params}`) });

  return (
    <>
      <PageHeader title="Audit log" description="Every change made from the admin console, newest first. Secret values are never recorded." />
      <Toolbar>
        <FilterSelect label="Area" allLabel="Everything" value={f.targetType} onChange={(targetType) => setF({ targetType, page: "1" })} options={TARGETS} className="sm:w-52" />
        {data && <span className="text-sm text-muted-foreground sm:ml-auto">{data.total.toLocaleString("en-IN")} entries</span>}
      </Toolbar>
      <Table>
        <thead>
          <tr>
            <Th>When</Th>
            <Th>Who</Th>
            <Th>What happened</Th>
            <Th className="w-12" />
          </tr>
        </thead>
        <tbody>
          {isLoading && <TableSkeleton cols={4} />}
          {data?.logs.length === 0 && <EmptyRow cols={4} text="Nothing recorded yet." />}
          {data?.logs.map((l) => {
            const hasDetails = l.detailsJson && Object.keys(l.detailsJson).length > 0;
            return (
              <Fragment key={l.id}>
                <tr className={cn(hasDetails && "cursor-pointer hover:bg-muted/40")} onClick={() => hasDetails && setOpen(open === l.id ? null : l.id)}>
                  <Td className="whitespace-nowrap text-muted-foreground">{new Date(l.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</Td>
                  <Td className="whitespace-nowrap font-medium">{l.admin.name}</Td>
                  <Td>
                    {describe(l)}
                    <div className="font-mono text-xs text-muted-foreground">{l.action}</div>
                  </Td>
                  <Td>
                    {hasDetails && (
                      <button type="button" className="cursor-pointer rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Show details" aria-expanded={open === l.id}>
                        <ChevronDown className={cn("size-4 transition-transform", open === l.id && "rotate-180")} />
                      </button>
                    )}
                  </Td>
                </tr>
                {open === l.id && (
                  <tr>
                    <Td colSpan={4} className="bg-muted/40">
                      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(l.detailsJson, null, 2)}</pre>
                    </Td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </Table>
      {data && <Pager page={data.page} totalPages={data.totalPages} onPage={(p) => setF({ page: String(p) })} />}
    </>
  );
}

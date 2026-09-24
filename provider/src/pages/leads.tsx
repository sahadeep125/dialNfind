import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleHelp, MessageCircle, Phone, PhoneIncoming, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader, Panel } from "@/components/page-header";
import { EmptyState, PageSkeleton, Pager, Stars } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Lead {
  id: number;
  channel: "call" | "whatsapp";
  source: string;
  description: string | null;
  createdAt: string;
  customerName: string;
  isGuest: boolean;
  service: string | null;
  customerReportedResponse: boolean | null;
  reviewRating: number | null;
}

interface LeadsResponse {
  leads: Lead[];
  page: number;
  totalPages: number;
  total: number;
}

const SOURCE_LABEL: Record<string, string> = { search: "Search results", profile: "Your profile", category_browse: "Category page", ai_match: "Smart match" };

export function LeadsPage() {
  const [channel, setChannel] = useState<"all" | "call" | "whatsapp">("all");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["leads", channel, page],
    queryFn: () => api<LeadsResponse>(`/provider/leads?page=${page}&pageSize=15${channel === "all" ? "" : `&channel=${channel}`}`),
    placeholderData: keepPreviousData,
  });

  if (isLoading || !data) return <PageSkeleton />;

  return (
    <>
      <PageHeader title="Leads" description="Every customer who tapped Call or WhatsApp on your listing." />
      <Tabs
        value={channel}
        onValueChange={(v) => {
          setChannel(v as typeof channel);
          setPage(1);
        }}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="call">Calls</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        </TabsList>
      </Tabs>

      {data.leads.length === 0 ? (
        <EmptyState icon={PhoneIncoming} title="No leads yet" text="Complete your profile and add prices to appear higher in search. Leads show up here the moment a customer contacts you." />
      ) : (
        <Panel className="p-0 md:p-0">
          <div className="hidden grid-cols-[1.4fr_1fr_1fr_1fr] gap-4 border-b px-6 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
            <span>Customer</span>
            <span>Service</span>
            <span>Came from</span>
            <span>Outcome</span>
          </div>
          <ul className="divide-y">
            {data.leads.map((l) => (
              <li key={l.id} className="grid gap-1.5 px-4 py-3.5 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:items-center md:gap-4 md:px-6">
                <div className="flex items-center gap-3">
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", l.channel === "call" ? "bg-accent text-primary" : "bg-success/10 text-success")}>
                    {l.channel === "call" ? <Phone className="size-4" /> : <MessageCircle className="size-4" />}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {l.customerName}
                      {l.isGuest && <span className="ml-2 text-xs font-normal text-muted-foreground">not signed in</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {l.channel === "call" ? "Call" : "WhatsApp"} · {formatRelative(l.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-12 md:contents md:pl-0">
                <div className="text-sm">
                  {l.service ?? <span className="text-muted-foreground">General enquiry</span>}
                  {l.description && <div className="line-clamp-1 hidden text-xs text-muted-foreground md:block">{l.description}</div>}
                </div>
                <div className="text-sm text-muted-foreground">{SOURCE_LABEL[l.source] ?? l.source}</div>
                <div>
                  <Outcome lead={l} />
                </div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />
    </>
  );
}

function Outcome({ lead }: { lead: Lead }) {
  if (lead.reviewRating) return <Stars rating={lead.reviewRating} />;
  if (lead.customerReportedResponse === true)
    return (
      <Badge variant="secondary" className="gap-1 bg-success/10 text-success">
        <CheckCircle2 className="size-3" /> Responded
      </Badge>
    );
  if (lead.customerReportedResponse === false)
    return (
      <Badge variant="secondary" className="gap-1 bg-destructive/10 text-destructive">
        <XCircle className="size-3" /> Missed
      </Badge>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <CircleHelp className="size-3" /> Awaiting feedback
    </span>
  );
}

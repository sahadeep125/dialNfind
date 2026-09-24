import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Loader2, MessageSquare, Pencil, Reply } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { formatRelative, initials } from "@/lib/format";
import { PageHeader, Panel } from "@/components/page-header";
import { EmptyState, PageSkeleton, Pager, Stars } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface Review {
  id: number;
  rating: number;
  reviewText: string | null;
  providerReply: string | null;
  providerReplyAt: string | null;
  status: string;
  isVerifiedContact: boolean;
  createdAt: string;
  author: string;
  photos: string[];
}

interface ReviewsResponse {
  summary: { avgRating: number; totalReviews: number; breakdown: { rating: number; count: number }[] };
  reviews: Review[];
  page: number;
  totalPages: number;
}

export function ReviewsPage() {
  const [filter, setFilter] = useState<"all" | "unreplied">("all");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["reviews", filter, page],
    queryFn: () => api<ReviewsResponse>(`/provider/reviews?filter=${filter}&page=${page}&pageSize=10`),
    placeholderData: keepPreviousData,
  });

  if (isLoading || !data) return <PageSkeleton />;
  const { summary } = data;
  const max = Math.max(1, ...summary.breakdown.map((b) => b.count));

  return (
    <>
      <PageHeader title="Reviews" description="Replying to reviews shows customers you care and improves your ranking." />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Panel className="h-fit">
          <div className="text-4xl font-bold">{summary.avgRating.toFixed(1)}</div>
          <Stars rating={summary.avgRating} className="mt-2" />
          <div className="mt-1 text-sm text-muted-foreground">{summary.totalReviews} reviews</div>
          <div className="mt-5 space-y-2">
            {summary.breakdown.map((b) => (
              <div key={b.rating} className="flex items-center gap-3 text-sm">
                <span className="w-3 text-muted-foreground">{b.rating}</span>
                <Progress value={(b.count / max) * 100} className="h-2 flex-1" />
                <span className="w-8 text-right tabular-nums text-muted-foreground">{b.count}</span>
              </div>
            ))}
          </div>
        </Panel>

        <div>
          <Tabs
            value={filter}
            onValueChange={(v) => {
              setFilter(v as typeof filter);
              setPage(1);
            }}
            className="mb-4"
          >
            <TabsList>
              <TabsTrigger value="all">All reviews</TabsTrigger>
              <TabsTrigger value="unreplied">Needs a reply</TabsTrigger>
            </TabsList>
          </Tabs>
          {data.reviews.length === 0 ? (
            <EmptyState icon={MessageSquare} title={filter === "unreplied" ? "You are all caught up" : "No reviews yet"} text={filter === "unreplied" ? "Every review has a reply." : "Customers who contact you through DialNFind can leave a review here."} />
          ) : (
            <div className="space-y-4">
              {data.reviews.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>
          )}
          <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />
        </div>
      </div>
    </>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(review.providerReply ?? "");
  const mutation = useMutation({
    mutationFn: (reply: string | null) => api(`/provider/reviews/${review.id}/reply`, { method: "PUT", json: { reply } }),
    onSuccess: () => {
      toast.success("Reply published");
      setEditing(false);
      void qc.invalidateQueries();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <Panel>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-primary">{initials(review.author)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium">{review.author}</span>
            {review.isVerifiedContact && (
              <span className="inline-flex items-center gap-1 text-xs text-success">
                <BadgeCheck className="size-3.5" /> Contacted via DialNFind
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Stars rating={review.rating} /> {formatRelative(review.createdAt)}
          </div>
          {review.reviewText && <p className="mt-3 text-sm leading-relaxed">{review.reviewText}</p>}

          {review.providerReply && !editing && (
            <div className="mt-4 rounded-xl bg-muted p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Your reply</span>
                <Button variant="ghost" size="sm" className="h-7" onClick={() => setEditing(true)}>
                  <Pencil /> Edit
                </Button>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{review.providerReply}</p>
            </div>
          )}

          {!review.providerReply && !editing && (
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setEditing(true)}>
              <Reply /> Reply
            </Button>
          )}

          {editing && (
            <div className="mt-4 space-y-2">
              <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Thank the customer and address any concern, politely and briefly." autoFocus />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                {review.providerReply && (
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => mutation.mutate(null)} disabled={mutation.isPending}>
                    Remove reply
                  </Button>
                )}
                <Button size="sm" onClick={() => mutation.mutate(text.trim())} disabled={mutation.isPending || text.trim().length < 2}>
                  {mutation.isPending && <Loader2 className="animate-spin" />} Publish reply
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

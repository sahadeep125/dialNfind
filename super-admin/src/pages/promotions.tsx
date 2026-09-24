import { useState } from "react";
import { Link } from "react-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Megaphone, MoreHorizontal, Pause, Play, Plus, Square } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import type { CategoryOption } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { EmptyRow, FilterSelect, StatCard, StatusBadge, Table, TableSkeleton, Td, Th, Toolbar } from "@/components/admin-ui";
import { Field, fieldA11y, FormAlert } from "@/components/form";
import { ProviderPicker } from "@/components/provider-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Listing {
  id: number;
  targetLocation: string | null;
  startDate: string;
  endDate: string;
  budget: number;
  amountSpent: number;
  impressions: number;
  clicks: number;
  status: "active" | "paused" | "completed";
  provider: { id: number; businessName: string; city: string };
  category: { id: number; name: string };
}

export function PromotionsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Listing | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["sponsored", status], queryFn: () => api<{ listings: Listing[] }>(`/admin/sponsored${status ? `?status=${status}` : ""}`) });
  const update = useMutation({
    mutationFn: ({ id, json }: { id: number; json: Record<string, unknown> }) => api(`/admin/sponsored/${id}`, { method: "PATCH", json }),
    onSuccess: () => {
      toast.success("Promotion updated");
      void qc.invalidateQueries({ queryKey: ["sponsored"] });
      void qc.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const listings = data?.listings ?? [];
  const active = listings.filter((l) => l.status === "active");
  const spend = listings.reduce((a, l) => a + Number(l.amountSpent), 0);
  const clicks = listings.reduce((a, l) => a + l.clicks, 0);
  const impressions = listings.reduce((a, l) => a + l.impressions, 0);

  return (
    <>
      <PageHeader
        title="Promotions"
        description="Sponsored placements at the top of category searches. Providers buy them from their app; you can also start one for them."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus /> New promotion
          </Button>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Running now" value={active.length} icon={Megaphone} />
        <StatCard label="Spent" value={formatPrice(spend)} tone="success" />
        <StatCard label="Times shown" value={impressions.toLocaleString("en-IN")} />
        <StatCard label="Customer contacts" value={clicks.toLocaleString("en-IN")} hint={impressions ? `${((clicks / impressions) * 100).toFixed(1)}% of views` : undefined} />
      </div>
      <Toolbar>
        <FilterSelect
          label="Status"
          allLabel="Any status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "active", label: "Running" },
            { value: "paused", label: "Paused" },
            { value: "completed", label: "Finished" },
          ]}
        />
      </Toolbar>
      <Table>
        <thead>
          <tr>
            <Th>Provider</Th>
            <Th>Category</Th>
            <Th>Dates</Th>
            <Th>Budget used</Th>
            <Th>Results</Th>
            <Th>Status</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {isLoading && <TableSkeleton cols={7} />}
          {data && listings.length === 0 && <EmptyRow cols={7} text="No promotions match." />}
          {listings.map((l) => (
            <tr key={l.id}>
              <Td>
                <Link to={`/providers/${l.provider.id}`} className="font-medium hover:text-primary">
                  {l.provider.businessName}
                </Link>
                <div className="text-xs text-muted-foreground">{l.targetLocation ?? l.provider.city}</div>
              </Td>
              <Td>{l.category.name}</Td>
              <Td className="whitespace-nowrap text-xs">
                {formatDate(l.startDate)} to {formatDate(l.endDate)}
              </Td>
              <Td className="min-w-40">
                <div className="text-xs">
                  {formatPrice(l.amountSpent)} of {formatPrice(l.budget)}
                </div>
                <Progress value={(Number(l.amountSpent) / Math.max(1, Number(l.budget))) * 100} className="mt-1 h-1.5" />
              </Td>
              <Td className="whitespace-nowrap text-xs">
                {l.impressions.toLocaleString("en-IN")} views, {l.clicks} contacts
              </Td>
              <Td>
                <StatusBadge status={l.status} label={l.status === "active" ? "Running" : l.status === "completed" ? "Finished" : undefined} />
              </Td>
              <Td className="text-right">
                {l.status !== "completed" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Promotion actions">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {l.status === "active" ? (
                        <DropdownMenuItem onSelect={() => update.mutate({ id: l.id, json: { status: "paused" } })}>
                          <Pause /> Pause
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onSelect={() => update.mutate({ id: l.id, json: { status: "active" } })}>
                          <Play /> Resume
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onSelect={() => setEditing(l)}>Change budget or end date</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onSelect={() => update.mutate({ id: l.id, json: { status: "completed" } })}>
                        <Square /> End now
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {creating && <PromotionDialog onClose={() => setCreating(false)} />}
      {editing && <PromotionDialog listing={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

const today = () => new Date().toISOString().slice(0, 10);
const schema = z
  .object({
    provider: z.object({ id: z.number(), businessName: z.string(), city: z.string() }).nullable(),
    categoryId: z.string(),
    targetLocation: z.string().trim().max(80, "Keep it under 80 characters"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a start date"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick an end date"),
    budget: z.string().trim().refine((v) => /^\d{1,7}$/.test(v) && Number(v) >= 100, "Enter a budget of at least Rs 100, in whole rupees"),
  })
  .refine((v) => v.endDate > v.startDate, { path: ["endDate"], message: "End date must be after the start date" });
type Values = z.infer<typeof schema>;

function PromotionDialog({ listing, onClose }: { listing?: Listing; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: cats } = useQuery({ queryKey: ["categories"], queryFn: () => api<{ categories: CategoryOption[] }>("/categories") });
  const [error, setError] = useState<string | null>(null);
  const editing = !!listing;
  const { register, control, handleSubmit, setError: setFieldError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      provider: listing ? listing.provider : null,
      categoryId: listing ? String(listing.category.id) : "",
      targetLocation: listing?.targetLocation ?? "",
      startDate: listing ? listing.startDate.slice(0, 10) : today(),
      endDate: listing ? listing.endDate.slice(0, 10) : new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
      budget: listing ? String(Math.round(Number(listing.budget))) : "1500",
    },
  });
  const { errors, isSubmitting } = formState;
  const onSubmit = handleSubmit(async (v) => {
    if (!editing && !v.provider) return setFieldError("provider", { message: "Choose a provider" });
    if (!editing && !v.categoryId) return setFieldError("categoryId", { message: "Choose a category" });
    setError(null);
    try {
      if (listing) {
        await api(`/admin/sponsored/${listing.id}`, { method: "PATCH", json: { budget: Number(v.budget), endDate: v.endDate, targetLocation: v.targetLocation || null } });
      } else {
        await api("/admin/sponsored", {
          method: "POST",
          json: { providerId: v.provider!.id, categoryId: Number(v.categoryId), targetLocation: v.targetLocation || null, startDate: v.startDate, endDate: v.endDate, budget: Number(v.budget) },
        });
      }
      toast.success(editing ? "Promotion updated" : "Promotion started");
      void qc.invalidateQueries({ queryKey: ["sponsored"] });
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Change promotion" : "New promotion"}</DialogTitle>
          <DialogDescription>{editing ? `${listing.provider.businessName} in ${listing.category.name}` : "No payment is taken. Use this for partner deals or to make good on a problem."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
          {error && (
            <div className="sm:col-span-2">
              <FormAlert message={error} />
            </div>
          )}
          {!editing && (
            <>
              <Field id="promo-provider" label="Provider" error={errors.provider?.message} required className="sm:col-span-2">
                <Controller control={control} name="provider" render={({ field }) => <ProviderPicker id="promo-provider" value={field.value} onChange={field.onChange} invalid={!!errors.provider} describedBy={errors.provider ? "promo-provider-error" : undefined} />} />
              </Field>
              <Field id="promo-cat" label="Category" error={errors.categoryId} required>
                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="promo-cat" className="w-full" aria-invalid={errors.categoryId ? true : undefined}>
                        <SelectValue placeholder="Choose" />
                      </SelectTrigger>
                      <SelectContent>
                        {cats?.categories.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </>
          )}
          <Field id="promo-area" label="Target area" error={errors.targetLocation} hint="Empty means the provider's city" optional>
            <Input {...fieldA11y("promo-area", errors.targetLocation, true)} maxLength={80} {...register("targetLocation")} />
          </Field>
          {!editing && (
            <Field id="promo-start" label="Starts" error={errors.startDate} required>
              <Input {...fieldA11y("promo-start", errors.startDate)} type="date" min={today()} {...register("startDate")} />
            </Field>
          )}
          <Field id="promo-end" label="Ends" error={errors.endDate} required>
            <Input {...fieldA11y("promo-end", errors.endDate)} type="date" min={today()} {...register("endDate")} />
          </Field>
          <Field id="promo-budget" label="Budget (Rs)" error={errors.budget} required>
            <Input {...fieldA11y("promo-budget", errors.budget)} inputMode="numeric" maxLength={7} {...register("budget")} />
          </Field>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />} {editing ? "Save changes" : "Start promotion"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

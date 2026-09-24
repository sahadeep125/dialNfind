import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, FolderTree, ListChecks, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState, PageSkeleton } from "@/components/common";
import { ConfirmDialog, StatusBadge } from "@/components/admin-ui";
import { Field, fieldA11y, FormAlert } from "@/components/form";
import { FileUpload } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Sub {
  id: number;
  name: string;
  slug: string;
  iconUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  _count: { providerServices: number };
}
interface Attr {
  id: number;
  subcategoryId: number | null;
  appliesTo: "lead" | "provider";
  label: string;
  fieldType: "text" | "number" | "select" | "multiselect" | "boolean";
  options: string[];
  isRequired: boolean;
  displayOrder: number;
}
interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  uiTemplate: string;
  displayOrder: number;
  isActive: boolean;
  providerCount: number;
  subcategories: Sub[];
  attributes: Attr[];
  _count: { providerServices: number; leads: number };
}

const TEMPLATES = [
  { value: "default", label: "Standard" },
  { value: "repair_appliance", label: "Repair and appliance" },
  { value: "tutor", label: "Tutors and classes" },
];
const FIELD_TYPES = [
  { value: "text", label: "Short text" },
  { value: "number", label: "Number" },
  { value: "select", label: "Pick one" },
  { value: "multiselect", label: "Pick several" },
  { value: "boolean", label: "Yes or no" },
];
const slugRule = z
  .string()
  .trim()
  .max(80)
  .refine((v) => v === "" || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v), "Use lowercase letters, numbers and hyphens, e.g. home-cleaning");

export function CategoriesPage() {
  const { data } = useQuery({ queryKey: ["admin-categories"], queryFn: () => api<{ categories: Category[] }>("/admin/categories") });
  const [open, setOpen] = useState<number | null>(null);
  const [editCat, setEditCat] = useState<Category | "new" | null>(null);

  return (
    <>
      <PageHeader
        title="Categories"
        description="Only the DialNFind team can create categories. Providers pick from these when they list their services."
        actions={
          <Button onClick={() => setEditCat("new")}>
            <Plus /> New category
          </Button>
        }
      />
      {!data ? (
        <PageSkeleton />
      ) : data.categories.length === 0 ? (
        <EmptyState icon={FolderTree} title="No categories yet" text="Create the first category so providers can list their services." />
      ) : (
        <div className="space-y-3">
          {data.categories.map((c) => (
            <CategoryCard key={c.id} category={c} expanded={open === c.id} onToggle={() => setOpen(open === c.id ? null : c.id)} onEdit={() => setEditCat(c)} />
          ))}
        </div>
      )}
      {editCat && <CategoryDialog category={editCat === "new" ? null : editCat} onClose={() => setEditCat(null)} />}
    </>
  );
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["admin-categories"] });
    void qc.invalidateQueries({ queryKey: ["categories"] });
  };
}

function CategoryCard({ category: c, expanded, onToggle, onEdit }: { category: Category; expanded: boolean; onToggle: () => void; onEdit: () => void }) {
  const [editSub, setEditSub] = useState<Sub | "new" | null>(null);
  const [editAttr, setEditAttr] = useState<Attr | "new" | null>(null);
  const [deleteAttr, setDeleteAttr] = useState<Attr | null>(null);
  const invalidate = useInvalidate();
  const removeAttr = useMutation({
    mutationFn: (id: number) => api(`/categories/attributes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Question deleted");
      setDeleteAttr(null);
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const subName = (id: number | null) => (id ? (c.subcategories.find((s) => s.id === id)?.name ?? "One service") : "Whole category");

  return (
    <div className={cn("overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)]", !c.isActive && "opacity-70")}>
      <div className="flex items-center gap-3 p-4">
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left" aria-expanded={expanded}>
          <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent text-primary">
            {c.iconUrl?.startsWith("http") ? <img src={c.iconUrl} alt="" className="size-full object-cover" /> : <FolderTree className="size-5" />}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2 font-semibold">
              {c.name} {!c.isActive && <StatusBadge status="closed" label="Hidden" />}
            </span>
            <span className="block text-xs text-muted-foreground">
              {c.subcategories.filter((s) => s.isActive).length} services, {c.providerCount} live providers, {c._count.leads.toLocaleString("en-IN")} leads
            </span>
          </span>
          <ChevronDown className={cn("ml-auto size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        </button>
        <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={`Edit ${c.name}`}>
          <Pencil />
        </Button>
      </div>
      {expanded && (
        <div className="grid gap-6 border-t bg-muted/30 p-4 lg:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Services</h3>
              <Button size="sm" variant="outline" onClick={() => setEditSub("new")}>
                <Plus /> Add service
              </Button>
            </div>
            <ul className="divide-y rounded-xl border bg-card">
              {c.subcategories.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  <span className={cn("flex-1", !s.isActive && "text-muted-foreground line-through")}>{s.name}</span>
                  <span className="text-xs text-muted-foreground">{s._count.providerServices} providers</span>
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditSub(s)} aria-label={`Edit ${s.name}`}>
                    <Pencil />
                  </Button>
                </li>
              ))}
              {!c.subcategories.length && <li className="px-3 py-6 text-center text-sm text-muted-foreground">No services yet.</li>}
            </ul>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Questions</h3>
              <Button size="sm" variant="outline" onClick={() => setEditAttr("new")}>
                <Plus /> Add question
              </Button>
            </div>
            <ul className="divide-y rounded-xl border bg-card">
              {c.attributes.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  <ListChecks className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {a.label}
                      {a.isRequired && <span className="text-destructive"> *</span>}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {a.appliesTo === "provider" ? "Asked to providers" : "Asked to customers"}, {FIELD_TYPES.find((f) => f.value === a.fieldType)?.label.toLowerCase()}, {subName(a.subcategoryId).toLowerCase()}
                    </span>
                  </span>
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditAttr(a)} aria-label={`Edit ${a.label}`}>
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => setDeleteAttr(a)} aria-label={`Delete ${a.label}`}>
                    <Trash2 />
                  </Button>
                </li>
              ))}
              {!c.attributes.length && <li className="px-3 py-6 text-center text-sm text-muted-foreground">No questions. Add ones like "Brands serviced" to enrich profiles.</li>}
            </ul>
          </div>
        </div>
      )}
      {editSub && <SubDialog categoryId={c.id} sub={editSub === "new" ? null : editSub} onClose={() => setEditSub(null)} />}
      {editAttr && <AttrDialog category={c} attr={editAttr === "new" ? null : editAttr} onClose={() => setEditAttr(null)} />}
      {deleteAttr && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setDeleteAttr(null)}
          title={`Delete "${deleteAttr.label}"?`}
          description="Every answer providers or customers gave to this question is deleted too. This cannot be undone."
          confirmLabel="Delete question"
          destructive
          busy={removeAttr.isPending}
          onConfirm={() => removeAttr.mutate(deleteAttr.id)}
        />
      )}
    </div>
  );
}

const categorySchema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters").max(60, "Keep it under 60 characters"),
  slug: slugRule,
  description: z.string().trim().max(300, "Keep it under 300 characters"),
  iconUrl: z.string(),
  uiTemplate: z.string(),
  displayOrder: z.string().refine((v) => /^\d{1,4}$/.test(v), "Use a whole number from 0 to 9999"),
  isActive: z.boolean(),
});
type CategoryValues = z.infer<typeof categorySchema>;

function CategoryDialog({ category, onClose }: { category: Category | null; onClose: () => void }) {
  const invalidate = useInvalidate();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { register, control, handleSubmit, formState } = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    mode: "onTouched",
    defaultValues: {
      name: category?.name ?? "",
      slug: category?.slug ?? "",
      description: category?.description ?? "",
      iconUrl: category?.iconUrl?.startsWith("http") ? category.iconUrl : "",
      uiTemplate: category?.uiTemplate ?? "default",
      displayOrder: String(category?.displayOrder ?? 0),
      isActive: category?.isActive ?? true,
    },
  });
  const { errors, isSubmitting } = formState;
  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    const json = { ...v, slug: v.slug || undefined, description: v.description || null, iconUrl: v.iconUrl || (category?.iconUrl?.startsWith("lucide:") ? undefined : null), displayOrder: Number(v.displayOrder) };
    try {
      if (category) await api(`/categories/${category.id}`, { method: "PATCH", json });
      else await api("/categories", { method: "POST", json });
      toast.success(category ? "Category saved" : "Category created");
      invalidate();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{category ? `Edit ${category.name}` : "New category"}</DialogTitle>
          <DialogDescription>Shown on the home page, in search and in the provider app.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
          {error && (
            <div className="sm:col-span-2">
              <FormAlert message={error} />
            </div>
          )}
          <Field id="cat-name" label="Name" error={errors.name} required>
            <Input {...fieldA11y("cat-name", errors.name)} maxLength={60} placeholder="e.g. Home Cleaning" {...register("name")} />
          </Field>
          <Field id="cat-slug" label="Web address" error={errors.slug} hint="Leave empty to build it from the name" optional>
            <Input {...fieldA11y("cat-slug", errors.slug, true)} maxLength={80} placeholder="home-cleaning" {...register("slug")} />
          </Field>
          <Field id="cat-desc" label="Description" error={errors.description} optional className="sm:col-span-2">
            <Textarea {...fieldA11y("cat-desc", errors.description)} rows={2} maxLength={300} {...register("description")} />
          </Field>
          <Field id="cat-icon" label="Icon" hint="Square image. Leave empty to use the built-in icon." optional className="sm:col-span-2">
            <Controller control={control} name="iconUrl" render={({ field }) => <FileUpload id="cat-icon" purpose="logo" value={field.value} onChange={field.onChange} previewClassName="size-16 rounded-xl" onUploadingChange={setUploading} />} />
          </Field>
          <Field id="cat-template" label="Page layout">
            <Controller
              control={control}
              name="uiTemplate"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="cat-template" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field id="cat-order" label="Display order" error={errors.displayOrder} hint="Lower numbers show first">
            <Input {...fieldA11y("cat-order", errors.displayOrder, true)} inputMode="numeric" maxLength={4} {...register("displayOrder")} />
          </Field>
          <label className="flex items-center justify-between gap-4 rounded-xl border p-3 sm:col-span-2">
            <span>
              <span className="block text-sm font-medium">Visible to customers</span>
              <span className="block text-xs text-muted-foreground">Hidden categories keep their providers but disappear from search.</span>
            </span>
            <Controller control={control} name="isActive" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
          </label>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || uploading}>
              {isSubmitting && <Loader2 className="animate-spin" />} {category ? "Save category" : "Create category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const subSchema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters").max(60, "Keep it under 60 characters"),
  slug: slugRule,
  displayOrder: z.string().refine((v) => /^\d{1,4}$/.test(v), "Use a whole number from 0 to 9999"),
  isActive: z.boolean(),
});
type SubValues = z.infer<typeof subSchema>;

function SubDialog({ categoryId, sub, onClose }: { categoryId: number; sub: Sub | null; onClose: () => void }) {
  const invalidate = useInvalidate();
  const [error, setError] = useState<string | null>(null);
  const { register, control, handleSubmit, formState } = useForm<SubValues>({
    resolver: zodResolver(subSchema),
    mode: "onTouched",
    defaultValues: { name: sub?.name ?? "", slug: sub?.slug ?? "", displayOrder: String(sub?.displayOrder ?? 0), isActive: sub?.isActive ?? true },
  });
  const { errors, isSubmitting } = formState;
  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    const json = { ...v, slug: v.slug || undefined, displayOrder: Number(v.displayOrder) };
    try {
      if (sub) await api(`/categories/subcategories/${sub.id}`, { method: "PATCH", json });
      else await api(`/categories/${categoryId}/subcategories`, { method: "POST", json });
      toast.success(sub ? "Service saved" : "Service added");
      invalidate();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{sub ? `Edit ${sub.name}` : "Add a service"}</DialogTitle>
          <DialogDescription>Providers tick the services they offer in this category.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
          {error && (
            <div className="sm:col-span-2">
              <FormAlert message={error} />
            </div>
          )}
          <Field id="sub-name" label="Name" error={errors.name} required className="sm:col-span-2">
            <Input {...fieldA11y("sub-name", errors.name)} maxLength={60} placeholder="e.g. Sofa cleaning" {...register("name")} />
          </Field>
          <Field id="sub-slug" label="Web address" error={errors.slug} optional>
            <Input {...fieldA11y("sub-slug", errors.slug)} maxLength={80} {...register("slug")} />
          </Field>
          <Field id="sub-order" label="Display order" error={errors.displayOrder}>
            <Input {...fieldA11y("sub-order", errors.displayOrder)} inputMode="numeric" maxLength={4} {...register("displayOrder")} />
          </Field>
          <label className="flex items-center justify-between gap-4 rounded-xl border p-3 sm:col-span-2">
            <span className="text-sm font-medium">Visible to customers</span>
            <Controller control={control} name="isActive" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
          </label>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />} Save service
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const attrSchema = z
  .object({
    label: z.string().trim().min(2, "Enter at least 2 characters").max(60, "Keep it under 60 characters"),
    appliesTo: z.enum(["provider", "lead"]),
    fieldType: z.enum(["text", "number", "select", "multiselect", "boolean"]),
    subcategoryId: z.string(),
    options: z.string(),
    isRequired: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.fieldType !== "select" && v.fieldType !== "multiselect") return;
    const opts = v.options.split("\n").map((o) => o.trim()).filter(Boolean);
    if (opts.length < 2) ctx.addIssue({ code: "custom", path: ["options"], message: "Add at least 2 options, one per line" });
    else if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length) ctx.addIssue({ code: "custom", path: ["options"], message: "Each option must be different" });
    else if (opts.some((o) => o.length > 60)) ctx.addIssue({ code: "custom", path: ["options"], message: "Keep each option under 60 characters" });
  });
type AttrValues = z.infer<typeof attrSchema>;

function AttrDialog({ category, attr, onClose }: { category: Category; attr: Attr | null; onClose: () => void }) {
  const invalidate = useInvalidate();
  const [error, setError] = useState<string | null>(null);
  const { register, control, handleSubmit, watch, formState } = useForm<AttrValues>({
    resolver: zodResolver(attrSchema),
    mode: "onTouched",
    defaultValues: {
      label: attr?.label ?? "",
      appliesTo: attr?.appliesTo ?? "provider",
      fieldType: attr?.fieldType ?? "text",
      subcategoryId: attr?.subcategoryId ? String(attr.subcategoryId) : "all",
      options: attr?.options.join("\n") ?? "",
      isRequired: attr?.isRequired ?? false,
    },
  });
  const { errors, isSubmitting } = formState;
  const type = watch("fieldType");
  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    const json = {
      label: v.label,
      appliesTo: v.appliesTo,
      fieldType: v.fieldType,
      subcategoryId: v.subcategoryId === "all" ? null : Number(v.subcategoryId),
      options: v.fieldType === "select" || v.fieldType === "multiselect" ? v.options.split("\n").map((o) => o.trim()).filter(Boolean) : [],
      isRequired: v.isRequired,
    };
    try {
      if (attr) await api(`/categories/attributes/${attr.id}`, { method: "PATCH", json });
      else await api(`/categories/${category.id}/attributes`, { method: "POST", json });
      toast.success(attr ? "Question saved" : "Question added");
      invalidate();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{attr ? "Edit question" : `Add a question to ${category.name}`}</DialogTitle>
          <DialogDescription>Provider questions show on their public profile. Customer questions are asked when they send an enquiry.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
          {error && (
            <div className="sm:col-span-2">
              <FormAlert message={error} />
            </div>
          )}
          <Field id="attr-label" label="Question" error={errors.label} required className="sm:col-span-2">
            <Input {...fieldA11y("attr-label", errors.label)} maxLength={60} placeholder="e.g. Brands serviced" {...register("label")} />
          </Field>
          <Field id="attr-applies" label="Asked to">
            <Controller
              control={control}
              name="appliesTo"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="attr-applies" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="provider">Providers</SelectItem>
                    <SelectItem value="lead">Customers</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field id="attr-type" label="Answer type">
            <Controller
              control={control}
              name="fieldType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="attr-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field id="attr-sub" label="Applies to" className="sm:col-span-2">
            <Controller
              control={control}
              name="subcategoryId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="attr-sub" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Every service in {category.name}</SelectItem>
                    {category.subcategories.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        Only {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          {(type === "select" || type === "multiselect") && (
            <Field id="attr-options" label="Options" error={errors.options} hint="One option per line" required className="sm:col-span-2">
              <Textarea {...fieldA11y("attr-options", errors.options, true)} rows={5} placeholder={"Samsung\nLG\nSony"} {...register("options")} />
            </Field>
          )}
          <label className="flex items-center justify-between gap-4 rounded-xl border p-3 sm:col-span-2">
            <span className="text-sm font-medium">Answer required</span>
            <Controller control={control} name="isRequired" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
          </label>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />} Save question
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

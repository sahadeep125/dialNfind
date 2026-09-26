"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { clientApi } from "@/lib/client";

export function DeleteReviewButton({ id, providerName }: { id: number; providerName: string }) {
  const router = useRouter();
  async function remove() {
    try {
      await clientApi(`/reviews/${id}`, { method: "DELETE" });
      toast.success("Review deleted");
      router.refresh();
    } catch {
      toast.error("Could not delete the review");
    }
  }
  return (
    <ConfirmDialog
      title="Delete this review?"
      description={`Your review of ${providerName} will be removed. This cannot be undone.`}
      confirmLabel="Delete review"
      onConfirm={remove}
      trigger={
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" aria-label={`Delete your review of ${providerName}`}>
          <Trash2 /> Delete
        </Button>
      }
    />
  );
}

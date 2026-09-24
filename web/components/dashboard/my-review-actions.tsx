"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { clientApi } from "@/lib/client";

export function DeleteReviewButton({ id }: { id: number }) {
  const router = useRouter();
  async function remove() {
    if (!confirm("Delete this review? This cannot be undone.")) return;
    try {
      await clientApi(`/reviews/${id}`, { method: "DELETE" });
      toast.success("Review deleted");
      router.refresh();
    } catch {
      toast.error("Could not delete the review");
    }
  }
  return (
    <Button variant="ghost" size="sm" onClick={remove} className="text-muted-foreground hover:text-destructive">
      <Trash2 /> Delete
    </Button>
  );
}

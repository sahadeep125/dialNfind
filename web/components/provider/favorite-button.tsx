"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { clientApi, ClientApiError } from "@/lib/client";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  providerId,
  initial,
  className,
  withLabel = false,
}: {
  providerId: number;
  initial: boolean;
  className?: string;
  withLabel?: boolean;
}) {
  const [saved, setSaved] = useState(initial);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      try {
        await clientApi(`/me/favorites/${providerId}`, { method: next ? "PUT" : "DELETE" });
        toast.success(next ? "Saved to favorites" : "Removed from favorites");
        router.refresh();
      } catch (err) {
        setSaved(!next);
        if (err instanceof ClientApiError && err.status === 401) {
          toast("Log in to save favorites", { action: { label: "Log in", onClick: () => router.push(`/login?next=${encodeURIComponent(pathname)}`) } });
        } else {
          toast.error("Could not update favorites");
        }
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "Remove from favorites" : "Save to favorites"}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border bg-card text-sm font-medium transition-colors hover:bg-muted disabled:opacity-70",
        withLabel ? "h-10 px-4" : "size-9",
        className,
      )}
    >
      <Heart className={cn("size-4 transition-colors", saved ? "fill-[oklch(0.63_0.2_15)] text-[oklch(0.63_0.2_15)]" : "text-muted-foreground")} />
      {withLabel && (saved ? "Saved" : "Save")}
    </button>
  );
}

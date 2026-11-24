"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BackButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
      className={cn("-ml-2 gap-1.5 text-muted-foreground hover:text-foreground", className)}
    >
      <ArrowLeft className="size-4" /> Back
    </Button>
  );
}

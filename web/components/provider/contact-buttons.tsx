"use client";

import { useState } from "react";
import { Copy, MessageCircle, Phone, PhoneCall } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatPhone, telHref, whatsappHref } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ContactProvider {
  id: number;
  businessName: string;
  phone: string;
  whatsappNumber: string | null;
  acceptsCalls: boolean;
  acceptsWhatsapp: boolean;
}

function recordLead(providerId: number, channel: "call" | "whatsapp", source: string, categorySlug?: string) {
  // keepalive lets the request finish even as the browser switches to the dialer.
  void fetch("/api/proxy/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ providerId, channel, source, categorySlug }),
    keepalive: true,
  }).catch(() => undefined);
}

const isTouch = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

export function ContactButtons({
  provider,
  source = "search",
  categorySlug,
  size = "default",
  layout = "row",
  variant = "default",
  className,
}: {
  provider: ContactProvider;
  source?: "search" | "category_browse" | "profile";
  categorySlug?: string;
  size?: "default" | "sm" | "lg";
  layout?: "row" | "stack";
  /** "profile" is the large green call-to-action on the provider page; "outline" suits small cards. */
  variant?: "default" | "profile" | "outline";
  className?: string;
}) {
  const profile = variant === "profile";
  const [showNumber, setShowNumber] = useState(false);

  function call() {
    recordLead(provider.id, "call", source, categorySlug);
    if (isTouch()) window.location.href = telHref(provider.phone);
    else setShowNumber(true);
  }

  function whatsapp() {
    recordLead(provider.id, "whatsapp", source, categorySlug);
    if (!provider.whatsappNumber) return;
    window.open(whatsappHref(provider.whatsappNumber, `Hi ${provider.businessName}, I found you on DialNFind and need help with a service.`), "_blank", "noopener");
  }

  return (
    <>
      <div className={cn("flex gap-2", layout === "stack" ? "flex-col" : "flex-row", className)}>
        {provider.acceptsCalls && (
          <Button
            size={size}
            variant={profile ? "success" : variant === "outline" ? "outline" : "default"}
            onClick={call}
            className={cn(
              layout === "row" && "flex-1",
              profile && "text-base",
              variant === "outline" && "border-primary/50 text-primary shadow-none hover:bg-primary/5 hover:text-primary",
            )}
          >
            <Phone className={cn(profile && "size-5")} fill="currentColor" strokeWidth={0} />
            {profile ? "Call Now" : "Call"}
          </Button>
        )}
        {provider.acceptsWhatsapp && provider.whatsappNumber && (
          <Button
            size={size}
            variant="outline"
            onClick={whatsapp}
            className={cn(
              "border-[oklch(0.72_0.14_150)] text-[oklch(0.42_0.12_150)] shadow-none hover:bg-[oklch(0.97_0.03_150)] hover:text-[oklch(0.38_0.12_150)]",
              layout === "row" && "flex-1",
              profile && "text-base",
            )}
          >
            <MessageCircle className={cn("text-[oklch(0.62_0.17_150)]", profile && "size-5")} />
            {profile ? "Chat on WhatsApp" : "WhatsApp"}
          </Button>
        )}
      </div>
      <Dialog open={showNumber} onOpenChange={setShowNumber}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Call {provider.businessName}</DialogTitle>
            <DialogDescription>Mention DialNFind when you call so they know how you found them.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 rounded-xl bg-accent p-4">
            <span className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <PhoneCall className="size-5" />
            </span>
            <a href={telHref(provider.phone)} className="font-display text-2xl font-bold tracking-tight text-brand-deep">
              {formatPhone(provider.phone)}
            </a>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(provider.phone);
                toast.success("Number copied");
              }}
            >
              <Copy /> Copy number
            </Button>
            <Button asChild>
              <a href={telHref(provider.phone)}>
                <Phone /> Call
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

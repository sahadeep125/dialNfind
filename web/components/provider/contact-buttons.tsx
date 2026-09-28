"use client";

import { useState } from "react";
import { Copy, MessageCircle, Phone, PhoneCall } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatPhone, telHref, whatsappHref } from "@/lib/format";
import { track } from "@/lib/analytics";
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
  track("contact_clicked", { provider_id: providerId, channel, source, category: categorySlug });
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
  /** "profile" is the large call-to-action on the provider page; "outline" is the quieter style for grids of tiles. */
  variant?: "default" | "profile" | "outline";
  className?: string;
}) {
  const profile = variant === "profile";
  const [showNumber, setShowNumber] = useState(false);

  function call() {
    recordLead(provider.id, "call", source, categorySlug);
    if (isTouch()) window.location.href = telHref(provider.phone);
    else {
      setShowNumber(true);
      track("phone_number_revealed", { provider_id: provider.id, source });
    }
  }

  // Free listings have no WhatsApp number, so the button only shows when there is one to open.
  const whatsappNumber = provider.acceptsWhatsapp ? provider.whatsappNumber : null;

  function whatsapp(number: string) {
    recordLead(provider.id, "whatsapp", source, categorySlug);
    window.open(whatsappHref(number, `Hi ${provider.businessName}, I found you on DialNFind and need help with a service.`), "_blank", "noopener");
  }

  return (
    <>
      <div className={cn("flex gap-2", layout === "stack" ? "flex-col" : "flex-row", className)}>
        {provider.acceptsCalls && (
          <Button
            size={size}
            variant={variant === "outline" ? "outline" : "cta"}
            onClick={call}
            className={cn(
              layout === "row" && "flex-1",
              profile && "text-base",
              variant === "outline" && "text-primary hover:border-primary/40 hover:bg-accent",
            )}
          >
            <Phone className={cn(profile && "size-5")} fill="currentColor" strokeWidth={0} />
            {profile ? "Call Now" : "Call"}
          </Button>
        )}
        {whatsappNumber && (
          <Button
            size={size}
            variant="outline"
            onClick={() => whatsapp(whatsappNumber)}
            className={cn(
              "border-[oklch(0.8_0.1_150)] text-[oklch(0.4_0.11_150)] hover:border-[oklch(0.7_0.13_150)] hover:bg-[oklch(0.97_0.03_150)]",
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
          <div className="flex items-center gap-3 rounded-lg bg-accent p-4">
            <span className="flex size-11 items-center justify-center rounded-full bg-cta text-cta-foreground">
              <PhoneCall className="size-5" />
            </span>
            <a href={telHref(provider.phone)} className="font-display text-2xl font-bold tracking-tight text-primary">
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
            <Button asChild variant="cta">
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

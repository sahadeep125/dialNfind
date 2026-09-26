import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "flex flex-col gap-4 md:flex-row md:items-end md:justify-between"}>
      <div className={align === "center" ? "" : "max-w-2xl"}>
        <span className="text-sm font-semibold uppercase tracking-wider text-primary">{eyebrow}</span>
        <h2 className="mt-2 text-3xl font-bold text-brand-deep md:text-4xl">{title}</h2>
        {description && <p className="mt-3 text-muted-foreground">{description}</p>}
      </div>
      {action && (
        <Button asChild variant="outline" className="shrink-0">
          <Link href={action.href}>
            {action.label} <ArrowRight />
          </Link>
        </Button>
      )}
    </div>
  );
}

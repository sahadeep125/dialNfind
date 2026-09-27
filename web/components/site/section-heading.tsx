import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "left",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  action?: { href: string; label: string };
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "flex items-end justify-between gap-4"}>
      <div className={align === "center" ? "" : "min-w-0 max-w-2xl"}>
        {eyebrow && <span className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</span>}
        <h2 className={eyebrow ? "mt-1.5 text-2xl font-bold text-foreground md:text-[1.75rem]" : "text-2xl font-bold text-foreground md:text-[1.75rem]"}>{title}</h2>
        {description && <p className="mt-1.5 text-[15px] text-muted-foreground">{description}</p>}
      </div>
      {action && (
        <Link href={action.href} className="inline-flex shrink-0 items-center gap-1 pb-1 text-sm font-semibold text-primary hover:underline">
          {action.label} <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  as: Tag = "h2",
  id,
}: {
  id?: string;
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: { href: string; label: string };
  align?: "left" | "center";
  as?: "h1" | "h2";
}) {
  const centered = align === "center";
  return (
    <div className={centered ? "mx-auto max-w-2xl text-center" : "flex flex-wrap items-end justify-between gap-x-6 gap-y-3"}>
      <div className={centered ? "" : "min-w-0 max-w-2xl"}>
        {eyebrow && <p className="mb-2 text-sm font-medium text-muted-foreground">{eyebrow}</p>}
        <Tag id={id} className="text-[1.75rem] font-bold leading-[1.05] tracking-[-0.03em] text-foreground md:text-[2.5rem]">{title}</Tag>
        {description && <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted-foreground md:text-[17px]">{description}</p>}
      </div>
      {action && (
        <Link href={action.href} className="group inline-flex min-h-11 shrink-0 items-center gap-1.5 text-[15px] font-semibold text-primary">
          <span className="link-draw">{action.label}</span> <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

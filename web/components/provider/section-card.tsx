import { cn } from "@/lib/utils";

/** A section of the profile's main column, separated by a rule rather than boxed. */
export function ProfileSection({
  title,
  eyebrow,
  id,
  action,
  className,
  children,
}: {
  title?: string;
  /** A short line over the title that says why the section is here. */
  eyebrow?: string;
  id?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn("scroll-mt-32 border-t py-9", className)}>
      {title && (
        <div className="mb-6 flex items-end justify-between gap-4">
          <div className="min-w-0">
            {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-cta-strong">{eyebrow}</p>}
            <h2 className="text-[1.375rem] font-bold leading-tight tracking-[-0.02em] md:text-2xl">{title}</h2>
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** A bordered card in the profile sidebar. */
export function SideCard({ title, id, action, className, children }: { title: string; id?: string; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={cn("scroll-mt-32 rounded-lg border bg-card p-5", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="truncate text-base font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

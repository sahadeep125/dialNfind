import { cn } from "@/lib/utils";

/** A section of the profile's main column, separated by a rule rather than boxed. */
export function ProfileSection({ title, id, action, className, children }: { title?: string; id?: string; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={cn("scroll-mt-32 border-t py-8", className)}>
      {title && (
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold">{title}</h2>
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

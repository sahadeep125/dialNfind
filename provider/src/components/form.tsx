import { AlertCircle } from "lucide-react";
import type { FieldError } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/**
 * Label, control, and either a hint or the validation message, wired for screen readers:
 * the control gets aria-invalid and aria-describedby through `fieldA11y`.
 */
export function Field({
  id,
  label,
  error,
  hint,
  required,
  optional,
  className,
  children,
}: {
  id: string;
  label: React.ReactNode;
  error?: FieldError | string;
  hint?: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const message = typeof error === "string" ? error : error?.message;
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className={cn(message && "text-destructive")}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        )}
        {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
      </Label>
      {children}
      {message ? (
        <p id={`${id}-error`} role="alert" className="flex items-center gap-1.5 text-xs font-medium text-destructive">
          <AlertCircle className="size-3.5 shrink-0" /> {message}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Props that link a control to its Field message. */
export function fieldA11y(id: string, error?: FieldError | string, hasHint = false) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hasHint ? `${id}-hint` : undefined,
  };
}

/** Error returned by the server for the whole form. */
export function FormAlert({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" /> {message}
    </div>
  );
}

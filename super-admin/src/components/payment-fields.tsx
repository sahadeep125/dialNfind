import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface PaymentValue {
  paid: boolean;
  amount: string;
  reference: string;
}

export const emptyPayment = (amount = ""): PaymentValue => ({ paid: false, amount, reference: "" });

/** Checks the payment fields; returns an error message or null. */
export function paymentProblem(p: PaymentValue): string | null {
  if (!p.paid) return null;
  if (!(Number(p.amount) > 0)) return "Enter the amount received";
  if (p.reference.trim().length < 3) return "Enter the UPI or bank reference";
  return null;
}

/** The API body for an offline payment, or undefined when nothing was paid (a free grant). */
export const paymentBody = (p: PaymentValue) => (p.paid ? { amount: Number(p.amount), reference: p.reference.trim() } : undefined);

/** "The provider paid" with amount and reference; recorded as a payment on Plans and billing. */
export function PaymentFields({ id, value, onChange, error }: { id: string; value: PaymentValue; onChange: (v: PaymentValue) => void; error?: string | null }) {
  return (
    <div className="space-y-3 rounded-xl border p-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
        <Checkbox checked={value.paid} onCheckedChange={(c) => onChange({ ...value, paid: c === true })} /> The provider paid for this
      </label>
      {value.paid && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-amount`}>Amount received (Rs)</Label>
            <Input id={`${id}-amount`} inputMode="decimal" value={value.amount} onChange={(e) => onChange({ ...value, amount: e.target.value.replace(/[^\d.]/g, "") })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-ref`}>UPI or bank reference</Label>
            <Input id={`${id}-ref`} value={value.reference} maxLength={80} onChange={(e) => onChange({ ...value, reference: e.target.value })} />
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
      {!value.paid && <p className="text-xs text-muted-foreground">Leave unticked for a free grant, for example a launch offer.</p>}
    </div>
  );
}

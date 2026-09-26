import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Asks why something is being reported (a lead or a review) and sends it. The parent owns the request
 * so each caller can say what happens next; `error` is the server's answer when it fails.
 */
export function ReportDialog({
  open,
  title,
  description,
  label,
  sending,
  error,
  onSend,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  label: string;
  sending: boolean;
  error: string | null;
  onSend: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const message = problem ?? error;
  const close = () => {
    setReason("");
    setProblem(null);
    onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          id="report-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (reason.trim().length < 10) return setProblem("Tell us what was wrong, at least 10 characters");
            onSend(reason.trim());
          }}
          className="space-y-2"
        >
          <Label htmlFor="report-reason">{label}</Label>
          <Textarea
            id="report-reason"
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(e) => (setReason(e.target.value), setProblem(null))}
            aria-invalid={!!message || undefined}
            aria-describedby={message ? "report-reason-error" : undefined}
          />
          {message && (
            <p id="report-reason-error" role="alert" className="text-xs font-medium text-destructive">
              {message}
            </p>
          )}
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="report-form" disabled={sending}>
            {sending && <Loader2 className="animate-spin" />} Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useId, useRef, useState } from "react";
import { FileText, ImagePlus, Loader2, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { checkFile, UPLOAD_RULES, uploadFile, type UploadPurpose } from "@/lib/upload";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface FileUploadProps {
  value: string;
  onChange: (url: string) => void;
  purpose: UploadPurpose;
  /** Tailwind classes for the preview box, e.g. "aspect-video" or "size-24 rounded-full". */
  previewClassName?: string;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}

/**
 * Drag-and-drop or click-to-browse upload. The file is checked in the browser, uploaded to
 * /uploads, and the returned URL is handed to the form, which stores it like any other field.
 */
export function FileUpload({ value, onChange, purpose, previewClassName = "aspect-video", id, invalid, describedBy, disabled, onUploadingChange }: FileUploadProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const rule = UPLOAD_RULES[purpose];
  const isDocument = purpose === "document";
  const uploading = progress !== null;
  const isPdf = /\.pdf($|\?)/i.test(value);

  async function handle(file: File | undefined) {
    if (!file) return;
    const problem = checkFile(file, purpose);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setProgress(0);
    onUploadingChange?.(true);
    try {
      onChange(await uploadFile(file, purpose, setProgress));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setProgress(null);
      onUploadingChange?.(false);
      if (input.current) input.current.value = "";
    }
  }

  const accept = rule.types.join(",");
  const typesLabel = isDocument ? "JPG, PNG, WebP or PDF" : "JPG, PNG or WebP";
  const browse = () => input.current?.click();

  return (
    <div>
      <input
        ref={input}
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled || uploading}
        aria-invalid={invalid || !!error || undefined}
        aria-describedby={[describedBy, error ? `${inputId}-upload-error` : null].filter(Boolean).join(" ") || undefined}
        onChange={(e) => handle(e.target.files?.[0])}
      />

      {value && !uploading ? (
        <div className={cn("flex flex-col items-start gap-3", previewClassName.includes("size-") && "sm:flex-row sm:items-center")}>
          {isDocument && (isPdf || !value) ? (
            <a href={value} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3 text-sm hover:bg-muted">
              <FileText className="size-8 text-primary" />
              <span className="font-medium">Document uploaded</span>
            </a>
          ) : (
            <img src={value} alt="Uploaded preview" className={cn("rounded-xl border bg-muted object-cover", previewClassName, "w-auto max-w-full", previewClassName.includes("size-") ? "" : "max-h-48")} />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={browse} disabled={disabled}>
              <RefreshCw /> Replace
            </Button>
            <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => onChange("")} disabled={disabled}>
              <Trash2 /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={`Upload ${isDocument ? "a document" : "an image"}`}
          onClick={() => !uploading && browse()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), browse())}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!uploading && !disabled) void handle(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center outline-none transition-colors",
            "focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/30",
            dragging ? "border-primary bg-accent" : "hover:border-primary/50 hover:bg-muted/50",
            (invalid || error) && "border-destructive/60",
            disabled && "pointer-events-none opacity-60",
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-sm font-medium">Uploading {progress}%</span>
              <Progress value={progress} className="h-1.5 w-40" />
            </>
          ) : (
            <>
              <span className="flex size-10 items-center justify-center rounded-full bg-accent text-primary">
                {isDocument ? <UploadCloud className="size-5" /> : <ImagePlus className="size-5" />}
              </span>
              <span className="text-sm">
                <span className="font-semibold text-primary">Click to upload</span> or drag and drop
              </span>
              <span className="text-xs text-muted-foreground">
                {typesLabel}, up to {rule.maxMb} MB
              </span>
            </>
          )}
        </div>
      )}
      {error && (
        <p id={`${inputId}-upload-error`} role="alert" className="mt-2 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

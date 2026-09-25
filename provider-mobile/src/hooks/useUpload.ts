import { useCallback, useState } from "react";

import { errorMessage } from "@/services/api";
import { pickDocument, pickImage, uploadFile } from "@/services/upload";
import type { UploadPurpose } from "@/types";
import { useToast } from "./useToast";

interface UploadState {
  /** 0 to 100 while a file is uploading, otherwise null. */
  progress: number | null;
  /** Lets the person choose a file, uploads it, and resolves to its URL (null if they cancelled or it failed). */
  choose: (source?: "library" | "camera") => Promise<string | null>;
}

/** Pick and upload one image or document. Failures show a toast. */
export function useUpload(purpose: UploadPurpose): UploadState {
  const toast = useToast();
  const [progress, setProgress] = useState<number | null>(null);

  const choose = useCallback(
    async (source: "library" | "camera" = "library"): Promise<string | null> => {
      try {
        const file =
          purpose === "document" && source === "library"
            ? await pickDocument()
            : await pickImage(purpose, source);
        if (!file) return null;
        setProgress(0);
        return await uploadFile(file, purpose, setProgress);
      } catch (error: unknown) {
        toast(errorMessage(error), "error");
        return null;
      } finally {
        setProgress(null);
      }
    },
    [purpose, toast],
  );

  return { progress, choose };
}

import { useUIStore } from "@/stores/useUIStore";
import type { ToastTone } from "@/types";

export function useToast(): (message: string, tone?: ToastTone) => void {
  return useUIStore((s) => s.pushToast);
}

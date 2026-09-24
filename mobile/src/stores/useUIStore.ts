import { create } from "zustand";

import type { Toast, ToastTone } from "@/types";

interface UIState {
  toasts: Toast[];
  pushToast: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: number) => void;
}

const TOAST_DURATION_MS = 3200;
let nextId = 1;

export const useUIStore = create<UIState>((set, get) => ({
  toasts: [],
  pushToast: (message: string, tone: ToastTone = "info") => {
    const id = nextId++;
    // Keep at most two on screen so a burst of errors does not cover the app.
    set({ toasts: [...get().toasts.slice(-1), { id, message, tone }] });
    setTimeout(() => get().dismissToast(id), TOAST_DURATION_MS);
  },
  dismissToast: (id: number) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

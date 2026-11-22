import { create } from 'zustand';

const AUTO_DISMISS_MS = 4000;
let nextId = 1;

export const useToastStore = create((set, get) => ({
  toasts: [],
  push: (message, tone = 'info') => {
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts.slice(-3), { id, message: String(message), tone }] }));
    setTimeout(() => get().dismiss(id), AUTO_DISMISS_MS);
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

const ERROR_HINT = /fail|error|permission|cannot|can't|not allowed|please enter|invalid/i;

// Drop-in replacement for window.alert: non-blocking, announced to screen readers.
export const notify = (message, tone) =>
  useToastStore.getState().push(message, tone ?? (ERROR_HINT.test(String(message)) ? 'error' : 'success'));

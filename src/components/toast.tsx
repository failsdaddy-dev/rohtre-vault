"use client";

import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from "react";

interface Toast {
  id: number;
  text: string;
}

const ToastContext = createContext<(text: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const show = useCallback((text: string) => {
    const id = nextId.current++;
    setToasts((t) => [...t.slice(-2), { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext value={value}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed bottom-6 left-6 z-[60] flex flex-col gap-2 max-sm:left-4 max-sm:right-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="vh-toast-in rounded-lg bg-chip-on-bg px-4 py-3 text-sm text-chip-on-fg shadow-lg"
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

export function useToast() {
  return use(ToastContext);
}

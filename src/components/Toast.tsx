"use client";

import { useEffect, useState } from "react";

export interface ToastMessage {
  id: string;
  text: string;
}

// Global toast state — components dispatch via window events
export function dispatchToast(text: string) {
  window.dispatchEvent(
    new CustomEvent("show-toast", { detail: { text } })
  );
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    function handleToast(e: Event) {
      const { text } = (e as CustomEvent).detail;
      const id = Date.now().toString(36);
      setToasts((prev) => [...prev, { id, text }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    }
    window.addEventListener("show-toast", handleToast);
    return () => window.removeEventListener("show-toast", handleToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="animate-fade-in px-4 py-3 rounded-lg border border-[var(--border-active)]
                     bg-[var(--bg-card)] shadow-lg text-[13px] font-medium text-[var(--text-primary)] max-w-sm"
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
}

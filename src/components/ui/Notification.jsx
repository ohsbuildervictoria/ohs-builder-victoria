/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useRef } from "react";

// ---------------------------------------------------------------------------
// Toast system (used for mock exports, emails, sign-offs, etc.)
// ---------------------------------------------------------------------------
const ToastContext = createContext(null);

const TOAST_STYLES = {
  success: "bg-green-600",
  error: "bg-red-600",
  info: "bg-blue-900",
  warning: "bg-amber-500 text-blue-950",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const addToast = useCallback((message, type = "success") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
              TOAST_STYLES[t.type] || TOAST_STYLES.info
            }`}
          >
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// In-app notification row (used in the notifications dropdown / panel)
// ---------------------------------------------------------------------------
const DOT = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-500",
  low: "bg-slate-400",
};

export function NotificationItem({ notification, onRead }) {
  const { severity, title, message, read } = notification;
  return (
    <button
      onClick={() => onRead?.(notification.id)}
      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
        read ? "opacity-60" : ""
      }`}
    >
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[severity] || DOT.low}`} />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-800">{title}</span>
        <span className="block truncate text-xs text-slate-500">{message}</span>
      </span>
    </button>
  );
}

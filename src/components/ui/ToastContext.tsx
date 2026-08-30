"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, title: string, message?: string, duration = 4000) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, type, title, message, duration };
      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toast = {
    success: (title: string, message?: string) => addToast("success", title, message),
    error: (title: string, message?: string) => addToast("error", title, message, 5000),
    info: (title: string, message?: string) => addToast("info", title, message),
    warning: (title: string, message?: string) => addToast("warning", title, message),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast Render Container */}
      <div
        aria-live="assertive"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => {
          const config = {
            success: {
              border: "border-emerald-500",
              bg: "bg-white",
              text: "text-emerald-900",
              icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
              badge: "bg-emerald-50 text-emerald-700",
            },
            error: {
              border: "border-rose-500",
              bg: "bg-white",
              text: "text-rose-900",
              icon: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />,
              badge: "bg-rose-50 text-rose-700",
            },
            warning: {
              border: "border-amber-500",
              bg: "bg-white",
              text: "text-amber-900",
              icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
              badge: "bg-amber-50 text-amber-700",
            },
            info: {
              border: "border-indigo-500",
              bg: "bg-white",
              text: "text-slate-900",
              icon: <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />,
              badge: "bg-indigo-50 text-indigo-700",
            },
          }[t.type];

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flat-card border-l-4 ${config.border} p-3.5 shadow-xl transition-all animate-in slide-in-from-bottom-3 duration-200 flex items-start gap-3 bg-white`}
              role="alert"
            >
              {config.icon}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-900 tracking-tight">
                  {t.title}
                </div>
                {t.message && (
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed break-words">
                    {t.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="p-1 -mr-1 -mt-1 text-slate-400 hover:text-slate-700 transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context.toast;
}

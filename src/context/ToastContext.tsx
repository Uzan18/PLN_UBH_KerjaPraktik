'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastItem = { id, message, type };

    setToasts((prev) => [...prev.slice(-4), newToast]); // Keep max 5 toasts

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const success = useCallback((msg: string) => showToast(msg, 'success'), [showToast]);
  const error = useCallback((msg: string) => showToast(msg, 'error'), [showToast]);
  const warning = useCallback((msg: string) => showToast(msg, 'warning'), [showToast]);
  const info = useCallback((msg: string) => showToast(msg, 'info'), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => {
          const bgColors = {
            success: 'bg-white border-l-4 border-l-status-good border-surface-border text-on-surface shadow-xl',
            error: 'bg-white border-l-4 border-l-status-bad border-surface-border text-on-surface shadow-xl',
            warning: 'bg-white border-l-4 border-l-status-fair border-surface-border text-on-surface shadow-xl',
            info: 'bg-white border-l-4 border-l-primary border-surface-border text-on-surface shadow-xl',
          };

          const iconNames = {
            success: 'check_circle',
            error: 'error',
            warning: 'warning',
            info: 'info',
          };

          const iconColors = {
            success: 'text-status-good',
            error: 'text-status-bad',
            warning: 'text-status-fair',
            info: 'text-primary',
          };

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start justify-between gap-3 p-3.5 rounded-xl border transition-all transform animate-fade-in ${bgColors[toast.type]}`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className={`material-symbols-outlined text-xl shrink-0 mt-0.5 ${iconColors[toast.type]}`}>
                  {iconNames[toast.type]}
                </span>
                <p className="text-xs font-semibold leading-relaxed break-words">
                  {toast.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-outline hover:text-on-surface p-0.5 rounded-md hover:bg-surface-container-low transition-all cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-base">close</span>
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
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

import React, { useEffect, useState } from 'react';
import { APP_TOAST_EVENT, type ToastEventDetail, type ToastTone } from '../notifications/events';

type ToastItem = ToastEventDetail & {
  id: string;
  tone: ToastTone;
};

const TOAST_TTL_MS = 3600;

function toneStyles(tone: ToastTone) {
  switch (tone) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    case 'error':
      return 'border-rose-200 bg-rose-50 text-rose-900';
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    default:
      return 'border-sky-200 bg-sky-50 text-sky-900';
  }
}

export default function ToastViewport() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToast = (event: Event) => {
      const customEvent = event as CustomEvent<ToastEventDetail>;
      const detail = customEvent.detail;

      if (!detail?.message) {
        return;
      }

      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      setToasts((current) => [
        ...current.slice(-2),
        {
          id,
          tone: detail.tone || 'info',
          message: detail.message,
          title: detail.title,
        },
      ]);

      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, TOAST_TTL_MS);
    };

    window.addEventListener(APP_TOAST_EVENT, handleToast as EventListener);

    return () => window.removeEventListener(APP_TOAST_EVENT, handleToast as EventListener);
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-3 p-2 sm:right-6 sm:top-6">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className={`pointer-events-auto rounded-2xl border p-4 shadow-xl shadow-slate-900/10 backdrop-blur ${toneStyles(
            toast.tone,
          )}`}
        >
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined mt-0.5 text-[20px]">
              {toast.tone === 'success'
                ? 'task_alt'
                : toast.tone === 'error'
                  ? 'error'
                  : toast.tone === 'warning'
                    ? 'warning'
                    : 'info'}
            </span>
            <div className="min-w-0 flex-1">
              {toast.title ? <p className="text-sm font-semibold">{toast.title}</p> : null}
              <p className="text-sm leading-6">{toast.message}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

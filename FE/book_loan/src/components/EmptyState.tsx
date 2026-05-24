import React from 'react';

type EmptyStateProps = {
  icon?: string;
  title: string;
  message?: string;
  action?: React.ReactNode;
};

export default function EmptyState({ icon = 'info', title, message, action }: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center rounded-xl border border-surface-container bg-surface-container-low px-6 py-10 text-center text-sm text-on-surface-variant"
    >
      <span aria-hidden="true" className="material-symbols-outlined mb-3 text-4xl text-outline">
        {icon}
      </span>
      <p className="font-bold text-on-surface">{title}</p>
      {message ? <p className="mt-1 max-w-md">{message}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

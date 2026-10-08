import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: string;
  /** Optional bold heading rendered above `message` (e.g. "No notifications found"). Omit for the plain single-line form. */
  title?: string;
  message: string;
  children?: ReactNode;
}

/** Shared "nothing here" block using theme tokens. */
export function EmptyState({ icon = 'inbox', title, message, children }: EmptyStateProps) {
  return (
    <div className="p-8 rounded-xl border border-border bg-surface-container text-center flex flex-col items-center gap-2 animate-fade-in">
      <span className="material-symbols-outlined text-3xl text-on-surface-variant">{icon}</span>
      {title && (
        <p className="text-base font-bold text-on-surface font-['Space_Grotesk']">{title}</p>
      )}
      <p className="text-sm text-on-surface-variant">{message}</p>
      {children}
    </div>
  );
}


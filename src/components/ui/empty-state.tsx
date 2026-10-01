import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: string;
  /** Optional bold heading rendered above `message` (e.g. "No notifications found"). Omit for the plain single-line form. */
  title?: string;
  message: string;
  children?: ReactNode;
}

/** Shared "nothing here" block, replacing repeated inline empty-state text divs. `children`, if given, renders below the message (e.g. a call-to-action link). */
export function EmptyState({ icon = 'inbox', title, message, children }: EmptyStateProps) {
  return (
    <div className="p-8 rounded-xl border border-[#262a33] bg-[#181c24] text-center flex flex-col items-center gap-2 animate-fade-in">
      <span className="material-symbols-outlined text-3xl text-[#87948b]">{icon}</span>
      {title && (
        <p className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">{title}</p>
      )}
      <p className="text-sm text-[#87948b]">{message}</p>
      {children}
    </div>
  );
}

import type { ReactNode } from 'react';

export type AlertTone = 'error' | 'success' | 'info' | 'warning';

interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
  className?: string;
}

// Mirrors Toast's TONE_CONFIG (see toast.tsx) so an inline alert and a toast
// of the same tone read as the same visual language.
const TONE_CLASSES: Record<AlertTone, { border: string; bg: string; text: string; icon: string }> =
  {
    error: {
      border: 'border-[#f43f5e]/40',
      bg: 'bg-[#4c0519]/40',
      text: 'text-[#fda4af]',
      icon: 'error',
    },
    success: {
      border: 'border-[#25a475]/40',
      bg: 'bg-[#003825]/40',
      text: 'text-[#68dba9]',
      icon: 'check_circle',
    },
    info: {
      border: 'border-[#0284c7]/40',
      bg: 'bg-[#0c4a6e]/40',
      text: 'text-[#38bdf8]',
      icon: 'info',
    },
    warning: {
      border: 'border-[#d97706]/40',
      bg: 'bg-[#451a03]/40',
      text: 'text-[#fcd34d]',
      icon: 'warning',
    },
  };

/**
 * Shared inline alert/banner, replacing the one-off red `<div>` each page
 * previously restyled for its own error/success messaging — see Phase 86 UX
 * audit. Use for persistent, page-level messages; prefer the `Toast` system
 * (toast.tsx) for transient, action-confirmation messages.
 */
export function Alert({ tone = 'info', title, children, className = '' }: AlertProps) {
  const config = TONE_CLASSES[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-xl border ${config.border} ${config.bg} p-3.5 flex items-start gap-3 text-sm ${className}`}
    >
      <span
        className={`material-symbols-outlined text-lg shrink-0 ${config.text}`}
        aria-hidden="true"
      >
        {config.icon}
      </span>
      <div className="min-w-0">
        {title && (
          <p className={`font-bold text-xs uppercase tracking-wider mb-0.5 ${config.text}`}>
            {title}
          </p>
        )}
        <div className="text-[#dfe2ee] text-xs leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

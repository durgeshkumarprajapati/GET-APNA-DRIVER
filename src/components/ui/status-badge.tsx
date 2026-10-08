export type StatusBadgeTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

interface StatusBadgeProps {
  label: string;
  tone: StatusBadgeTone;
  className?: string;
}

const TONE_CLASSES: Record<StatusBadgeTone, string> = {
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  danger: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
  neutral: 'bg-surface-container-high text-on-surface-variant border-border',
  info: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30',
};

/**
 * Shared status pill, replacing the private per-page statusBadgeClass()
 * helpers previously duplicated in admin/drivers and elsewhere.
 */
export function StatusBadge({ label, tone, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${TONE_CLASSES[tone]} ${className}`}
    >
      {label}
    </span>
  );
}

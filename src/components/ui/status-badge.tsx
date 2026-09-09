export type StatusBadgeTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

interface StatusBadgeProps {
  label: string;
  tone: StatusBadgeTone;
  className?: string;
}

const TONE_CLASSES: Record<StatusBadgeTone, string> = {
  success: 'bg-[#00311f] text-[#68dba9] border-[#25a475]',
  warning: 'bg-[#3a2e00] text-[#f5c542] border-[#8a6d00]',
  danger: 'bg-[#93000a]/20 text-[#ffb4ab] border-[#93000a]/50',
  neutral: 'bg-[#262a33] text-[#bccac0] border-[#3d4a42]',
  info: 'bg-[#0a1f3a] text-[#b4c5ff] border-[#2a4a8a]',
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

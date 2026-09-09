import type { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: ReactNode;
  accent?: 'default' | 'positive' | 'negative';
  hint?: string;
}

const ACCENT_CLASSES: Record<NonNullable<MetricCardProps['accent']>, string> = {
  default: 'text-[#dfe2ee]',
  positive: 'text-[#68dba9]',
  negative: 'text-[#ffb4ab]',
};

/**
 * Shared metric display card, replacing the ad hoc value-card divs
 * previously duplicated per dashboard (driver dashboard, admin dashboard,
 * performance-and-badges, etc.).
 */
export function MetricCard({ label, value, accent = 'default', hint }: MetricCardProps) {
  return (
    <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col gap-1">
      <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
        {label}
      </span>
      <span className={`text-2xl font-bold font-['Space_Grotesk'] ${ACCENT_CLASSES[accent]}`}>
        {value}
      </span>
      {hint && <span className="text-[10px] text-[#87948b]">{hint}</span>}
    </div>
  );
}

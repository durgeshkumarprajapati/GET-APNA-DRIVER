import type { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: ReactNode;
  accent?: 'default' | 'positive' | 'negative';
  hint?: string;
}

const ACCENT_CLASSES: Record<NonNullable<MetricCardProps['accent']>, string> = {
  default: 'text-on-surface',
  positive: 'text-primary',
  negative: 'text-red-500',
};

/**
 * Shared metric display card using theme tokens.
 */
export function MetricCard({ label, value, accent = 'default', hint }: MetricCardProps) {
  return (
    <div className="p-4 rounded-xl bg-surface-container border border-border flex flex-col gap-1 animate-fade-in-up">
      <span className="text-[10px] font-bold text-on-surface-variant uppercase font-['Space_Grotesk']">
        {label}
      </span>
      <span className={`text-2xl font-bold font-['Space_Grotesk'] ${ACCENT_CLASSES[accent]}`}>
        {value}
      </span>
      {hint && <span className="text-[10px] text-on-surface-variant">{hint}</span>}
    </div>
  );
}


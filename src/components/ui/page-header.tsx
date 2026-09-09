import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

/**
 * Shared eyebrow+title+subtitle header block. Replaces the identical markup
 * previously hand-rolled independently on nearly every admin/driver page
 * (e.g. driver/ratings-and-reviews, driver/performance-and-badges,
 * admin/drivers).
 */
export function PageHeader({ eyebrow, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between p-6 rounded-xl bg-[#181c24] border border-[#262a33] flex-wrap gap-4">
      <div>
        <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk'] block">
          {eyebrow}
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
          {title}
        </h1>
        {subtitle && <p className="text-xs text-[#bccac0] mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

import type { LabelHTMLAttributes } from 'react';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

/**
 * Shared form label, matching the pre-existing dominant convention
 * (`text-xs font-bold uppercase tracking-wider text-[#87948b]`) so
 * standardizing on this component doesn't change how existing forms look.
 */
export function Label({ required, className = '', children, ...rest }: LabelProps) {
  return (
    <label
      className={`text-xs font-bold uppercase tracking-wider text-[#87948b] font-['Space_Grotesk'] ${className}`}
      {...rest}
    >
      {children}
      {required && (
        <span className="text-[#f43f5e] ml-0.5" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

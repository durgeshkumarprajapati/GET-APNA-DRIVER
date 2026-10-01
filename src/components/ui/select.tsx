import { forwardRef, type SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

/**
 * Shared select field, visually matching `Input` (see input.tsx) so a form
 * mixing text fields and dropdowns looks consistent rather than each control
 * carrying its own hand-rolled styling.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid, className = '', children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={`w-full min-h-[44px] bg-[#0a0e16] border text-[#dfe2ee] text-xs p-3 rounded-lg focus:outline-none focus:ring-1 transition-colors ${
        invalid
          ? 'border-[#f43f5e] focus:ring-[#f43f5e]'
          : 'border-[#262a33] focus:ring-[#68dba9] focus:border-[#68dba9]'
      } ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
});

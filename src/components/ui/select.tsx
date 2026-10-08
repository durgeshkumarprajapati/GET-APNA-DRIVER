import { forwardRef, type SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

/**
 * Shared select field using theme tokens.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid, className = '', children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={`w-full min-h-[44px] bg-surface-container-lowest border text-on-surface text-xs p-3 rounded-lg focus:outline-none focus:ring-1 transition-colors ${
        invalid
          ? 'border-red-500 focus:ring-red-500'
          : 'border-border focus:ring-primary focus:border-primary'
      } ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
});


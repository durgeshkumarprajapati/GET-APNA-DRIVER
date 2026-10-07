import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

const BASE_FIELD_CLASSES =
  'w-full min-h-[44px] bg-[#0a0e16] border text-[#dfe2ee] text-xs p-3 rounded-lg placeholder:text-[#87948b] focus:outline-none focus:ring-1 transition-colors';

function fieldBorderClasses(invalid?: boolean) {
  return invalid
    ? 'border-[#f43f5e] focus:ring-[#f43f5e]'
    : 'border-[#262a33] focus:ring-[#68dba9] focus:border-[#68dba9]';
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Marks the field as failing validation — red border/focus ring instead of the default mint accent. Pair with `aria-invalid` (set automatically) and a `FormField` error message. */
  invalid?: boolean;
}

/**
 * Shared text input, matching the pre-existing dominant convention (dark
 * `#0a0e16` field on `#262a33` border, mint focus ring) already used across
 * customer/admin forms — see Phase 86 UX audit. Standardizing on this
 * component (instead of each page hand-rolling the same classes) is what
 * keeps future styling changes a one-file edit.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className = '', ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={`${BASE_FIELD_CLASSES} ${fieldBorderClasses(invalid)} ${className}`}
      {...rest}
    />
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className = '', ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={`${BASE_FIELD_CLASSES} resize-none ${fieldBorderClasses(invalid)} ${className}`}
      {...rest}
    />
  );
});

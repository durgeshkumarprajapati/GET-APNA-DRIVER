import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

const BASE_FIELD_CLASSES =
  'w-full min-h-[44px] bg-surface-container-lowest border text-on-surface text-xs p-3 rounded-lg placeholder:text-on-surface-variant focus:outline-none focus:ring-1 transition-colors';

function fieldBorderClasses(invalid?: boolean) {
  return invalid
    ? 'border-red-500 focus:ring-red-500'
    : 'border-border focus:ring-primary focus:border-primary';
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

/**
 * Shared text input using theme tokens.
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


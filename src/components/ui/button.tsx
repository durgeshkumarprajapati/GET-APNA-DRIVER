import { forwardRef, type ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  /** material-symbols-outlined glyph name, rendered before the label. */
  leftIcon?: string;
  /** material-symbols-outlined glyph name, rendered after the label. */
  rightIcon?: string;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:opacity-90',
  secondary: 'bg-surface-container border border-border text-on-surface hover:bg-surface-container-high',
  outline: 'bg-transparent border border-border text-on-surface hover:border-primary/60',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
};

// min-height matches each size's visible padding/line-height so every
// variant clears the ~40-44px comfortable mobile tap target by default.
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-[40px] px-3 text-xs gap-1.5',
  md: 'min-h-[44px] px-4 text-sm gap-2',
  lg: 'min-h-[48px] px-5 text-sm gap-2',
};

/**
 * Shared button primitive using theme tokens.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    disabled,
    className = '',
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <span className="material-symbols-outlined animate-spin text-base" aria-hidden="true">
          progress_activity
        </span>
      ) : (
        leftIcon && (
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            {leftIcon}
          </span>
        )
      )}
      {children}
      {!isLoading && rightIcon && (
        <span className="material-symbols-outlined text-base" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </button>
  );
});


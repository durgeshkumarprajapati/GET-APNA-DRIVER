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
  primary: 'bg-[#25a475] text-[#042116] hover:bg-[#68dba9]',
  secondary: 'bg-[#181c24] border border-[#262a33] text-[#bccac0] hover:bg-[#262a33]',
  outline: 'bg-transparent border border-[#262a33] text-[#dfe2ee] hover:border-[#68dba9]/60',
  danger: 'bg-[#f43f5e] text-white hover:bg-[#e11d48]',
  ghost: 'bg-transparent text-[#bccac0] hover:bg-[#181c24]',
};

// min-height matches each size's visible padding/line-height so every
// variant clears the ~40-44px comfortable mobile tap target by default.
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-[40px] px-3 text-xs gap-1.5',
  md: 'min-h-[44px] px-4 text-sm gap-2',
  lg: 'min-h-[48px] px-5 text-sm gap-2',
};

/**
 * Shared button primitive. Replaces hand-rolled `<button className="...">`
 * markup that previously diverged across customer/driver/admin pages — see
 * Phase 86 UX audit. Visual variants match the pre-existing dominant
 * conventions (e.g. the `bg-[#25a475]`/`text-[#042116]` primary pattern
 * already used across admin approve/submit actions) rather than inventing a
 * new look.
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

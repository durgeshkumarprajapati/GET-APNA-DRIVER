import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * Shared panel primitive using theme tokens.
 */
export function Card({ className = '', children, ...rest }: CardProps) {
  return (
    <div
      className={`bg-surface-container border border-border rounded-xl p-4 sm:p-5 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className = '',
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <h2 className={`text-sm font-bold text-on-surface font-['Space_Grotesk'] ${className}`}>
      {children}
    </h2>
  );
}


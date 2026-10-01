import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * Shared panel primitive matching the dominant `bg-[#181c24] border
 * border-[#262a33] rounded-xl` convention already used for cards/sections
 * across customer/driver/admin pages — see Phase 86 UX audit.
 */
export function Card({ className = '', children, ...rest }: CardProps) {
  return (
    <div
      className={`bg-[#181c24] border border-[#262a33] rounded-xl p-4 sm:p-5 ${className}`}
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
    <h2 className={`text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk'] ${className}`}>
      {children}
    </h2>
  );
}

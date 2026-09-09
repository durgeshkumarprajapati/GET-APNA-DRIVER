'use client';

interface RatingStarsProps {
  /** 0-5, may be fractional for display (e.g. 4.5 average). */
  value: number;
  size?: 'sm' | 'md' | 'lg';
  /** When provided, stars become clickable and call back with 1-5. */
  onChange?: (rating: number) => void;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<RatingStarsProps['size']>, string> = {
  sm: 'text-sm',
  md: 'text-xl',
  lg: 'text-3xl',
};

/**
 * Shared star-rating display/input. Replaces the raw "★" unicode characters
 * previously hardcoded inline across admin/driver pages (live-fleet-radar,
 * treasury-and-settlements, ratings-and-reviews) with one reusable component.
 */
export function RatingStars({ value, size = 'md', onChange, className = '' }: RatingStarsProps) {
  const isInteractive = typeof onChange === 'function';
  const stars = [1, 2, 3, 4, 5];

  return (
    <span className={`inline-flex items-center gap-0.5 ${SIZE_CLASSES[size]} ${className}`}>
      {stars.map((star) => {
        const filled = star <= Math.round(value);
        const Tag = isInteractive ? 'button' : 'span';
        return (
          <Tag
            key={star}
            type={isInteractive ? 'button' : undefined}
            onClick={isInteractive ? () => onChange(star) : undefined}
            aria-label={isInteractive ? `Rate ${star} out of 5` : undefined}
            className={`${filled ? 'text-amber-400' : 'text-[#3d4a42]'} ${
              isInteractive ? 'cursor-pointer hover:scale-110 transition-transform' : ''
            }`}
          >
            ★
          </Tag>
        );
      })}
    </span>
  );
}

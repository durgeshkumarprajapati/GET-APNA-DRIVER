import { RatingStars } from './rating-stars';

export interface RatingDistributionInput {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

interface RatingSummaryProps {
  averageRating: number;
  totalReviews: number;
  distribution: RatingDistributionInput;
}

/**
 * Shared average-rating + distribution-bar block. Used by the driver
 * reviews page, the driver portfolio, and the admin review directory so the
 * rating breakdown is rendered identically everywhere it appears.
 */
export function RatingSummary({ averageRating, totalReviews, distribution }: RatingSummaryProps) {
  const maxCount = Math.max(1, ...Object.values(distribution));

  return (
    <div className="p-5 rounded-xl bg-surface-container border border-border flex flex-col sm:flex-row gap-6">
      <div className="flex flex-col items-center justify-center gap-1 shrink-0 sm:border-r sm:border-border sm:pr-6">
        <span className="text-4xl font-bold text-on-surface font-['Space_Grotesk']">
          {averageRating.toFixed(2)}
        </span>
        <RatingStars value={averageRating} size="sm" />
        <span className="text-[10px] text-on-surface-variant">{totalReviews} reviews</span>
      </div>
      <div className="flex-1 flex flex-col gap-1.5 justify-center">
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const count = distribution[star];
          const widthPct = (count / maxCount) * 100;
          return (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-3 text-on-surface-variant font-mono">{star}</span>
              <div className="flex-1 h-2 rounded-full bg-surface-container-high overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <span className="w-8 text-right text-on-surface-variant font-mono">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

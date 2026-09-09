'use client';

import { useEffect, useState } from 'react';
import { DriverLayout } from '@/components/driver-layout';
import { PageHeader } from '@/components/ui/page-header';
import { RatingStars } from '@/components/ui/rating-stars';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/shared/formatting/date';

interface PortfolioReview {
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewerLabel: string;
}

interface Portfolio {
  displayName: string;
  bio: string | null;
  drivingExperienceYears: number;
  primaryServiceArea: string | null;
  approvalStatus: string;
  memberSince: string;
  performance: {
    averageRating: number;
    totalReviews: number;
    completedTrips: number;
  };
  recentReviews: PortfolioReview[];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export default function DriverPublicPortfolioPage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/driver/portfolio');
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          setPortfolio(data.portfolio);
        } else {
          setError('Failed to load portfolio.');
        }
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load portfolio.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <DriverLayout>
      <div className="flex flex-col w-full px-6 py-6 gap-6">
        <PageHeader
          eyebrow="Public Chauffeur Dossier"
          title="Public Portfolio"
          subtitle="This is what customers see about you — built entirely from your real profile and trip history."
        />

        {error && (
          <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingState message="Loading portfolio…" />
        ) : (
          portfolio && (
            <>
              <div className="p-6 rounded-xl bg-[#181c24] border border-[#262a33] space-y-4 max-w-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-[#25a475]/20 border border-[#68dba9] flex items-center justify-center text-[#68dba9] font-bold text-xl">
                    {initials(portfolio.displayName)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[#dfe2ee] font-['Space_Grotesk']">
                      {portfolio.displayName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <RatingStars value={portfolio.performance.averageRating} size="sm" />
                      <span className="font-mono text-xs text-[#68dba9]">
                        {portfolio.performance.averageRating.toFixed(2)} •{' '}
                        {portfolio.performance.completedTrips} Trips •{' '}
                        {portfolio.drivingExperienceYears} Years Driving Experience
                      </span>
                    </div>
                  </div>
                </div>
                {portfolio.bio && <p className="text-xs text-[#bccac0]">{portfolio.bio}</p>}
                <div className="flex items-center gap-4 text-[10px] font-mono text-[#87948b] uppercase tracking-wider">
                  {portfolio.primaryServiceArea && <span>{portfolio.primaryServiceArea}</span>}
                  <span>Driving since {formatDate(portfolio.memberSince)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h2 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  What Customers Say
                </h2>
                {portfolio.recentReviews.length === 0 ? (
                  <EmptyState icon="reviews" message="No written reviews yet." />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {portfolio.recentReviews.map((review, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <RatingStars value={review.rating} size="sm" />
                          <span className="text-[10px] font-mono text-[#87948b]">
                            {formatDate(review.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-[#bccac0] italic">
                          &quot;{review.comment}&quot;
                        </p>
                        <span className="text-[10px] text-[#87948b]">— {review.reviewerLabel}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )
        )}
      </div>
    </DriverLayout>
  );
}

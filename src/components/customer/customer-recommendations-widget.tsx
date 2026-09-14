'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/i18n/context';
import { type RecommendationDTO } from '@/modules/recommendations/domain/recommendation-types';

export function CustomerRecommendationsWidget() {
  const { t } = useTranslation();
  const [recommendations, setRecommendations] = useState<RecommendationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const res = await fetch('/api/customer/recommendations?limit=5');
        if (!res.ok) {
          throw new Error('Failed to load recommendations');
        }
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setRecommendations(json.data);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error fetching recommendations');
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, []);

  if (loading) {
    return (
      <div className="bg-[#1b221d] border border-[#2d3931] rounded-xl p-5 animate-pulse">
        <div className="h-5 w-48 bg-[#2d3931] rounded mb-3" />
        <div className="h-4 w-72 bg-[#2d3931] rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-28 bg-[#262f29] rounded-lg" />
          <div className="h-28 bg-[#262f29] rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || recommendations.length === 0) {
    return null; // Graceful fallback if no recommendations available
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'USUAL_ROUTE':
        return 'route';
      case 'RECENT_RIDE':
      case 'BOOK_AGAIN':
        return 'history';
      case 'FAVORITE_DRIVER':
        return 'star';
      case 'SAVED_PLACE':
        return 'place';
      case 'UPCOMING_SCHEDULED_RIDE':
        return 'event';
      case 'VEHICLE_PREFERENCE':
        return 'directions_car';
      case 'LOYALTY_REWARD':
      case 'LOYALTY_PROGRESS':
        return 'card_membership';
      case 'PROMOTION':
        return 'local_offer';
      default:
        return 'auto_awesome';
    }
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'BOOK_NOW':
        return t('customer.recommendations.actions.bookNow');
      case 'BOOK_AGAIN':
        return t('customer.recommendations.actions.bookAgain');
      case 'SCHEDULE_RIDE':
        return t('customer.recommendations.actions.scheduleRide');
      case 'VIEW_DRIVER':
        return t('customer.recommendations.actions.viewDriver');
      case 'VIEW_REWARD':
        return t('customer.recommendations.actions.viewReward');
      case 'VIEW_PROMOTION':
        return t('customer.recommendations.actions.viewPromotion');
      case 'VIEW_SCHEDULED_RIDE':
        return t('customer.recommendations.actions.viewScheduledRide');
      case 'VIEW_LOYALTY':
        return t('customer.recommendations.actions.viewLoyalty');
      default:
        return t('customer.recommendations.actions.bookNow');
    }
  };

  return (
    <section className="bg-gradient-to-r from-[#17221b] via-[#1b2720] to-[#17221b] border border-[#2d3931] rounded-2xl p-6 shadow-xl mb-8">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#68dba9]/10 border border-[#68dba9]/30 flex items-center justify-center text-[#68dba9]">
            <span className="material-symbols-outlined text-2xl">auto_awesome</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#e1e3df]">
              {t('customer.recommendations.sectionTitle')}
            </h2>
            <p className="text-sm text-[#a3ada5]">
              {t('customer.recommendations.sectionSubtitle')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map((rec) => {
          const icon = getIcon(rec.type);
          const title = t(rec.titleKey);
          const explanation = t(rec.explanationKey, rec.explanationArgs);
          const actionLabel = getActionLabel(rec.action.type);

          return (
            <div
              key={rec.id}
              className="bg-[#202b23] hover:bg-[#253229] border border-[#313f35] hover:border-[#68dba9]/40 transition-all rounded-xl p-4 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#68dba9] text-xl">
                      {icon}
                    </span>
                    <h3 className="font-semibold text-[#e1e3df] text-base group-hover:text-[#68dba9] transition-colors">
                      {title}
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#68dba9]/10 text-[#68dba9] border border-[#68dba9]/20 uppercase">
                    {rec.priority}
                  </span>
                </div>

                <p className="text-xs text-[#c1c9c3] mb-3 line-clamp-2">{explanation}</p>
              </div>

              <div className="mt-2 pt-3 border-t border-[#2a372e] flex items-center justify-between">
                <span className="text-[11px] text-[#89948b] flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">info</span>
                  {t('customer.recommendations.whyRecommended')}
                </span>

                <Link
                  href={rec.action.href}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#68dba9] hover:text-[#88e2bc] bg-[#68dba9]/10 hover:bg-[#68dba9]/20 px-3 py-1.5 rounded-lg border border-[#68dba9]/30 transition-all"
                >
                  <span>{actionLabel}</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

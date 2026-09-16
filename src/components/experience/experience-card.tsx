'use client';

import React from 'react';
import Link from 'next/link';
import type { ExperienceRecommendation } from '@/modules/experience/domain/experience-types';

interface ExperienceCardProps {
  recommendation: ExperienceRecommendation;
  onDismiss?: (recommendation: ExperienceRecommendation) => void;
  onAction?: (recommendation: ExperienceRecommendation) => void;
}

const TYPE_ICONS: Record<string, string> = {
  BOOK_AGAIN: 'history',
  FAVORITE_DRIVER: 'star',
  SAVED_PLACE: 'location_on',
  SCHEDULED_RIDE: 'event',
  LOYALTY_PROGRESS: 'trending_up',
  LOYALTY_REWARD: 'workspace_premium',
  PROMOTION: 'local_offer',
  REFERRAL: 'group_add',
  ACTIVE_TRIP: 'directions_car',
  TRIP_ACTION: 'near_me',
  DRIVER_INCENTIVE: 'monetization_on',
  DRIVER_GOAL: 'flag',
  SUPPORT: 'support_agent',
  RELIABILITY: 'warning',
  SAFETY: 'shield',
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  SAFETY: 'bg-rose-950/90 text-rose-300 border-rose-800',
  RELIABILITY: 'bg-amber-950/90 text-amber-300 border-amber-800',
  ACTIVE_TRIP: 'bg-emerald-950/90 text-emerald-300 border-emerald-800',
  BOOK_AGAIN: 'bg-indigo-950/90 text-indigo-300 border-indigo-800',
  FAVORITE_DRIVER: 'bg-amber-950/90 text-amber-300 border-amber-800',
  PROMOTION: 'bg-emerald-950/90 text-emerald-300 border-emerald-800',
  LOYALTY_REWARD: 'bg-purple-950/90 text-purple-300 border-purple-800',
  DRIVER_INCENTIVE: 'bg-emerald-950/90 text-emerald-300 border-emerald-800',
};

export function ExperienceCard({ recommendation, onDismiss, onAction }: ExperienceCardProps) {
  const icon = TYPE_ICONS[recommendation.type] || 'auto_awesome';
  const badgeClass =
    TYPE_BADGE_COLORS[recommendation.type] || 'bg-[#181c24] text-[#68dba9] border-[#262a33]';

  const handleActionClick = (_e: React.MouseEvent) => {
    if (onAction) {
      onAction(recommendation);
    }
  };

  return (
    <div className="group relative rounded-xl bg-[#181c24] border border-[#262a33] p-3.5 sm:p-4 shadow-lg hover:border-[#3d4a42] transition-all flex flex-col justify-between space-y-3">
      {/* Card Header & Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#0a0e16] border border-[#262a33] flex items-center justify-center text-[#68dba9] shrink-0">
            <span className="material-symbols-outlined text-lg">{icon}</span>
          </div>
          <div className="min-w-0">
            <span
              className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider border ${badgeClass} inline-block truncate`}
            >
              {recommendation.type.replace('_', ' ')}
            </span>
            <h4 className="font-bold text-xs sm:text-sm text-[#dfe2ee] font-['Space_Grotesk'] leading-tight truncate mt-0.5">
              {recommendation.title}
            </h4>
          </div>
        </div>

        {/* Dismiss Button (If non-mandatory and dismissable) */}
        {recommendation.isDismissable && !recommendation.isMandatory && onDismiss && (
          <button
            type="button"
            onClick={() => onDismiss(recommendation)}
            aria-label="Dismiss experience recommendation"
            className="w-7 h-7 rounded-lg hover:bg-[#262a33] text-[#87948b] hover:text-[#dfe2ee] flex items-center justify-center transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        )}
      </div>

      {/* Description & Reason */}
      <div className="space-y-1 text-xs">
        <p className="text-[#bccac0] text-[11px] leading-relaxed line-clamp-2">
          {recommendation.description}
        </p>
        <span className="text-[9.5px] font-mono text-[#87948b] flex items-center gap-1">
          <span className="material-symbols-outlined text-[11px]">info</span>
          {recommendation.reason}
        </span>
      </div>

      {/* Action CTA */}
      <div className="pt-2 border-t border-[#262a33] flex items-center justify-between">
        <Link
          href={recommendation.action.targetUrl || '#'}
          onClick={handleActionClick}
          className="w-full sm:w-auto min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#25a475] hover:bg-[#208f66] text-[#00311f] font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md"
        >
          <span>
            {recommendation.type === 'BOOK_AGAIN'
              ? 'Book Again'
              : recommendation.type === 'FAVORITE_DRIVER'
                ? 'Select Driver'
                : recommendation.type === 'SCHEDULED_RIDE'
                  ? 'View Schedule'
                  : recommendation.type === 'LOYALTY_REWARD'
                    ? 'Redeem Reward'
                    : recommendation.type === 'PROMOTION'
                      ? 'Claim Offer'
                      : recommendation.type === 'REFERRAL'
                        ? 'Share Code'
                        : recommendation.action.type === 'GO_ONLINE'
                          ? 'Go Online Now'
                          : 'Open Action'}
          </span>
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
}

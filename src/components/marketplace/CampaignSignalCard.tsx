'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CampaignSignalCardDTO } from '@/modules/marketplace-intelligence/domain/campaign-signals-service';

export interface CampaignSignalCardProps {
  signal: CampaignSignalCardDTO;
  labels?: {
    redemptions?: string;
    conversions?: string;
    rewards?: string;
    viewDetails?: string;
  };
}

export function CampaignSignalCard({ signal, labels }: CampaignSignalCardProps) {
  const [imgSrc, setImgSrc] = useState(signal.primaryImage);

  const handleImageError = () => {
    if (imgSrc !== signal.secondaryImage) {
      setImgSrc(signal.secondaryImage);
    }
  };

  const getCategoryIcon = () => {
    switch (signal.category) {
      case 'PROMOTION':
        return 'sell';
      case 'REFERRAL':
        return 'card_giftcard';
      case 'REWARD':
        return 'military_tech';
      case 'SCRATCH':
        return 'auto_awesome';
      default:
        return 'sell';
    }
  };

  const getCategoryBadgeClass = () => {
    switch (signal.category) {
      case 'PROMOTION':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'REFERRAL':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'REWARD':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'SCRATCH':
        return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all flex flex-col h-full shadow-lg group">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-slate-800/80 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl text-emerald-400">
              {getCategoryIcon()}
            </span>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100 line-clamp-1">{signal.title}</h4>
            <span className="text-xs text-slate-400 font-mono">{signal.codeOrType}</span>
          </div>
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getCategoryBadgeClass()}`}
        >
          {signal.category}
        </span>
      </div>

      {/* Image Container */}
      <div className="relative w-full h-40 bg-slate-950/60 p-3 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10 opacity-60" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={signal.imageAlt || signal.title}
          onError={handleImageError}
          className="max-h-full max-w-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform duration-300 z-0"
          loading="lazy"
        />
      </div>

      {/* Body & Metrics */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2.5 bg-slate-800/40 rounded-lg border border-slate-800">
            <span className="text-xs text-slate-400 block解消 font-medium">Redemptions</span>
            <span className="text-lg font-bold text-slate-100 font-mono">
              {signal.metrics.totalRedemptions}
            </span>
          </div>
          <div className="p-2.5 bg-slate-800/40 rounded-lg border border-slate-800">
            <span className="text-xs text-slate-400 block font-medium">Conversions</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">
              {signal.metrics.qualifiedUsers}
            </span>
          </div>
        </div>

        {/* Trend Indicator */}
        <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-500/5 px-3 py-2 rounded-lg border border-emerald-500/10">
          <span className="material-symbols-outlined text-base">trending_up</span>
          <span className="truncate">
            {signal.metrics.trendLabel} ({signal.metrics.observedTrendPercent > 0 ? `+${signal.metrics.observedTrendPercent}%` : 'Stable'})
          </span>
        </div>

        {/* Action Link */}
        <Link
          href="/admin/marketplace-intelligence/campaigns"
          className="mt-2 inline-flex items-center justify-between w-full text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 px-3 py-2 rounded-lg transition-colors border border-slate-700/50"
        >
          <span>{labels?.viewDetails || 'View Campaign Intelligence'}</span>
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
}

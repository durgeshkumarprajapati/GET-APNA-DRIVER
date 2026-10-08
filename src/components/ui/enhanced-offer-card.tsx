'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { EnhancedOfferItem } from '@/modules/promotion/domain/offers-catalog';

interface EnhancedOfferCardProps {
  offer: EnhancedOfferItem;
}

export function EnhancedOfferCard({ offer }: EnhancedOfferCardProps) {
  const [copied, setCopied] = useState(false);
  const [tcOpen, setTcOpen] = useState(false);

  const handleCopyCode = (code: string) => {
    void navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl bg-surface-container border border-border overflow-hidden flex flex-col justify-between shadow-sm hover:border-primary/40 transition-all group">
      {/* Image Header with Badge Overlay */}
      <div className="relative h-28 w-full bg-surface-container-high overflow-hidden">
        <Image
          src={offer.image}
          alt={offer.name}
          fill
          className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
            offer.isLocked ? 'filter brightness-75 contrast-90 grayscale-[30%]' : ''
          }`}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority
        />
        {/* Dark Gradient Overlay for Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-surface-container/30 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 z-10">
          <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider bg-surface-container-high/80 text-primary border border-border backdrop-blur-md">
            {offer.category.replace('_', ' ')}
          </span>

          {offer.isLocked ? (
            <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider bg-error-container text-on-error-container border border-error/30 backdrop-blur-md flex items-center gap-0.5 shadow-md">
              <span className="material-symbols-outlined text-[9px]">lock</span>
              LOCKED
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30 backdrop-blur-md flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[9px]">verified</span>
              UNLOCKED
            </span>
          )}
        </div>

        {/* Discount Tag Overlay at Bottom Left */}
        <div className="absolute bottom-1.5 left-2 z-10">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-primary text-on-primary shadow-md inline-block">
            {offer.discountValue}
          </span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
        <div className="space-y-0.5">
          <h3 className="font-bold text-xs sm:text-sm text-on-surface font-['Space_Grotesk'] leading-tight group-hover:text-primary transition-colors">
            {offer.name}
          </h3>
          <p className="text-[10px] font-semibold text-primary">{offer.tagline}</p>
          <p className="text-[10px] text-on-surface-variant leading-snug line-clamp-2">
            {offer.description}
          </p>
        </div>

        {/* Lock Unlock Requirement Progress Bar */}
        {offer.isLocked && (
          <div className="p-2 rounded-lg bg-surface-container-high border border-border space-y-1">
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-error font-semibold flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[10px]">lock_clock</span>
                Unlock Condition
              </span>
              <span className="font-mono text-on-surface font-bold">{offer.unlockRequirement}</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden border border-border">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full transition-all duration-500"
                style={{ width: `${Math.min(offer.unlockProgressPercent, 100)}%` }}
              />
            </div>
            <p className="text-[8.5px] text-on-surface-variant font-mono leading-tight">
              {offer.lockReason}
            </p>
          </div>
        )}

        {/* Action Controls & Promo Code Box */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-border">
          {offer.code ? (
            <div className="flex items-center gap-1">
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-container-high text-primary border border-border">
                {offer.code}
              </span>
              <button
                type="button"
                onClick={() => handleCopyCode(offer.code!)}
                className="px-1.5 py-0.5 rounded bg-surface-container-high hover:bg-surface-container-lowest text-on-surface text-[10px] font-mono font-bold transition-all flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[11px]">content_copy</span>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          ) : (
            <span className="text-[9.5px] font-mono text-on-surface-variant flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[11px]">auto_awesome</span>
              Auto-applied
            </span>
          )}

          {/* Terms & Conditions Button */}
          <button
            type="button"
            onClick={() => setTcOpen(!tcOpen)}
            className="text-[9.5px] font-semibold text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-0.5 ml-auto"
          >
            <span className="material-symbols-outlined text-[11px]">gavel</span>
            {tcOpen ? 'Hide T&C' : 'T&C (Locked)'}
          </button>
        </div>

        {/* Expandable Terms & Conditions (Locked State) */}
        {tcOpen && (
          <div className="p-2 rounded-lg bg-surface-container-high border border-border space-y-1.5 mt-1 text-[10px] text-on-surface-variant animate-fade-in">
            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold border-b border-border pb-1 text-[9.5px]">
              <span className="material-symbols-outlined text-[11px]">lock</span>
              <span>Terms & Conditions — Locked State</span>
            </div>
            <p className="text-[9px] text-on-surface-variant leading-tight italic">
              These official terms apply upon unlocking this offer.
            </p>
            <ul className="space-y-0.5 pl-1">
              {offer.termsAndConditions.map((tc, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-1 text-[9.5px] text-on-surface-variant leading-tight"
                >
                  <span className="text-primary font-bold">•</span>
                  <span>{tc}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

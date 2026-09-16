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
    <div className="rounded-xl bg-[#181c24] border border-[#262a33] overflow-hidden flex flex-col justify-between shadow-lg hover:border-[#3d4a42] transition-all group">
      {/* Image Header with Badge Overlay */}
      <div className="relative h-28 w-full bg-[#0a0e16] overflow-hidden">
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
        <div className="absolute inset-0 bg-gradient-to-t from-[#181c24] via-[#181c24]/30 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 z-10">
          <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider bg-[#0a0e16]/80 text-[#68dba9] border border-[#262a33] backdrop-blur-md">
            {offer.category.replace('_', ' ')}
          </span>

          {offer.isLocked ? (
            <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider bg-rose-950/90 text-rose-300 border border-rose-800/80 backdrop-blur-md flex items-center gap-0.5 shadow-md">
              <span className="material-symbols-outlined text-[9px]">lock</span>
              LOCKED
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider bg-emerald-950/90 text-emerald-300 border border-emerald-800/80 backdrop-blur-md flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[9px]">verified</span>
              UNLOCKED
            </span>
          )}
        </div>

        {/* Discount Tag Overlay at Bottom Left */}
        <div className="absolute bottom-1.5 left-2 z-10">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#25a475] text-[#00311f] shadow-md inline-block">
            {offer.discountValue}
          </span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
        <div className="space-y-0.5">
          <h3 className="font-bold text-xs sm:text-sm text-[#dfe2ee] font-['Space_Grotesk'] leading-tight group-hover:text-[#68dba9] transition-colors">
            {offer.name}
          </h3>
          <p className="text-[10px] font-semibold text-[#68dba9]">{offer.tagline}</p>
          <p className="text-[10px] text-[#bccac0] leading-snug line-clamp-2">{offer.description}</p>
        </div>

        {/* Lock Unlock Requirement Progress Bar */}
        {offer.isLocked && (
          <div className="p-2 rounded-lg bg-[#0a0e16] border border-[#262a33] space-y-1">
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-rose-400 font-semibold flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[10px]">lock_clock</span>
                Unlock Condition
              </span>
              <span className="font-mono text-slate-300 font-bold">{offer.unlockRequirement}</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-[#1c2028] h-1.5 rounded-full overflow-hidden border border-[#262a33]">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full transition-all duration-500"
                style={{ width: `${Math.min(offer.unlockProgressPercent, 100)}%` }}
              />
            </div>
            <p className="text-[8.5px] text-[#87948b] font-mono leading-tight">{offer.lockReason}</p>
          </div>
        )}

        {/* Action Controls & Promo Code Box */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-[#262a33]">
          {offer.code ? (
            <div className="flex items-center gap-1">
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#0a0e16] text-[#68dba9] border border-[#262a33]">
                {offer.code}
              </span>
              <button
                type="button"
                onClick={() => handleCopyCode(offer.code!)}
                className="px-1.5 py-0.5 rounded bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] text-[10px] font-mono font-bold transition-all flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[11px]">content_copy</span>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          ) : (
            <span className="text-[9.5px] font-mono text-[#87948b] flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[11px]">auto_awesome</span>
              Auto-applied
            </span>
          )}

          {/* Terms & Conditions Button */}
          <button
            type="button"
            onClick={() => setTcOpen(!tcOpen)}
            className="text-[9.5px] font-semibold text-[#87948b] hover:text-[#dfe2ee] transition-colors flex items-center gap-0.5 ml-auto"
          >
            <span className="material-symbols-outlined text-[11px]">gavel</span>
            {tcOpen ? 'Hide T&C' : 'T&C (Locked)'}
          </button>
        </div>

        {/* Expandable Terms & Conditions (Locked State) */}
        {tcOpen && (
          <div className="p-2 rounded-lg bg-[#0a0e16] border border-slate-800 space-y-1.5 mt-1 text-[10px] text-slate-300 animate-fadeIn">
            <div className="flex items-center gap-1 text-amber-400 font-bold border-b border-slate-800 pb-1 text-[9.5px]">
              <span className="material-symbols-outlined text-[11px]">lock</span>
              <span>Terms & Conditions — Locked State</span>
            </div>
            <p className="text-[9px] text-slate-400 leading-tight italic">
              These official terms apply upon unlocking this offer.
            </p>
            <ul className="space-y-0.5 pl-1">
              {offer.termsAndConditions.map((tc, idx) => (
                <li key={idx} className="flex items-start gap-1 text-[9.5px] text-slate-300 leading-tight">
                  <span className="text-emerald-400 font-bold">•</span>
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

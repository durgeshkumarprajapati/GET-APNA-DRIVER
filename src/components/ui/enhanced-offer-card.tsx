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
    <div className="rounded-2xl bg-[#181c24] border border-[#262a33] overflow-hidden flex flex-col justify-between shadow-xl hover:border-[#3d4a42] transition-all group">
      {/* Image Header with Badge Overlay */}
      <div className="relative h-44 w-full bg-[#0a0e16] overflow-hidden">
        <Image
          src={offer.image}
          alt={offer.name}
          fill
          className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
            offer.isLocked ? 'filter brightness-75 contrast-90 grayscale-[30%]' : ''
          }`}
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
        {/* Dark Gradient Overlay for Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#181c24] via-[#181c24]/30 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#0a0e16]/80 text-[#68dba9] border border-[#262a33] backdrop-blur-md">
            {offer.category.replace('_', ' ')}
          </span>

          {offer.isLocked ? (
            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-950/90 text-rose-300 border border-rose-800/80 backdrop-blur-md flex items-center gap-1 shadow-md">
              <span className="material-symbols-outlined text-xs">lock</span>
              LOCKED OFFER
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-950/90 text-emerald-300 border border-emerald-800/80 backdrop-blur-md flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">verified</span>
              UNLOCKED
            </span>
          )}
        </div>

        {/* Discount Tag Overlay at Bottom Left */}
        <div className="absolute bottom-3 left-3 z-10">
          <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-[#25a475] text-[#00311f] shadow-lg inline-block">
            {offer.discountValue}
          </span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-base text-[#dfe2ee] font-['Space_Grotesk'] group-hover:text-[#68dba9] transition-colors">
              {offer.name}
            </h3>
          </div>
          <p className="text-xs font-semibold text-[#68dba9]">{offer.tagline}</p>
          <p className="text-xs text-[#bccac0] leading-relaxed line-clamp-2">{offer.description}</p>
        </div>

        {/* Lock Unlock Requirement Progress Bar */}
        {offer.isLocked && (
          <div className="p-3 rounded-xl bg-[#0a0e16] border border-[#262a33] space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-rose-400 font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">lock_clock</span>
                Unlock Condition
              </span>
              <span className="font-mono text-slate-300 font-bold">{offer.unlockRequirement}</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-[#1c2028] h-2 rounded-full overflow-hidden border border-[#262a33]">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full transition-all duration-500"
                style={{ width: `${Math.min(offer.unlockProgressPercent, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-[#87948b] font-mono">{offer.lockReason}</p>
          </div>
        )}

        {/* Action Controls & Promo Code Box */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#262a33]">
          {offer.code ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-3 py-1.5 rounded-lg bg-[#0a0e16] text-[#68dba9] border border-[#262a33]">
                {offer.code}
              </span>
              <button
                type="button"
                onClick={() => handleCopyCode(offer.code!)}
                className="px-3 py-1.5 rounded-lg bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] text-xs font-mono font-bold transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">content_copy</span>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          ) : (
            <span className="text-[11px] font-mono text-[#87948b] flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">auto_awesome</span>
              Auto-applied at checkout
            </span>
          )}

          {/* Terms & Conditions Button */}
          <button
            type="button"
            onClick={() => setTcOpen(!tcOpen)}
            className="text-xs font-semibold text-[#87948b] hover:text-[#dfe2ee] transition-colors flex items-center gap-1 ml-auto"
          >
            <span className="material-symbols-outlined text-sm">gavel</span>
            {tcOpen ? 'Hide T&C' : 'Terms & Conditions (Locked)'}
          </button>
        </div>

        {/* Expandable Terms & Conditions (Locked State) */}
        {tcOpen && (
          <div className="p-4 rounded-xl bg-[#0a0e16] border border-slate-800 space-y-3 mt-2 text-xs text-slate-300 animate-fadeIn">
            <div className="flex items-center gap-2 text-amber-400 font-bold border-b border-slate-800 pb-2">
              <span className="material-symbols-outlined text-base">lock</span>
              <span>Terms & Conditions — Currently Locked State</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed italic">
              These official terms apply upon unlocking this offer. Standard platform verification &
              fair usage policies enforced.
            </p>
            <ul className="space-y-1.5 pl-2">
              {offer.termsAndConditions.map((tc, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[11px] text-slate-300">
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

'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/i18n/context';
import { LOCALES_META, SUPPORTED_LOCALES, SupportedLocale } from '@/i18n/config';

interface LanguageSelectorProps {
  variant?: 'dark' | 'light' | 'minimal';
  className?: string;
}

export function LanguageSelector({ variant = 'dark', className = '' }: LanguageSelectorProps) {
  const { locale, setLocale } = useTranslation();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeMeta = LOCALES_META[locale];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const buttonStyle =
    variant === 'light'
      ? 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
      : variant === 'minimal'
      ? 'bg-transparent text-current hover:bg-white/10 border-transparent'
      : 'bg-[#181c24] border-[#262a33] text-[#dfe2ee] hover:bg-[#262a33]';

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#68dba9]/50 ${buttonStyle}`}
        aria-label="Select Language"
        aria-expanded={open}
      >
        <span className="material-symbols-outlined text-sm text-[#68dba9]">language</span>
        <span className="font-bold">{activeMeta.nativeName}</span>
        <span className="text-[10px] text-[#bccac0] font-mono">({activeMeta.code.toUpperCase()})</span>
        <span className="material-symbols-outlined text-xs text-[#bccac0]">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl bg-[#181c24] border border-[#262a33] shadow-2xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[10px] font-mono uppercase font-bold text-[#bccac0] border-b border-[#262a33]">
            Select Language
          </div>
          {SUPPORTED_LOCALES.map((locKey: SupportedLocale) => {
            const meta = LOCALES_META[locKey];
            const isSelected = locale === locKey;
            return (
              <button
                key={locKey}
                type="button"
                onClick={() => {
                  setLocale(locKey);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs font-mono flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-[#00311f] text-[#68dba9] font-bold'
                    : 'text-[#dfe2ee] hover:bg-[#262a33]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{meta.flag}</span>
                  <span>{meta.nativeName}</span>
                </div>
                {isSelected && (
                  <span className="material-symbols-outlined text-sm text-[#68dba9]">check</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

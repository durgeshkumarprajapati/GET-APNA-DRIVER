'use client';

import { SUPPORTED_LANGUAGES } from '@/shared/constants/languages';

interface SpokenLanguageSelectorProps {
  selectedLanguages: string[];
  onChange: (languages: string[]) => void;
  label?: string;
  description?: string;
}

export function SpokenLanguageSelector({
  selectedLanguages,
  onChange,
  label = 'Languages Spoken & Understood',
  description = 'Select all the languages you can comfortably speak or understand.',
}: SpokenLanguageSelectorProps) {
  const toggleLanguage = (code: string) => {
    if (selectedLanguages.includes(code)) {
      if (selectedLanguages.length <= 1) return; // Keep at least 1 language selected
      onChange(selectedLanguages.filter((l) => l !== code));
    } else {
      onChange([...selectedLanguages, code]);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
          🗣️ {label}
        </label>
        {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isSelected = selectedLanguages.includes(lang.code);
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => toggleLanguage(lang.code)}
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-300 shadow-md ring-1 ring-emerald-500/30'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div
                className={`w-4 h-4 rounded flex items-center justify-center text-[10px] shrink-0 ${
                  isSelected ? 'bg-emerald-500 text-slate-950 font-bold' : 'border border-slate-700'
                }`}
              >
                {isSelected ? '✓' : ''}
              </div>
              <span className="text-base shrink-0">{lang.flag}</span>
              <div className="text-left truncate">
                <p className="font-semibold text-slate-200 truncate leading-tight">
                  {lang.nativeName}
                </p>
                <p className="text-[10px] text-slate-500 truncate">{lang.name}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

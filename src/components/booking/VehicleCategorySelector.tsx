'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n/context';

export interface VehicleCategoryItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  iconUrl?: string | null;
  displayOrder: number;
}

interface VehicleCategorySelectorProps {
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  disabled?: boolean;
}

export const VehicleCategorySelector: React.FC<VehicleCategorySelectorProps> = ({
  selectedCategoryId,
  onSelectCategory,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<VehicleCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchCategories() {
      try {
        const res = await fetch('/api/vehicle-categories');
        if (res.ok) {
          const data = await res.json();
          if (active && Array.isArray(data.categories)) {
            setCategories(data.categories);
          }
        }
      } catch {
        // Fallback silently if offline or API error
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchCategories();
    return () => {
      active = false;
    };
  }, []);

  const getCategoryIcon = (code: string) => {
    switch (code) {
      case 'MINI_CAR':
        return '🚗';
      case 'CAR':
        return '🚘';
      case 'LONG_CAR':
        return '🚙';
      case 'SUV':
        return '🚐';
      case 'TRACTOR':
        return '🚜';
      case 'TRUCK':
        return '🚚';
      case 'HEAVY_TRUCK':
        return '🚛';
      default:
        return '🚘';
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-300">
          {t('booking.vehicleCategory')}
        </label>
        <div className="animate-pulse h-10 bg-slate-800/60 rounded-xl border border-slate-700/50" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-300">
          {t('booking.vehicleCategory')}
        </label>
        <span className="text-[10px] text-slate-400">{t('booking.vehicleCategoryHint')}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Any Vehicle Option */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelectCategory(null)}
          className={`p-2.5 rounded-xl border text-left transition-all text-xs font-medium flex items-center gap-2 ${
            selectedCategoryId === null
              ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 shadow-sm shadow-emerald-500/10'
              : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span className="text-base">✨</span>
          <div className="truncate">
            <div className="font-semibold truncate">{t('booking.anyVehicleCategory')}</div>
          </div>
        </button>

        {/* Master Categories */}
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectCategory(cat.id)}
              className={`p-2.5 rounded-xl border text-left transition-all text-xs font-medium flex items-center gap-2 ${
                isSelected
                  ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 shadow-sm shadow-emerald-500/10'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className="text-base">{getCategoryIcon(cat.code)}</span>
              <div className="truncate">
                <div className="font-semibold truncate">{cat.name}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

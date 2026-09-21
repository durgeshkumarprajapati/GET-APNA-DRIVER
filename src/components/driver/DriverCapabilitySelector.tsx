'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n/context';

export interface VehicleCategoryItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  displayOrder: number;
}

export interface DriverCapabilityItem {
  id: string;
  driverProfileId: string;
  vehicleCategoryId: string;
  vehicleCategory: VehicleCategoryItem;
}

interface DriverCapabilitySelectorProps {
  onCapabilitiesChange?: (categoryIds: string[]) => void;
  disabled?: boolean;
}

export const DriverCapabilitySelector: React.FC<DriverCapabilitySelectorProps> = ({
  onCapabilitiesChange,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<VehicleCategoryItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const [catRes, capRes] = await Promise.all([
          fetch('/api/vehicle-categories'),
          fetch('/api/driver/vehicle-capabilities'),
        ]);

        if (!isMounted) return;

        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.categories || []);
        }

        if (capRes.ok) {
          const capData = await capRes.json();
          const currentCaps: DriverCapabilityItem[] = capData.capabilities || [];
          const currentIds = currentCaps.map((c) => c.vehicleCategoryId);
          setSelectedIds(currentIds);
        }
      } catch {
        if (isMounted) setErrorMessage('Failed to load vehicle capabilities.');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleCategory = (id: string) => {
    if (disabled || saving) return;
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      if (onCapabilitiesChange) onCapabilitiesChange(next);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/driver/vehicle-capabilities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryIds: selectedIds }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('Vehicle capabilities updated successfully.');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(data.error || 'Failed to update vehicle capabilities.');
      }
    } catch {
      setErrorMessage('Network error while saving vehicle capabilities.');
    } finally {
      setSaving(false);
    }
  };

  const getIcon = (code: string) => {
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
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="h-5 w-48 bg-slate-800 animate-pulse rounded-md" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-800/60 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <span>{t('booking.vehicleCapabilities')}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {selectedIds.length} Selected
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{t('booking.vehicleCapabilitiesHint')}</p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={disabled || saving}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-50 transition-all shadow-md shadow-emerald-500/10 cursor-pointer self-start sm:self-auto"
        >
          {saving ? 'Saving...' : 'Save Capabilities'}
        </button>
      </div>

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
          ✓ {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          ✕ {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {categories.map((cat) => {
          const isSelected = selectedIds.includes(cat.id);
          return (
            <div
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer select-none ${
                isSelected
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-slate-100 shadow-sm shadow-emerald-500/10'
                  : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:bg-slate-900/40'
              }`}
            >
              <div
                className={`mt-0.5 h-4 w-4 rounded-md border flex items-center justify-center text-[10px] font-bold transition-all ${
                  isSelected
                    ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                    : 'border-slate-700 bg-slate-900'
                }`}
              >
                {isSelected && '✓'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-200">
                  <span>{getIcon(cat.code)}</span>
                  <span className="truncate">{cat.name}</span>
                </div>
                {cat.description && (
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

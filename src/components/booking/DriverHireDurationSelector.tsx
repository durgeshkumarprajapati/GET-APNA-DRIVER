'use client';

import { BookingType } from '@prisma/client';
import { useTranslation } from '@/i18n/context';

interface DriverHireDurationSelectorProps {
  bookingType: BookingType;
  durationValue: number;
  onChangeDurationValue: (value: number) => void;
  startTime?: string | null;
  onChangeStartTime?: (time: string) => void;
}

export function DriverHireDurationSelector({
  bookingType,
  durationValue,
  onChangeDurationValue,
  startTime,
  onChangeStartTime,
}: DriverHireDurationSelectorProps) {
  const { t } = useTranslation();

  if (
    bookingType === BookingType.POINT_TO_POINT ||
    bookingType === BookingType.ONE_WAY ||
    bookingType === BookingType.ROUND_TRIP
  ) {
    return null;
  }

  let unitLabelKey = 'booking.units.hours';
  let defaultUnitLabel = 'Hours';
  let minVal = 1;
  let maxVal = 24;
  let presets = [2, 4, 8, 12];

  if (bookingType === BookingType.DAILY || bookingType === BookingType.FULL_DAY) {
    unitLabelKey = 'booking.units.days';
    defaultUnitLabel = 'Days';
    minVal = 1;
    maxVal = 30;
    presets = [1, 2, 3, 5, 7];
  } else if (bookingType === BookingType.WEEKLY) {
    unitLabelKey = 'booking.units.weeks';
    defaultUnitLabel = 'Weeks';
    minVal = 1;
    maxVal = 52;
    presets = [1, 2, 3, 4];
  } else if (bookingType === BookingType.MONTHLY) {
    unitLabelKey = 'booking.units.months';
    defaultUnitLabel = 'Months';
    minVal = 1;
    maxVal = 12;
    presets = [1, 3, 6, 12];
  }

  const unitLabel = t(unitLabelKey, { defaultValue: defaultUnitLabel });

  return (
    <div className="bg-surface-container rounded-xl p-4 border border-border flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg">timer</span>
          <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
            {t('booking.hireDurationTitle', { defaultValue: 'Hire Duration' })}
          </span>
        </div>
        <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/30">
          {durationValue} {unitLabel}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChangeDurationValue(Math.max(minVal, durationValue - 1))}
          className="w-10 h-10 rounded-lg bg-surface-container-high border border-border text-on-surface font-bold text-lg hover:border-primary transition-all flex items-center justify-center shrink-0"
        >
          -
        </button>
        <input
          type="number"
          min={minVal}
          max={maxVal}
          value={durationValue}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val)) {
              onChangeDurationValue(Math.min(maxVal, Math.max(minVal, val)));
            }
          }}
          className="w-full bg-surface-container-high border border-border rounded-lg px-3 py-2 text-center font-bold text-on-surface text-sm focus:outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => onChangeDurationValue(Math.min(maxVal, durationValue + 1))}
          className="w-10 h-10 rounded-lg bg-surface-container-high border border-border text-on-surface font-bold text-lg hover:border-primary transition-all flex items-center justify-center shrink-0"
        >
          +
        </button>
      </div>

      {/* Preset Chips */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <span className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">
          Presets:
        </span>
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChangeDurationValue(preset)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              durationValue === preset
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant border border-border hover:text-on-surface'
            }`}
          >
            {preset} {unitLabel}
          </button>
        ))}
      </div>

      {onChangeStartTime && (
        <div className="pt-2 border-t border-border flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-on-surface-variant">
            {t('booking.requestedStart', { defaultValue: 'Requested Start Time (Optional)' })}
          </label>
          <input
            type="datetime-local"
            value={startTime ?? ''}
            onChange={(e) => onChangeStartTime(e.target.value)}
            className="bg-surface-container-high border border-border rounded-lg px-3 py-2 text-xs font-medium text-on-surface focus:outline-none focus:border-primary"
          />
        </div>
      )}
    </div>
  );
}

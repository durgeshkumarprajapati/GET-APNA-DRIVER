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
    <div className="bg-[#181c24] rounded-xl p-4 border border-[#262a33] flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#25a475] text-lg">timer</span>
          <span className="text-xs font-bold text-[#dfe2ee] uppercase tracking-wider">
            {t('booking.hireDurationTitle', { defaultValue: 'Hire Duration' })}
          </span>
        </div>
        <span className="text-xs font-semibold text-[#25a475] bg-[#00311f] px-2.5 py-1 rounded-full border border-[#25a475]/30">
          {durationValue} {unitLabel}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChangeDurationValue(Math.max(minVal, durationValue - 1))}
          className="w-10 h-10 rounded-lg bg-[#0a0e16] border border-[#262a33] text-[#dfe2ee] font-bold text-lg hover:border-[#25a475] transition-all flex items-center justify-center shrink-0"
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
          className="w-full bg-[#0a0e16] border border-[#262a33] rounded-lg px-3 py-2 text-center font-bold text-[#dfe2ee] text-sm focus:outline-none focus:border-[#25a475]"
        />
        <button
          type="button"
          onClick={() => onChangeDurationValue(Math.min(maxVal, durationValue + 1))}
          className="w-10 h-10 rounded-lg bg-[#0a0e16] border border-[#262a33] text-[#dfe2ee] font-bold text-lg hover:border-[#25a475] transition-all flex items-center justify-center shrink-0"
        >
          +
        </button>
      </div>

      {/* Preset Chips */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <span className="text-[10px] text-[#87948b] font-medium uppercase tracking-wider">
          Presets:
        </span>
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChangeDurationValue(preset)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              durationValue === preset
                ? 'bg-[#25a475] text-[#00311f]'
                : 'bg-[#0a0e16] text-[#a2abb3] border border-[#262a33] hover:text-[#dfe2ee]'
            }`}
          >
            {preset} {unitLabel}
          </button>
        ))}
      </div>

      {onChangeStartTime && (
        <div className="pt-2 border-t border-[#262a33]/60 flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-[#87948b]">
            {t('booking.requestedStart', { defaultValue: 'Requested Start Time (Optional)' })}
          </label>
          <input
            type="datetime-local"
            value={startTime ?? ''}
            onChange={(e) => onChangeStartTime(e.target.value)}
            className="bg-[#0a0e16] border border-[#262a33] rounded-lg px-3 py-2 text-xs font-medium text-[#dfe2ee] focus:outline-none focus:border-[#25a475]"
          />
        </div>
      )}
    </div>
  );
}

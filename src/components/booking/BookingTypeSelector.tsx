'use client';

import { BookingType } from '@prisma/client';
import { useTranslation } from '@/i18n/context';

export interface BookingTypeOption {
  type: BookingType;
  labelKey: string;
  defaultLabel: string;
  icon: string;
  descriptionKey: string;
  defaultDescription: string;
}

export const BOOKING_TYPE_OPTIONS: BookingTypeOption[] = [
  {
    type: BookingType.POINT_TO_POINT,
    labelKey: 'booking.type.pointToPoint',
    defaultLabel: 'Point to Point',
    icon: 'navigation',
    descriptionKey: 'booking.type.pointToPointDesc',
    defaultDescription: 'A driver comes to you and drives your own car for a single service',
  },
  {
    type: BookingType.HOURLY,
    labelKey: 'booking.type.hourly',
    defaultLabel: 'Hourly Hire',
    icon: 'schedule',
    descriptionKey: 'booking.type.hourlyDesc',
    defaultDescription: 'Hire a driver by the hour for errands or meetings',
  },
  {
    type: BookingType.DAILY,
    labelKey: 'booking.type.daily',
    defaultLabel: 'Daily Hire',
    icon: 'today',
    descriptionKey: 'booking.type.dailyDesc',
    defaultDescription: 'Full day dedicated personal driver service',
  },
  {
    type: BookingType.WEEKLY,
    labelKey: 'booking.type.weekly',
    defaultLabel: 'Weekly Hire',
    icon: 'date_range',
    descriptionKey: 'booking.type.weeklyDesc',
    defaultDescription: 'Dedicated driver for 7 days or more',
  },
  {
    type: BookingType.MONTHLY,
    labelKey: 'booking.type.monthly',
    defaultLabel: 'Monthly Hire',
    icon: 'calendar_month',
    descriptionKey: 'booking.type.monthlyDesc',
    defaultDescription: 'Long term monthly chauffeur membership',
  },
];

interface BookingTypeSelectorProps {
  selectedType: BookingType;
  onSelectType: (type: BookingType) => void;
}

export function BookingTypeSelector({ selectedType, onSelectType }: BookingTypeSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-[#87948b] tracking-wider uppercase">
        {t('booking.selectHireType', { defaultValue: 'Select Hire Mode' })}
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-[#0a0e16] p-1.5 rounded-xl border border-[#262a33]">
        {BOOKING_TYPE_OPTIONS.map((opt) => {
          const isSelected = selectedType === opt.type;
          return (
            <button
              key={opt.type}
              type="button"
              onClick={() => onSelectType(opt.type)}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1 text-center ${
                isSelected
                  ? 'bg-[#25a475] text-[#00311f] shadow-md ring-1 ring-[#25a475]/50'
                  : 'text-[#a2abb3] hover:text-[#dfe2ee] hover:bg-[#181c24]'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{opt.icon}</span>
              <span className="truncate w-full">
                {t(opt.labelKey, { defaultValue: opt.defaultLabel })}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

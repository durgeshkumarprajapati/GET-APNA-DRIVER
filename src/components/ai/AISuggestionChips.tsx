'use client';

export interface AISuggestionChipsProps {
  role: 'CUSTOMER' | 'DRIVER';
  onSelectChip: (text: string) => void;
  disabled?: boolean;
}

const CUSTOMER_CHIPS = [
  'Book a ride',
  'Book my usual ride',
  'Find discounts',
  'Check my rewards',
  'How much for airport ride?',
  'Track my driver',
];

const DRIVER_CHIPS = [
  "Today's briefing",
  'My earnings',
  'My incentive progress',
  'My schedule status',
  'Pickup assistance',
];

export function AISuggestionChips({ role, onSelectChip, disabled = false }: AISuggestionChipsProps) {
  const chips = role === 'CUSTOMER' ? CUSTOMER_CHIPS : DRIVER_CHIPS;

  return (
    <div className="flex flex-wrap gap-2 py-2">
      {chips.map((chip, idx) => (
        <button
          key={idx}
          type="button"
          disabled={disabled}
          onClick={() => onSelectChip(chip)}
          className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}

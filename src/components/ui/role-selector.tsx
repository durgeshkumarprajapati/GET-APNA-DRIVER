'use client';

export type SelectableRole = 'CUSTOMER' | 'DRIVER';

interface RoleOption {
  role: SelectableRole;
  icon: string;
  title: string;
  description: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'CUSTOMER',
    icon: 'directions_car',
    title: 'Customer',
    description: 'Book reliable rides and manage your trips.',
  },
  {
    role: 'DRIVER',
    icon: 'local_taxi',
    title: 'Driver',
    description: 'Accept bookings, manage missions and earn.',
  },
];

interface RoleSelectorProps {
  selectedRole: SelectableRole | null;
  onSelect: (role: SelectableRole) => void;
  submitting: boolean;
}

/**
 * RoleSelector presentational component using theme tokens.
 */
export function RoleSelector({ selectedRole, onSelect, submitting }: RoleSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="How would you like to use Get Apna Driver?"
      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
    >
      {ROLE_OPTIONS.map((option) => {
        const isSelected = selectedRole === option.role;
        return (
          <button
            key={option.role}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={submitting}
            onClick={() => onSelect(option.role)}
            className={`min-h-[48px] text-left p-5 rounded-2xl border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed ${
              isSelected
                ? 'border-primary bg-primary/10 shadow-md'
                : 'border-border bg-surface-container hover:border-primary/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-xl" aria-hidden="true">
                  {option.icon}
                </span>
              </span>
              {isSelected && (
                <span
                  className="material-symbols-outlined text-primary text-xl"
                  aria-hidden="true"
                >
                  check_circle
                </span>
              )}
            </div>
            <h3 className="font-bold text-base text-on-surface font-['Space_Grotesk']">
              {option.title}
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">{option.description}</p>
          </button>
        );
      })}
    </div>
  );
}


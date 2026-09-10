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
 * Purely presentational — knows nothing about accounts, sessions, or
 * roles beyond the two literal choices it renders. The actual domain
 * decision (assigning the role, initializing the profile, rejecting
 * ADMINISTRATOR) happens server-side in role-selection-service.ts; this
 * component only reports which button the user pressed via `onSelect`, so
 * it's reusable by any future authentication provider that needs the same
 * choice with no changes here.
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
            className={`min-h-[48px] text-left p-5 rounded-2xl border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#68dba9] disabled:opacity-50 disabled:cursor-not-allowed ${
              isSelected
                ? 'border-[#68dba9] bg-[#00311f]/40 shadow-[0_0_20px_rgba(104,219,169,0.2)]'
                : 'border-[#262a33] bg-[#181c24] hover:border-[#3d4a42]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isSelected ? 'bg-[#68dba9] text-[#003825]' : 'bg-[#262a33] text-[#87948b]'
                }`}
              >
                <span className="material-symbols-outlined text-xl" aria-hidden="true">
                  {option.icon}
                </span>
              </span>
              {isSelected && (
                <span
                  className="material-symbols-outlined text-[#68dba9] text-xl"
                  aria-hidden="true"
                >
                  check_circle
                </span>
              )}
            </div>
            <h3 className="font-bold text-base text-[#dfe2ee] font-['Space_Grotesk']">
              {option.title}
            </h3>
            <p className="text-xs text-[#bccac0] mt-1">{option.description}</p>
          </button>
        );
      })}
    </div>
  );
}

export type OnboardingStepStatus = 'done' | 'current' | 'pending';

export interface OnboardingStepDefinition {
  label: string;
  status: OnboardingStepStatus;
}

interface OnboardingProgressProps {
  steps: OnboardingStepDefinition[];
  /** Shown as a small note below the bar — e.g. "2 of 3 documents verified". */
  detail?: string;
}

const STEP_CLASSES: Record<OnboardingStepStatus, { bar: string; dot: string; label: string }> = {
  done: { bar: 'bg-[#25a475]', dot: 'bg-[#25a475] text-[#042116]', label: 'text-[#68dba9]' },
  current: { bar: 'bg-[#68dba9]', dot: 'bg-[#68dba9] text-[#042116]', label: 'text-[#dfe2ee]' },
  pending: { bar: 'bg-[#262a33]', dot: 'bg-[#262a33] text-[#87948b]', label: 'text-[#87948b]' },
};

/**
 * Labeled step tracker for multi-step onboarding flows (driver verification,
 * first-booking walkthrough) — a checklist, not a progress bar alone, so a
 * returning user can see exactly which step they're resuming at.
 */
export function OnboardingProgress({ steps, detail }: OnboardingProgressProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.label} className="flex-1 flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold ${STEP_CLASSES[s.status].dot}`}
            >
              {s.status === 'done' ? (
                <span className="material-symbols-outlined text-sm" aria-hidden="true">
                  check
                </span>
              ) : (
                i + 1
              )}
            </div>
            <div className={`h-1 flex-1 rounded-full ${STEP_CLASSES[s.status].bar}`} />
          </div>
        ))}
      </div>
      <div className="flex items-center text-[10px] font-mono">
        {steps.map((s) => (
          <span key={s.label} className={`flex-1 truncate ${STEP_CLASSES[s.status].label}`}>
            {s.label}
          </span>
        ))}
      </div>
      {detail && <p className="text-[11px] text-[#87948b]">{detail}</p>}
    </div>
  );
}

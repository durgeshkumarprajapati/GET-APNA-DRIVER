'use client';

import { useTranslation } from '@/i18n/context';

interface LoadingStateProps {
  message?: string;
}

/** Shared loading spinner supporting localized default message. */
export function LoadingState({ message }: LoadingStateProps) {
  const { t } = useTranslation();
  const displayMsg = message ?? t('common.labels.loading');

  return (
    <div className="py-16 flex flex-col items-center gap-3 text-outline text-sm font-mono">
      <div className="w-8 h-8 rounded-full border-4 border-surface-container-high border-t-[#68dba9] animate-spin" />
      <span>{displayMsg}</span>
    </div>
  );
}

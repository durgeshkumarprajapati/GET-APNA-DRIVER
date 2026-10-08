'use client';

import { useEffect } from 'react';
import { useTranslation } from '@/i18n/context';

interface ConfirmDialogProps {
  open?: boolean;
  isOpen?: boolean;
  title: string;
  message?: string;
  description?: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Shared blocking confirmation modal supporting localized fallback labels.
 */
export function ConfirmDialog({
  open,
  isOpen,
  title,
  message,
  description,
  confirmLabel,
  confirmText,
  cancelLabel,
  cancelText,
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const visible = open ?? isOpen ?? false;

  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onCancel]);

  if (!visible) return null;

  const displayMessage = description ?? message ?? t('common.dialogs.confirmDescription');
  const btnConfirm = confirmText ?? confirmLabel ?? t('common.actions.confirm');
  const btnCancel = cancelText ?? cancelLabel ?? t('common.actions.cancel');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-surface-container-lowest border border-border rounded-2xl p-6 shadow-2xl space-y-4 animate-scale-in"
      >
        <h3
          id="confirm-dialog-title"
          className="text-lg font-bold text-on-surface font-['Space_Grotesk']"
        >
          {title}
        </h3>
        <p className="text-sm text-on-surface-variant leading-relaxed">{displayMessage}</p>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[48px] px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high border border-border text-xs font-bold text-on-surface transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {btnCancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`min-h-[48px] px-4 py-2 rounded-lg text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
              danger
                ? 'bg-red-600 hover:bg-red-700 text-white focus-visible:outline-red-500'
                : 'bg-primary hover:opacity-90 text-on-primary focus-visible:outline-primary'
            }`}
          >
            {btnConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}


'use client';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Shared blocking confirmation modal — used anywhere an action needs an
 * explicit "are you sure" step before firing (e.g. SOS triggers), instead
 * of each page hand-rolling its own overlay/backdrop markup.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0e16]/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#181c24] border border-[#262a33] rounded-2xl p-6 shadow-2xl space-y-4">
        <h3 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">{title}</h3>
        <p className="text-sm text-[#bccac0] leading-relaxed">{message}</p>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-[#262a33] hover:bg-[#3d4a42] text-xs font-bold text-[#dfe2ee] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              danger
                ? 'bg-[#93000a] hover:bg-[#b3000d] text-[#ffdad6]'
                : 'bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

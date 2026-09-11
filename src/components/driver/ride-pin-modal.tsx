'use client';

import { useState, useRef, useEffect } from 'react';

interface RidePinModalProps {
  isOpen: boolean;
  customerName?: string;
  bookingId: string;
  onClose: () => void;
  onVerifyAndStart: (ridePin: string) => Promise<void>;
}

export function RidePinModal({
  isOpen,
  customerName,
  bookingId,
  onClose,
  onVerifyAndStart,
}: RidePinModalProps) {
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      inputRefs[0].current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (index: number, value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) {
      const newDigits = [...pinDigits];
      newDigits[index] = '';
      setPinDigits(newDigits);
      return;
    }

    // Handle single character or paste of multiple digits
    if (numericValue.length === 1) {
      const newDigits = [...pinDigits];
      newDigits[index] = numericValue;
      setPinDigits(newDigits);
      if (index < 5) {
        inputRefs[index + 1].current?.focus();
      }
    } else if (numericValue.length > 1) {
      const pasted = numericValue.slice(0, 6).split('');
      const newDigits = [...pinDigits];
      pasted.forEach((char, i) => {
        if (index + i < 6) {
          newDigits[index + i] = char;
        }
      });
      setPinDigits(newDigits);
      const nextFocus = Math.min(index + pasted.length, 5);
      inputRefs[nextFocus].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const fullPin = pinDigits.join('');
  const isComplete = fullPin.length === 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete || loading) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      await onVerifyAndStart(fullPin);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid ride PIN.';
      setErrorMsg(msg);
      // Highlight/focus first input on error
      inputRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0a0e16] border border-[#262a33] rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[#68dba9] bg-[#00311f] px-2.5 py-1 rounded-full border border-[#25a475]">
            <span className="material-symbols-outlined text-[14px]">lock</span>
            <span>VERIFY RIDE PIN</span>
          </div>
          <h3 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk'] pt-1">
            Start Your Ride
          </h3>
          <p className="text-xs text-[#87948b]">
            Ask customer {customerName ? <strong>{customerName}</strong> : ''} for their 6-digit
            Ride PIN.
          </p>
          <div className="text-[11px] font-mono text-[#68dba9] pt-1">
            Booking ID: #{bookingId.slice(0, 8).toUpperCase()}
          </div>
        </div>

        {errorMsg && (
          <div className="bg-[#93000a]/20 border border-[#93000a] text-[#ffb4ab] px-3.5 py-2.5 rounded-xl text-xs text-center font-mono">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-center gap-2">
            {pinDigits.map((digit, index) => (
              <input
                key={index}
                ref={inputRefs[index]}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={loading}
                className="w-11 h-13 text-center text-xl font-bold font-mono bg-[#181c24] border border-[#262a33] text-[#dfe2ee] rounded-xl focus:outline-none focus:border-[#68dba9] focus:ring-1 focus:ring-[#68dba9] disabled:opacity-50 transition-all"
              />
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-xl bg-[#181c24] border border-[#262a33] text-xs font-semibold text-[#dfe2ee] hover:bg-[#262a33] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isComplete || loading}
              className="w-1/2 py-2.5 rounded-xl bg-[#25a475] text-[#042116] text-xs font-bold hover:bg-[#68dba9] transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              {loading ? 'Verifying...' : 'VERIFY & START'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

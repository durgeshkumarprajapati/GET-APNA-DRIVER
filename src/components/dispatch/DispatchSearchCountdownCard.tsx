'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/status-badge';

export interface DispatchStatusResponse {
  bookingId: string;
  status: string;
  searchStartedAt: string | null;
  searchDeadlineAt: string | null;
  remainingSeconds: number;
  hasExpired: boolean;
  isNoDriverCancelled: boolean;
  cancellationReason: string | null;
  cancellationMessage: string | null;
}

interface DispatchSearchCountdownCardProps {
  bookingId: string;
  onCancelled?: () => void;
}

export function DispatchSearchCountdownCard({
  bookingId,
  onCancelled,
}: DispatchSearchCountdownCardProps) {
  const [dispatchStatus, setDispatchStatus] = useState<DispatchStatusResponse | null>(null);
  const [remainingSec, setRemainingSec] = useState<number>(180);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/customer/bookings/${bookingId}/dispatch-status`);
        if (res.ok) {
          const data = await res.json();
          if (data?.dispatchStatus) {
            const ds: DispatchStatusResponse = data.dispatchStatus;
            setDispatchStatus(ds);
            setRemainingSec(ds.remainingSeconds ?? 0);

            if (ds.isNoDriverCancelled && onCancelled) {
              onCancelled();
            }
          }
        }
      } catch {
        // Safe polling retry
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);

    // Local 1-second countdown ticks for smooth UI countdown
    timer = setInterval(() => {
      setRemainingSec((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      clearInterval(interval);
      if (timer) clearInterval(timer);
    };
  }, [bookingId, onCancelled]);

  if (!dispatchStatus) return null;

  // Format seconds to mm:ss
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (dispatchStatus.isNoDriverCancelled || (dispatchStatus.status === 'CANCELLED' && dispatchStatus.cancellationReason === 'NO_ACTIVE_DRIVER_NEARBY')) {
    return (
      <div className="p-6 rounded-2xl bg-[#181c24] border border-[#f2b8b5]/30 space-y-4 shadow-lg animate-fade-in">
        <div className="flex items-center gap-3 text-[#f2b8b5]">
          <span className="material-symbols-outlined text-2xl">person_off</span>
          <div>
            <h3 className="text-base font-bold font-['Space_Grotesk'] text-[#dfe2ee]">
              No Active Driver Available
            </h3>
            <p className="text-xs text-[#c4c7c5] mt-0.5">
              {dispatchStatus.cancellationMessage || 'No active driver found near you.'}
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-[#262a33] flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-[#87948b]">
            Your booking search was safely cancelled after 3 minutes.
          </p>
          <Link
            href="/bookings/new"
            className="px-5 py-2.5 rounded-xl bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            <span>Try Again</span>
          </Link>
        </div>
      </div>
    );
  }

  if (dispatchStatus.status !== 'SEARCHING_DRIVER') {
    return null;
  }

  return (
    <div className="p-5 rounded-2xl bg-[#181c24] border border-[#262a33] space-y-3 shadow-md">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#68dba9] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#25a475]"></span>
          </span>
          <span className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
            Searching for nearby drivers…
          </span>
        </div>
        <StatusBadge label={`Time remaining: ${formatTimer(remainingSec)}`} tone="warning" />
      </div>

      <div className="w-full bg-[#262a33] h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-gradient-to-r from-[#25a475] to-[#68dba9] h-full transition-all duration-1000 ease-linear"
          style={{ width: `${Math.min(100, Math.max(0, (remainingSec / 180) * 100))}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#87948b]">
        <span>Server-authoritative 3-minute search deadline</span>
        <span>Matching eligible candidates nearby</span>
      </div>
    </div>
  );
}

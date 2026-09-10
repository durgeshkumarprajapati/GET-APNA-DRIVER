'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RoleSelector, type SelectableRole } from '@/components/ui/role-selector';
import { LoadingState } from '@/components/ui/loading-state';
import { useToast, ToastViewport } from '@/components/ui/toast';

/**
 * Reached only by a session with a verified identity but no role yet —
 * today that's exclusively a brand-new Google sign-in (see
 * handleGoogleOAuthCallback / dashboard-redirect-service.ts). Anyone who
 * already has a role, or has no session at all, is redirected away on
 * load rather than shown the picker.
 */
export default function SelectRolePage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [selectedRole, setSelectedRole] = useState<SelectableRole | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast, showToast, dismissToast } = useToast();

  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!isMounted) return;
        if (!res.ok) {
          router.replace('/login');
          return;
        }
        const data = await res.json();
        if ((data.principal?.roles ?? []).length > 0) {
          // Already has a role — nothing to select, let the server decide where to go.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = '/';
          return;
        }
        setCheckingSession(false);
      } catch {
        if (isMounted) router.replace('/login');
      }
    };
    void check();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSelect = async (role: SelectableRole) => {
    if (submitting) return;
    setSelectedRole(role);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/role-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to save your selection.');
      }
      showToast(`Welcome! Setting up your ${role.toLowerCase()} account…`, 'success');
      // Hard navigation to `/` so the server re-evaluates the now-role-having
      // session and lands on the correct next step (dashboard or profile
      // completion) — the same pattern every other login path already uses.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/';
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to save your selection.', 'error');
      setSubmitting(false);
      setSelectedRole(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f131c] text-[#dfe2ee] font-sans antialiased flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg bg-[#181c24] border border-[#262a33] rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <span className="text-[10px] font-mono tracking-widest text-[#68dba9] uppercase font-bold">
            One Last Step
          </span>
          <h1 className="font-bold text-2xl text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
            How would you like to use Get Apna Driver?
          </h1>
        </div>

        {checkingSession ? (
          <LoadingState message="Checking your session…" />
        ) : (
          <>
            <RoleSelector
              selectedRole={selectedRole}
              onSelect={handleSelect}
              submitting={submitting}
            />
            {submitting && (
              <p
                className="text-center text-xs text-[#87948b] mt-4"
                role="status"
                aria-live="polite"
              >
                Creating your account…
              </p>
            )}
          </>
        )}

        <div className="mt-6 pt-4 border-t border-[#262a33] text-center">
          <Link href="/login" className="text-xs text-[#87948b] hover:text-[#dfe2ee]">
            Cancel and return to login
          </Link>
        </div>
      </div>
      <ToastViewport toast={toast} onDismiss={dismissToast} />
    </div>
  );
}

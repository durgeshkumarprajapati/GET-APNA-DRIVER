'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const LINK_BUTTON_CLASSES =
  'inline-flex w-full min-h-[48px] items-center justify-center rounded-xl bg-primary text-on-primary font-bold text-sm hover:opacity-90 transition-opacity';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'PENDING' | 'SUCCESS' | 'ERROR'>('PENDING');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function doVerify() {
      if (!token) {
        if (isMounted) {
          setStatus('ERROR');
          setErrorMsg('Verification token is missing.');
        }
        return;
      }

      try {
        const res = await fetch('/api/auth/email/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = (await res.json()) as { message?: string; error?: string };

        if (!res.ok) {
          throw new Error(data.error || 'Email verification failed');
        }

        if (isMounted) {
          setStatus('SUCCESS');
        }
      } catch (err: unknown) {
        if (isMounted) {
          setStatus('ERROR');
          if (err instanceof Error) {
            setErrorMsg(err.message);
          } else {
            setErrorMsg('An unexpected error occurred');
          }
        }
      }
    }

    void doVerify();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="w-full max-w-[420px] p-10 rounded-2xl bg-surface-container border border-border text-center shadow-xl">
      {status === 'PENDING' && (
        <div>
          <h1 className="text-xl font-bold text-on-surface font-['Space_Grotesk'] mb-4">
            Verifying Email...
          </h1>
          <p className="text-sm text-on-surface-variant">Please wait while we confirm your email address.</p>
        </div>
      )}

      {status === 'SUCCESS' && (
        <div>
          <div className="text-5xl text-primary mb-4" aria-hidden="true">
            ✓
          </div>
          <h1 className="text-xl font-bold text-on-surface font-['Space_Grotesk'] mb-2">
            Email Verified!
          </h1>
          <p className="text-sm text-on-surface-variant mb-8">
            Your email address has been successfully verified.
          </p>
          <Link href="/login" className={LINK_BUTTON_CLASSES}>
            Continue to Sign In
          </Link>
        </div>
      )}

      {status === 'ERROR' && (
        <div>
          <div className="text-5xl text-destructive mb-4" aria-hidden="true">
            ✕
          </div>
          <h1 className="text-xl font-bold text-on-surface font-['Space_Grotesk'] mb-2">
            Verification Failed
          </h1>
          <p className="text-sm text-destructive mb-8">{errorMsg}</p>
          <Link href="/login" className={LINK_BUTTON_CLASSES}>
            Return to Login
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Suspense fallback={<div className="text-on-surface-variant text-sm">Loading...</div>}>
        <VerifyEmailContent />
      </Suspense>
    </main>
  );
}

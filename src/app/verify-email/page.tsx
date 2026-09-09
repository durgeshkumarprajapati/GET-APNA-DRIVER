'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

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
    <div
      style={{
        width: '100%',
        maxWidth: '420px',
        padding: '2.5rem',
        borderRadius: '1rem',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        textAlign: 'center',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
      }}
    >
      {status === 'PENDING' && (
        <div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '1rem',
              color: 'var(--color-text-primary)',
            }}
          >
            Verifying Email...
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            Please wait while we confirm your email address.
          </p>
        </div>
      )}

      {status === 'SUCCESS' && (
        <div>
          <div style={{ fontSize: '3rem', color: '#16a34a', marginBottom: '1rem' }}>✓</div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
              color: 'var(--color-text-primary)',
            }}
          >
            Email Verified!
          </h1>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: '0.875rem',
              marginBottom: '2rem',
            }}
          >
            Your email address has been successfully verified.
          </p>
          <Link
            href="/login"
            style={{
              display: 'inline-block',
              width: '100%',
              padding: '0.875rem',
              borderRadius: '0.5rem',
              backgroundColor: 'var(--color-primary)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '1rem',
              textDecoration: 'none',
            }}
          >
            Continue to Sign In
          </Link>
        </div>
      )}

      {status === 'ERROR' && (
        <div>
          <div style={{ fontSize: '3rem', color: 'var(--color-danger)', marginBottom: '1rem' }}>
            ✕
          </div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
              color: 'var(--color-text-primary)',
            }}
          >
            Verification Failed
          </h1>
          <p style={{ color: 'var(--color-danger)', fontSize: '0.875rem', marginBottom: '2rem' }}>
            {errorMsg}
          </p>
          <Link
            href="/login"
            style={{
              display: 'inline-block',
              width: '100%',
              padding: '0.875rem',
              borderRadius: '0.5rem',
              backgroundColor: 'var(--color-primary)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '1rem',
              textDecoration: 'none',
            }}
          >
            Return to Login
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <Suspense fallback={<div>Loading...</div>}>
        <VerifyEmailContent />
      </Suspense>
    </main>
  );
}

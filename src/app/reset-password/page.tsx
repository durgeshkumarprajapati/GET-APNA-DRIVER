'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Alert } from '@/components/ui/alert';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!token) {
      setError('Invalid or missing password reset token.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setMessage('Password reset successful! Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred during password reset');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] p-8 rounded-2xl bg-surface-container border border-border shadow-xl">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-on-surface font-['Space_Grotesk']">
          Set New Password
        </h1>
        <p className="mt-1.5 text-sm text-on-surface-variant">
          Choose a secure new password for your account
        </p>
      </div>

      {error && (
        <Alert tone="error" className="mb-6">
          {error}
        </Alert>
      )}

      {message && (
        <Alert tone="success" className="mb-6">
          {message}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <FormField label="New Password">
          <Input
            type="password"
            required
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </FormField>

        <Button type="submit" isLoading={loading} disabled={!token} fullWidth size="lg">
          {loading ? 'Resetting password...' : 'Reset Password'}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-on-surface-variant">
        Back to{' '}
        <Link href="/login" className="text-primary font-bold hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Suspense fallback={<div className="text-on-surface-variant text-sm">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}

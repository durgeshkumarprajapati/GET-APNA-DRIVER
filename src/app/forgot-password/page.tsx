'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Alert } from '@/components/ui/alert';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/password/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit password reset request');
      }

      setMessage(
        data.message || 'If an account exists, password reset instructions have been sent.',
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#0a0e16]">
      <div className="w-full max-w-[420px] p-8 rounded-2xl bg-[#181c24] border border-[#262a33] shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
            Forgot Password
          </h1>
          <p className="mt-1.5 text-sm text-[#bccac0]">
            Enter your email address to reset your password
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
          <FormField label="Email Address">
            <Input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>

          <Button type="submit" isLoading={loading} fullWidth size="lg">
            {loading ? 'Submitting...' : 'Send Reset Instructions'}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-[#bccac0]">
          Remembered your password?{' '}
          <Link href="/login" className="text-[#68dba9] font-bold hover:text-[#85f8c4]">
            Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}

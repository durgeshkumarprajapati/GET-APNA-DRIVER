'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Alert } from '@/components/ui/alert';

export default function PhoneAuthPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'REQUEST' | 'VERIFY'>('REQUEST');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        throw new Error(data.error || 'Failed to request OTP');
      }

      setMessage(data.message || 'OTP dispatched to your phone number');
      setStep('VERIFY');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred while requesting OTP');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, otp }),
      });

      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        throw new Error(data.error || 'OTP verification failed');
      }

      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to verify OTP');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-[420px] p-8 rounded-2xl bg-surface-container border border-border shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-on-surface font-['Space_Grotesk']">
            {step === 'REQUEST' ? 'Phone Sign In' : 'Verify OTP'}
          </h1>
          <p className="mt-1.5 text-sm text-on-surface-variant">
            {step === 'REQUEST'
              ? 'Enter your phone number in E.164 format (e.g. +919876543210)'
              : `Enter the 6-digit code sent to ${phoneNumber}`}
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

        {step === 'REQUEST' ? (
          <form onSubmit={handleRequestOtp} className="flex flex-col gap-5">
            <FormField label="Mobile Phone Number">
              <Input
                type="tel"
                required
                placeholder="+919876543210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </FormField>

            <Button type="submit" isLoading={loading} fullWidth size="lg">
              {loading ? 'Sending OTP...' : 'Send OTP Code'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
            <FormField label="Enter 6-Digit OTP">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="text-lg tracking-[0.25em] text-center"
              />
            </FormField>

            <Button type="submit" isLoading={loading} fullWidth size="lg">
              {loading ? 'Verifying...' : 'Verify OTP'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => {
                setStep('REQUEST');
                setError(null);
                setMessage(null);
              }}
            >
              Change Phone Number
            </Button>
          </form>
        )}

        <p className="mt-8 text-center text-sm text-on-surface-variant">
          Back to{' '}
          <Link href="/login" className="text-primary font-bold hover:underline">
            Standard Login
          </Link>
        </p>
      </div>
    </main>
  );
}

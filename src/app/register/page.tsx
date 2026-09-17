'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/i18n/context';
import { validateRegistrationForm } from '@/shared/validation/auth-form-validation';
import { LanguageSelector } from '@/components/ui/language-selector';

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  // Role Selection ('customer' | 'driver')
  const roleParam = searchParams.get('role');
  const urlRole =
    roleParam === 'driver' || roleParam === 'pilot'
      ? 'driver'
      : roleParam === 'customer'
        ? 'customer'
        : null;
  const [overrideRole, setOverrideRole] = useState<'customer' | 'driver' | null>(null);
  const selectedRole = overrideRole ?? urlRole ?? 'customer';
  const setSelectedRole = (role: 'customer' | 'driver') => setOverrideRole(role);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(true);

  // UI Flow State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [redirectPath, setRedirectPath] = useState<string>('/driver/onboarding');

  // Password Strength Calculation
  const hasMinLen = password.length >= 6;
  const hasUpperLower = /[A-Z]/.test(password) || /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  let entropyScore = 0;
  if (password.length > 0) {
    if (hasMinLen) entropyScore++;
    if (hasUpperLower) entropyScore++;
    if (hasSpecial || password.length >= 8) entropyScore++;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateRegistrationForm({
      firstName,
      lastName,
      email,
      phone,
      password,
      referralCode,
      termsAgreed,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const fullFullName =
        `${firstName} ${lastName}`.trim() ||
        (selectedRole === 'driver' ? 'Chauffeur Pilot' : 'Valued Customer');
      const accountType = selectedRole === 'driver' ? 'DRIVER' : 'CUSTOMER';

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          accountType,
          fullName: fullFullName,
          phoneNumber: phone
            ? phone.startsWith('+91')
              ? phone
              : `+91${phone.replace(/\s+/g, '')}`
            : undefined,
          referralCode: referralCode.trim() || undefined,
        }),
      });

      const data = (await res.json()) as {
        message?: string;
        error?: string;
        redirectRoute?: string;
      };

      if (!res.ok) {
        throw new Error(
          data.error || data.message || 'Registration failed. Please check your details.',
        );
      }

      const targetRedirect =
        data.redirectRoute || (accountType === 'DRIVER' ? '/driver/onboarding' : '/customer');
      setRedirectPath(targetRedirect);
      setShowCompletionModal(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred during registration.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0f131c] min-h-screen text-[#dfe2ee] font-sans antialiased selection:bg-[#68dba9] selection:text-[#003825] flex flex-col justify-between">
      {/* HEADER BAR */}
      <header className="fixed top-0 w-full z-50 bg-[#0a0e16]/85 backdrop-blur-xl border-b border-[#262a33]">
        <div className="h-16 w-full px-4 sm:px-8 max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-[#25a475] flex items-center justify-center text-[#00311f] font-bold shadow-[0_0_12px_rgba(37,164,117,0.3)] transition-transform group-hover:scale-105">
              <span className="material-symbols-outlined text-[22px]">directions_car</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base text-[#dfe2ee] tracking-tight leading-none font-['Space_Grotesk']">
                Get Apna Driver
              </span>
              <span className="text-[9px] font-bold text-[#68dba9] tracking-widest mt-0.5 uppercase font-['Space_Grotesk']">
                Chauffeur Mobility OS
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <LanguageSelector variant="dark" />

            <div className="h-5 w-px bg-[#262a33] hidden sm:block" />

            <Link
              href="/login"
              className="text-xs font-mono text-[#bccac0] hover:text-[#dfe2ee] px-3 py-1.5 rounded-lg border border-[#262a33] hover:border-[#68dba9] transition-all flex items-center gap-1.5"
            >
              <span>{t('auth.register.signInLink', { defaultValue: 'Sign In' })}</span>
              <span className="material-symbols-outlined text-sm">login</span>
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 w-full pt-24 pb-12 px-4 sm:px-6 max-w-7xl mx-auto flex flex-col items-center justify-center gap-8">
        {/* HERO TITLE & SUBTITLE */}
        <div className="text-center max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#181c24] border border-[#262a33] shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-pulse" />
            <span className="text-[11px] font-mono text-[#68dba9] font-bold uppercase tracking-wider">
              {selectedRole === 'driver'
                ? 'High-Earning Driver Partner Portal'
                : 'Premier Chauffeur Concierge'}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-[#dfe2ee] tracking-tight font-['Space_Grotesk']">
            {selectedRole === 'driver'
              ? 'Join India’s Vetted Driver Fleet'
              : t('auth.register.title', { defaultValue: 'Create Your Account' })}
          </h1>

          <p className="text-xs sm:text-sm text-[#87948b] leading-relaxed max-w-lg mx-auto">
            {selectedRole === 'driver'
              ? 'Drive private luxury cars, VIP airport transfers, and outstation trips with zero commission and instant daily settlements.'
              : t('auth.register.subtitle', {
                  defaultValue:
                    'Book verified professional chauffeurs or join as a high-earning driver partner across Delhi NCR.',
                })}
          </p>
        </div>

        {/* DUAL ROLE SELECTOR CARDS */}
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* CUSTOMER ROLE CARD */}
          <div
            onClick={() => setSelectedRole('customer')}
            className={`p-5 sm:p-6 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-4 ${
              selectedRole === 'customer'
                ? 'bg-[#181c24] border-[#68dba9] shadow-[0_0_20px_rgba(37,164,117,0.2)]'
                : 'bg-[#181c24]/60 border-[#262a33] hover:border-[#363b47] opacity-80 hover:opacity-100'
            }`}
          >
            {selectedRole === 'customer' && (
              <div className="absolute top-0 right-0 bg-[#68dba9] text-[#003825] font-mono text-[10px] font-bold px-3 py-0.5 rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">check_circle</span>
                Selected
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00344d] text-[#70d2ff] flex items-center justify-center border border-[#004d73] shrink-0">
                <span className="material-symbols-outlined text-xl">person_pin</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-[#70d2ff] uppercase font-bold tracking-wider">
                  Passenger Account
                </span>
                <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Customer / Ride Booker
                </h3>
              </div>
            </div>

            <p className="text-xs text-[#bccac0] leading-relaxed">
              Book hourly chauffeurs for personal cars, airport transfers, and intercity travel with
              zero surge pricing.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#262a33] text-[11px] font-mono text-[#87948b]">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#68dba9]">check</span>
                Zero Surge Pricing
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#68dba9]">check</span>
                Verified Drivers
              </span>
            </div>
          </div>

          {/* DRIVER PARTNER ROLE CARD */}
          <div
            onClick={() => setSelectedRole('driver')}
            className={`p-5 sm:p-6 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-4 ${
              selectedRole === 'driver'
                ? 'bg-[#181c24] border-[#68dba9] shadow-[0_0_20px_rgba(37,164,117,0.2)]'
                : 'bg-[#181c24]/60 border-[#262a33] hover:border-[#363b47] opacity-80 hover:opacity-100'
            }`}
          >
            {selectedRole === 'driver' && (
              <div className="absolute top-0 right-0 bg-[#68dba9] text-[#003825] font-mono text-[10px] font-bold px-3 py-0.5 rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">check_circle</span>
                Selected
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#25a475]/20 text-[#68dba9] flex items-center justify-center border border-[#25a475] shrink-0">
                <span className="material-symbols-outlined text-xl">id_card</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-[#68dba9] uppercase font-bold tracking-wider">
                  Professional Driver
                </span>
                <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Driver Partner (Earn ₹45k/mo)
                </h3>
              </div>
            </div>

            <p className="text-xs text-[#bccac0] leading-relaxed">
              Drive customer-owned luxury cars and outstation missions with zero platform commission
              and daily IMPS payouts.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#262a33] text-[11px] font-mono text-[#87948b]">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#68dba9]">check</span>
                Instant Daily Payouts
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#68dba9]">check</span>
                Zero Commission Tier
              </span>
            </div>
          </div>
        </div>

        {/* REGISTRATION FORM CARD */}
        <div className="w-full max-w-lg bg-[#181c24] border border-[#262a33] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="border-b border-[#262a33] pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                {selectedRole === 'driver' ? 'Driver Registration' : 'Customer Account Details'}
              </h2>
              <p className="text-xs text-[#87948b] font-mono mt-0.5">
                Enter your details to create your secure account profile
              </p>
            </div>
            <span className="px-2.5 py-1 rounded bg-[#0a0e16] border border-[#262a33] text-[10px] font-mono font-bold text-[#68dba9]">
              {selectedRole.toUpperCase()}
            </span>
          </div>

          {/* Google Sign-up Button */}
          <a
            href="/api/auth/google"
            className="w-full py-3 px-4 bg-[#0a0e16] hover:bg-[#262a33] rounded-xl font-mono text-xs text-[#dfe2ee] transition-all flex items-center justify-center gap-3 border border-[#262a33]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                fill="#4285F4"
              />
              <path
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                fill="#34A853"
              />
              <path
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                fill="#FBBC05"
              />
              <path
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                fill="#EA4335"
              />
            </svg>
            <span>Continue with Google</span>
          </a>

          <div className="relative my-2 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full bg-[#262a33] h-px" />
            </div>
            <span className="relative bg-[#181c24] px-3 font-mono text-[10px] uppercase tracking-wider text-[#87948b]">
              Or fill credentials manually
            </span>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-[#3b0909] border border-[#93000a] text-[#ff8e8e] text-xs font-mono flex items-start gap-2.5">
              <span className="material-symbols-outlined text-base text-red-400 shrink-0">
                error
              </span>
              <span>{error}</span>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-mono text-[#87948b] uppercase tracking-wider block">
                  First Name
                </label>
                <div className="flex items-center bg-[#0a0e16] rounded-xl px-3.5 py-2.5 border border-[#262a33] focus-within:border-[#68dba9] transition-colors">
                  <span className="material-symbols-outlined text-sm text-[#87948b] mr-2.5">
                    person
                  </span>
                  <input
                    required
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Rajesh"
                    className="w-full bg-transparent text-[#dfe2ee] text-xs placeholder:text-[#87948b] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-[#87948b] uppercase tracking-wider block">
                  Last Name
                </label>
                <div className="flex items-center bg-[#0a0e16] rounded-xl px-3.5 py-2.5 border border-[#262a33] focus-within:border-[#68dba9] transition-colors">
                  <input
                    required
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Kumar"
                    className="w-full bg-transparent text-[#dfe2ee] text-xs placeholder:text-[#87948b] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Mobile Contact */}
            <div className="space-y-1">
              <label className="text-xs font-mono text-[#87948b] uppercase tracking-wider block">
                {t('auth.register.phoneLabel', { defaultValue: 'Mobile Number' })}
              </label>
              <div className="flex items-center bg-[#0a0e16] rounded-xl px-3.5 py-2.5 border border-[#262a33] focus-within:border-[#68dba9] transition-colors">
                <span className="font-mono text-xs text-[#68dba9] font-bold mr-3 flex items-center gap-1 shrink-0">
                  <span>🇮🇳</span> +91
                </span>
                <input
                  required
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="98765 43210"
                  className="w-full bg-transparent text-[#dfe2ee] text-xs font-mono placeholder:text-[#87948b] focus:outline-none"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1">
              <label className="text-xs font-mono text-[#87948b] uppercase tracking-wider block">
                {t('auth.register.emailLabel', { defaultValue: 'Email Address' })}
              </label>
              <div className="flex items-center bg-[#0a0e16] rounded-xl px-3.5 py-2.5 border border-[#262a33] focus-within:border-[#68dba9] transition-colors">
                <span className="material-symbols-outlined text-sm text-[#87948b] mr-2.5">
                  mail
                </span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-transparent text-[#dfe2ee] text-xs placeholder:text-[#87948b] focus:outline-none"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="text-xs font-mono text-[#87948b] uppercase tracking-wider block">
                {t('auth.register.passwordLabel', { defaultValue: 'Password' })}
              </label>
              <div className="flex items-center bg-[#0a0e16] rounded-xl px-3.5 py-2.5 border border-[#262a33] focus-within:border-[#68dba9] transition-colors">
                <span className="material-symbols-outlined text-sm text-[#87948b] mr-2.5">
                  lock
                </span>
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-[#dfe2ee] text-xs font-mono placeholder:text-[#87948b] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[#87948b] hover:text-[#dfe2ee] ml-2"
                >
                  <span className="material-symbols-outlined text-sm">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>

              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1 bg-[#262a33] rounded-full overflow-hidden flex gap-0.5">
                      <div
                        className={`h-full transition-all duration-300 ${entropyScore >= 1 ? 'w-1/3 bg-[#ff8e8e]' : 'w-0'}`}
                      />
                      <div
                        className={`h-full transition-all duration-300 ${entropyScore >= 2 ? 'w-1/3 bg-[#ffe662]' : 'w-0'}`}
                      />
                      <div
                        className={`h-full transition-all duration-300 ${entropyScore >= 3 ? 'w-1/3 bg-[#68dba9]' : 'w-0'}`}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-[#68dba9] font-bold">
                      {entropyScore >= 3 ? 'Strong' : entropyScore >= 2 ? 'Moderate' : 'Weak'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Optional Referral Code */}
            <div className="space-y-1">
              <label className="text-xs font-mono text-[#87948b] uppercase tracking-wider block">
                Referral Code (Optional)
              </label>
              <div className="flex items-center bg-[#0a0e16] rounded-xl px-3.5 py-2.5 border border-[#262a33] focus-within:border-[#68dba9] transition-colors">
                <span className="material-symbols-outlined text-sm text-[#87948b] mr-2.5">
                  card_giftcard
                </span>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="e.g. REF-APNA2026"
                  className="w-full bg-transparent text-[#68dba9] text-xs font-mono uppercase placeholder:text-[#87948b] focus:outline-none"
                />
              </div>
            </div>

            {/* Terms Checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer pt-2">
              <input
                required
                type="checkbox"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded bg-[#0a0e16] border-[#262a33] accent-[#25a475] cursor-pointer"
              />
              <span className="text-xs text-[#87948b] leading-relaxed">
                {t('auth.register.termsAgreement', {
                  defaultValue: 'I agree to the Terms of Service and Privacy Policy',
                })}
              </span>
            </label>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#25a475] hover:bg-[#1f8760] text-[#00311f] font-bold rounded-xl text-xs font-mono transition-all flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(37,164,117,0.25)] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-[#00311f] border-t-transparent rounded-full animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <span>{t('auth.register.submit', { defaultValue: 'Create Account' })}</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="text-center pt-2 border-t border-[#262a33]">
            <span className="text-xs text-[#87948b]">
              {t('auth.register.alreadyHaveAccount', { defaultValue: 'Already have an account?' })}{' '}
              <Link href="/login" className="text-[#68dba9] font-bold hover:underline">
                {t('auth.register.signInLink', { defaultValue: 'Sign In' })}
              </Link>
            </span>
          </div>
        </div>
      </main>

      {/* COMPLETION MODAL */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#181c24] border border-[#25a475] rounded-2xl p-6 sm:p-8 space-y-6 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-[#25a475]/20 border-2 border-[#68dba9] flex items-center justify-center mx-auto text-[#68dba9]">
              <span className="material-symbols-outlined text-3xl">verified</span>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono text-[#68dba9] uppercase tracking-wider font-bold">
                Account Clearance Granted
              </span>
              <h3 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                {selectedRole === 'driver'
                  ? 'Chauffeur Account Created!'
                  : 'Welcome to Get Apna Driver!'}
              </h3>
              <p className="text-xs text-[#87948b] leading-relaxed">
                {selectedRole === 'driver'
                  ? 'Your profile is ready. Proceed to upload your driving license and complete your KYC verification.'
                  : 'Your customer account is initialized and ready for instant chauffeur bookings.'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0a0e16] border border-[#262a33] flex items-center justify-between text-xs font-mono">
              <div className="text-left">
                <span className="text-[#dfe2ee] font-bold block">
                  {selectedRole === 'driver'
                    ? '₹500 Onboarding Credit'
                    : '₹200 Welcome Booking Credit'}
                </span>
                <span className="text-[10px] text-[#68dba9]">Applied to your wallet</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#25a475]/20 text-[#68dba9] text-[10px] font-bold">
                ACTIVE
              </span>
            </div>

            <button
              onClick={() => router.push(redirectPath)}
              className="w-full py-3 px-4 bg-[#25a475] hover:bg-[#1f8760] text-[#00311f] font-bold rounded-xl text-xs font-mono transition-colors flex items-center justify-center gap-2"
            >
              <span>
                {selectedRole === 'driver' ? 'Continue to KYC Wizard' : 'Go to Booking Console'}
              </span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="w-full bg-[#0a0e16] py-4 border-t border-[#262a33]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-[#87948b]">
          <span>&copy; 2026 Get Apna Driver. Enterprise Mobility Systems.</span>
          <div className="flex items-center gap-2 text-[#68dba9]">
            <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-pulse" />
            <span>Encrypted Session & Auth Rails</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0f131c] text-[#dfe2ee] flex items-center justify-center font-mono text-xs">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#68dba9] animate-ping" />
            <span>Loading Registration Terminal...</span>
          </div>
        </div>
      }
    >
      <RegisterFormContent />
    </Suspense>
  );
}

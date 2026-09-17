'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/i18n/context';
import { isValidIndianMobile } from '@/shared/validation/auth-form-validation';
import { useToast, ToastViewport } from '@/components/ui/toast';

const GOOGLE_OAUTH_ERROR_MESSAGES: Record<string, string> = {
  google_not_configured:
    'Google sign-in is not available right now. Please try mobile or email login.',
  google_invalid_callback: 'Google sign-in was interrupted. Please try again.',
  google_auth_failed: 'Google sign-in failed. Please try again, or use mobile or email login.',
};

export default function LoginPage() {
  const { t, locale, setLocale } = useTranslation();

  // Auth Mode: OTP vs Email
  const [authMode, setAuthMode] = useState<'otp' | 'email'>('otp');

  // OTP Form State
  const OTP_LENGTH = 6;
  const [otpStep, setOtpStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [otpExpiresAt, setOtpExpiresAt] = useState<Date | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const isPhoneValid = isValidIndianMobile(phone);
  const otpExpired = otpStep === 'otp' && otpExpiresAt !== null && remainingSeconds <= 0;

  // Email Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [trustDevice, setTrustDevice] = useState(true);

  // Recovery Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState('');
  const [resetSubmitted, setResetSubmitted] = useState(false);

  // General Loading & Error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google OAuth
  const [connectingToGoogle, setConnectingToGoogle] = useState(false);
  const { toast, showToast, dismissToast } = useToast();

  // Check if session already exists — if so, send to server-authoritative role redirect landing page
  useEffect(() => {
    let isMounted = true;
    const checkExistingSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.principal) {
            // Hard navigation to '/' so server-authoritative dashboard-redirect-service resolves role destination
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.href = '/';
          }
        }
      } catch {
        // Unauthenticated — stay on login page
      }
    };
    void checkExistingSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Surface Google sign-in failure callback errors as toast
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('error');
    if (oauthError) {
      showToast(
        GOOGLE_OAUTH_ERROR_MESSAGES[oauthError] ?? 'Google sign-in failed. Please try again.',
        'error',
      );
      params.delete('error');
      params.delete('reason');
      const cleanUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
      window.history.replaceState(null, '', cleanUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleLogin = () => {
    if (connectingToGoogle) return;
    setConnectingToGoogle(true);
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = '/api/auth/google';
  };

  // OTP expiry countdown
  useEffect(() => {
    if (otpStep !== 'otp' || !otpExpiresAt) return;
    const tick = () => {
      setRemainingSeconds(Math.max(0, Math.round((otpExpiresAt.getTime() - Date.now()) / 1000)));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [otpStep, otpExpiresAt]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleOtpDigitChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    if (digit && index < OTP_LENGTH - 1) {
      document.getElementById(`otp-input-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const newDigits = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) newDigits[i] = pasted[i];
    setOtpDigits(newDigits);
    document.getElementById(`otp-input-${Math.min(pasted.length, OTP_LENGTH - 1)}`)?.focus();
  };

  const handleSendOtp = async () => {
    if (!isPhoneValid || sendingOtp) return;
    setError(null);
    setSendingOtp(true);
    try {
      const fullPhone = `+91${phone.replace(/\D/g, '')}`;
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullPhone }),
      });
      const data = (await res.json()) as { message?: string; error?: string; expiresAt?: string };
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to send OTP. Please try again.');
      }
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setOtpExpiresAt(data.expiresAt ? new Date(data.expiresAt) : new Date(Date.now() + 180_000));
      setOtpStep('otp');
      setResendCooldown(30);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleChangeNumber = () => {
    setOtpStep('phone');
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    setOtpExpiresAt(null);
    setError(null);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Hard navigation to '/' so server-authoritative redirect service routes by role
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected authentication error occurred.');
      setLoading(false);
    }
  };

  const handleOtpSubmit = async () => {
    if (otpExpired || otpDigits.some((d) => !d)) return;
    setError(null);
    setLoading(true);

    try {
      const otpCode = otpDigits.join('');
      const fullPhone = `+91${phone.replace(/\D/g, '')}`;
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullPhone, otp: otpCode }),
      });

      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Invalid OTP code.');
      }

      // Hard navigation to '/' for server-authoritative role redirecting
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid OTP code.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f131c] text-[#dfe2ee] font-sans antialiased flex flex-col justify-between selection:bg-[#68dba9] selection:text-[#003825]">
      {/* Top Bar */}
      <header className="w-full bg-[#0a0e16]/80 backdrop-blur-xl border-b border-[#262a33] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-[#262a33] flex items-center justify-center text-[#68dba9] shadow-inner group-hover:bg-[#68dba9] group-hover:text-[#003825] transition-all duration-300">
              <span className="material-symbols-outlined text-xl font-bold">local_taxi</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base uppercase tracking-wider text-[#dfe2ee]">
                Get Apna Driver
              </span>
              <span className="text-[10px] font-mono text-[#87948b] hidden sm:inline-block">
                {t('auth.login.tagline')}
              </span>
            </div>
          </Link>

          {/* Language Selector Dropdown */}
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-[#87948b]">language</span>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as Parameters<typeof setLocale>[0])}
              className="bg-[#181c24] border border-[#262a33] text-[#dfe2ee] text-xs font-mono py-1.5 px-2.5 rounded-lg focus:outline-none focus:border-[#68dba9] cursor-pointer"
              aria-label="Select language"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="gu">ગુજરાતી (Gujarati)</option>
              <option value="mr">मराठी (Marathi)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="kn">ಕನ್ನಡ (Kannada)</option>
              <option value="ml">മലയാളം (Malayalam)</option>
              <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
              <option value="bn">বাংলা (Bengali)</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Brand Identity (Desktop Only) */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-6 pr-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#181c24] rounded-full border border-[#262a33] w-fit">
              <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-pulse"></span>
              <span className="text-xs font-mono text-[#68dba9] font-medium uppercase tracking-wider">
                Chauffeur Mobility Terminal
              </span>
            </div>

            <h1 className="font-bold text-4xl text-[#dfe2ee] tracking-tight leading-tight">
              {t('auth.login.heroTitle')}
            </h1>

            <p className="text-sm text-[#87948b] leading-relaxed max-w-md">
              {t('auth.login.heroSubtitle')}
            </p>

            <div className="space-y-4 pt-2 border-t border-[#262a33]/60">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#181c24] text-[#68dba9] border border-[#262a33]">
                  <span className="material-symbols-outlined text-lg">verified_user</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#dfe2ee] uppercase tracking-wider">
                    Verified Drivers
                  </h4>
                  <p className="text-xs text-[#87948b]">
                    Aadhaar &amp; commercial RTO licensing background checked.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#181c24] text-[#68dba9] border border-[#262a33]">
                  <span className="material-symbols-outlined text-lg">schedule</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#dfe2ee] uppercase tracking-wider">
                    On-Demand &amp; Outstation
                  </h4>
                  <p className="text-xs text-[#87948b]">
                    Hourly chauffeur services and intercity journeys.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#181c24] text-[#68dba9] border border-[#262a33]">
                  <span className="material-symbols-outlined text-lg">security</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#dfe2ee] uppercase tracking-wider">
                    Secure Access Rails
                  </h4>
                  <p className="text-xs text-[#87948b]">
                    Encrypted session tokens &amp; zero-trust authentication.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Clean Authentication Card */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <div className="bg-[#181c24] border border-[#262a33] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
              {/* Header */}
              <div>
                <h2 className="font-bold text-2xl text-[#dfe2ee]">{t('auth.login.title')}</h2>
                <p className="text-xs text-[#87948b] mt-1">{t('auth.login.tagline')}</p>
              </div>

              {/* Mode Toggle Tabs */}
              <div className="grid grid-cols-2 p-1 bg-[#0a0e16] rounded-xl border border-[#262a33]">
                <button
                  type="button"
                  onClick={() => setAuthMode('otp')}
                  className={`py-2 px-3 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold transition-all ${
                    authMode === 'otp'
                      ? 'bg-[#262a33] text-[#68dba9] shadow-sm'
                      : 'text-[#87948b] hover:text-[#dfe2ee]'
                  }`}
                >
                  {t('auth.login.useOtpTab', { defaultValue: 'Mobile OTP' })}
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('email')}
                  className={`py-2 px-3 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold transition-all ${
                    authMode === 'email'
                      ? 'bg-[#262a33] text-[#68dba9] shadow-sm'
                      : 'text-[#87948b] hover:text-[#dfe2ee]'
                  }`}
                >
                  {t('auth.login.usePasswordTab', { defaultValue: 'Email & Password' })}
                </button>
              </div>

              {/* General Error Alert */}
              {error && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs font-mono flex items-start gap-2.5"
                >
                  <span className="material-symbols-outlined text-base text-red-400 shrink-0">
                    error
                  </span>
                  <span>{error}</span>
                </div>
              )}

              {/* Mode 1: Mobile + OTP Flow */}
              {authMode === 'otp' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="inputPhone"
                      className="text-xs font-mono text-[#87948b] uppercase tracking-wider block"
                    >
                      {t('auth.login.phoneLabel')}
                    </label>
                    <div
                      className={`flex items-center bg-[#0a0e16] rounded-xl px-3.5 py-3 border transition-colors ${
                        phoneTouched && !isPhoneValid
                          ? 'border-red-500/60'
                          : 'border-[#262a33] focus-within:border-[#68dba9]'
                      }`}
                    >
                      <span className="text-sm font-mono text-[#dfe2ee] mr-2 pr-2 border-r border-[#262a33] flex items-center gap-1.5">
                        <span>🇮🇳</span>
                        <span>+91</span>
                      </span>
                      <input
                        id="inputPhone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        disabled={otpStep === 'otp'}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        onBlur={() => setPhoneTouched(true)}
                        placeholder={t('auth.login.phonePlaceholder')}
                        aria-invalid={phoneTouched && !isPhoneValid}
                        aria-describedby="phone-validation-hint"
                        className="bg-transparent text-[#dfe2ee] font-mono text-sm focus:outline-none w-full placeholder-[#87948b]/60 disabled:opacity-60"
                      />
                      {isPhoneValid && (
                        <span className="material-symbols-outlined text-[#68dba9] text-base shrink-0 ml-1">
                          check_circle
                        </span>
                      )}
                    </div>
                    {phoneTouched && !isPhoneValid && (
                      <p id="phone-validation-hint" className="text-[11px] text-red-400">
                        {t('auth.login.invalidPhone')}
                      </p>
                    )}
                  </div>

                  {otpStep === 'phone' && (
                    <button
                      type="button"
                      disabled={!isPhoneValid || sendingOtp}
                      onClick={() => void handleSendOtp()}
                      className="w-full min-h-[48px] py-3 px-4 bg-[#68dba9] hover:bg-[#85f8c4] disabled:opacity-40 disabled:cursor-not-allowed text-[#003825] rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(104,219,169,0.15)]"
                    >
                      <span>
                        {sendingOtp ? t('auth.login.sendingOtp') : t('auth.login.sendOtp')}
                      </span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  )}

                  {/* Step 2: OTP Entry */}
                  {otpStep === 'otp' && (
                    <div className="space-y-4 pt-2">
                      <div className="bg-[#0a0e16] p-4 rounded-xl border border-[#262a33] space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono text-[#68dba9] font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">
                              mark_email_read
                            </span>
                            OTP Sent
                          </span>
                          <button
                            type="button"
                            onClick={handleChangeNumber}
                            className="font-mono text-[#87948b] hover:text-[#dfe2ee] underline"
                          >
                            {t('auth.login.changeNumber')}
                          </button>
                        </div>

                        <div>
                          <label className="text-[11px] font-mono text-[#87948b] block mb-2">
                            Enter 6-Digit Verification Code
                          </label>
                          <div className="grid grid-cols-6 gap-2">
                            {otpDigits.map((digit, idx) => (
                              <input
                                key={idx}
                                id={`otp-input-${idx}`}
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                                maxLength={1}
                                disabled={otpExpired}
                                value={digit}
                                onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                                onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                                onPaste={handleOtpPaste}
                                aria-label={`OTP digit ${idx + 1}`}
                                className="w-full text-center bg-[#181c24] text-[#dfe2ee] font-mono text-lg py-2.5 rounded-lg border border-[#262a33] focus:outline-none focus:border-[#68dba9] disabled:opacity-50"
                              />
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between font-mono text-[11px] text-[#87948b]">
                          {otpExpired ? (
                            <span className="text-red-400">{t('auth.login.otpExpired')}</span>
                          ) : (
                            <span>
                              {t('auth.login.otpExpiresIn', {
                                seconds: `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`,
                              })}
                            </span>
                          )}
                          <button
                            type="button"
                            disabled={resendCooldown > 0 || sendingOtp}
                            onClick={() => void handleSendOtp()}
                            className="text-[#87948b] hover:text-[#dfe2ee] disabled:opacity-50"
                          >
                            {resendCooldown > 0
                              ? t('auth.login.resendIn', { seconds: String(resendCooldown) })
                              : t('auth.otp.resendCode')}
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={loading || otpExpired || otpDigits.some((d) => !d)}
                        onClick={() => void handleOtpSubmit()}
                        className="w-full min-h-[48px] py-3 px-4 bg-[#68dba9] hover:bg-[#85f8c4] disabled:opacity-40 disabled:cursor-not-allowed text-[#003825] rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(104,219,169,0.15)]"
                      >
                        <span>
                          {loading ? t('auth.login.verifying') : t('auth.login.verifyAndEnter')}
                        </span>
                        <span className="material-symbols-outlined text-sm">login</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Mode 2: Email & Password Flow */}
              {authMode === 'email' && (
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="inputEmail"
                      className="text-xs font-mono text-[#87948b] uppercase tracking-wider block"
                    >
                      {t('auth.login.emailLabel')}
                    </label>
                    <div className="flex items-center bg-[#0a0e16] rounded-xl px-3.5 py-3 border border-[#262a33] focus-within:border-[#68dba9]">
                      <span className="material-symbols-outlined text-[#87948b] text-base mr-2.5">
                        mail
                      </span>
                      <input
                        id="inputEmail"
                        type="email"
                        inputMode="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('auth.login.emailPlaceholder')}
                        className="bg-transparent text-[#dfe2ee] font-mono text-sm focus:outline-none w-full placeholder-[#87948b]/60"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="inputPassword"
                        className="text-xs font-mono text-[#87948b] uppercase tracking-wider block"
                      >
                        {t('auth.login.passwordLabel')}
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgotModal(true)}
                        className="text-[11px] font-mono text-[#68dba9] hover:underline"
                      >
                        {t('auth.login.forgotPassword')}
                      </button>
                    </div>
                    <div className="flex items-center bg-[#0a0e16] rounded-xl px-3.5 py-3 border border-[#262a33] focus-within:border-[#68dba9]">
                      <span className="material-symbols-outlined text-[#87948b] text-base mr-2.5">
                        key
                      </span>
                      <input
                        id="inputPassword"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('auth.login.passwordPlaceholder')}
                        className="bg-transparent text-[#dfe2ee] font-mono text-sm focus:outline-none w-full placeholder-[#87948b]/60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={
                          showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')
                        }
                        className="text-[#87948b] hover:text-[#dfe2ee] ml-2"
                      >
                        <span className="material-symbols-outlined text-base">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-[#87948b]">
                      <input
                        type="checkbox"
                        checked={trustDevice}
                        onChange={(e) => setTrustDevice(e.target.checked)}
                        className="w-4 h-4 rounded bg-[#0a0e16] accent-[#68dba9]"
                      />
                      <span>{t('auth.login.trustDevice')}</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full min-h-[48px] py-3 px-4 bg-[#68dba9] hover:bg-[#85f8c4] disabled:opacity-40 disabled:cursor-not-allowed text-[#003825] rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(104,219,169,0.15)]"
                  >
                    <span>{loading ? t('auth.login.verifying') : t('auth.login.submit')}</span>
                    <span className="material-symbols-outlined text-sm">login</span>
                  </button>
                </form>
              )}

              {/* Divider */}
              <div className="relative text-center my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full bg-[#262a33] h-px"></div>
                </div>
                <span className="relative bg-[#181c24] px-3 font-mono text-[10px] uppercase tracking-wider text-[#87948b]">
                  {t('auth.login.orDivider')}
                </span>
              </div>

              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={connectingToGoogle}
                className="w-full min-h-[48px] py-3 px-4 bg-[#0a0e16] hover:bg-[#262a33] disabled:opacity-60 disabled:cursor-not-allowed rounded-xl font-mono text-xs uppercase tracking-wider text-[#dfe2ee] transition-all flex items-center justify-center gap-3 border border-[#262a33]"
              >
                {connectingToGoogle ? (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-[#dfe2ee] border-t-transparent" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                      fill="#4285F4"
                    ></path>
                    <path
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                      fill="#34A853"
                    ></path>
                    <path
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      fill="#FBBC05"
                    ></path>
                    <path
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      fill="#EA4335"
                    ></path>
                  </svg>
                )}
                <span>
                  {connectingToGoogle
                    ? t('auth.login.connectingGoogle')
                    : t('auth.login.continueWithGoogle')}
                </span>
              </button>

              {/* Registration Link */}
              <div className="text-center pt-2">
                <p className="text-xs text-[#87948b]">
                  {t('auth.login.newHere')}{' '}
                  <Link
                    href="/register"
                    className="text-[#68dba9] font-semibold hover:underline ml-1"
                  >
                    {t('auth.login.createAccount')}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0e16]/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#181c24] p-6 rounded-2xl border border-[#262a33] shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#68dba9]">
                <span className="material-symbols-outlined text-base">lock_reset</span>
                <span className="text-xs font-mono uppercase tracking-wider font-bold">
                  {t('auth.login.forgotPassword')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-[#87948b] hover:text-[#dfe2ee]"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <p className="text-xs text-[#87948b] leading-relaxed">
              Enter your registered email address or mobile number to receive reset instructions.
            </p>

            <div className="space-y-1">
              <input
                id="recoveryInput"
                type="text"
                value={recoveryInput}
                onChange={(e) => setRecoveryInput(e.target.value)}
                placeholder="name@company.com or +91..."
                className="w-full bg-[#0a0e16] border border-[#262a33] px-4 py-2.5 rounded-xl text-sm text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setResetSubmitted(true);
                setTimeout(() => {
                  setShowForgotModal(false);
                  setResetSubmitted(false);
                }, 1200);
              }}
              className="w-full py-2.5 bg-[#68dba9] text-[#003825] font-mono text-xs font-bold rounded-xl uppercase tracking-wider shadow hover:bg-[#85f8c4] transition-all"
            >
              {resetSubmitted ? 'Link Dispatched!' : 'Send Recovery Link'}
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full border-t border-[#262a33] bg-[#0a0e16]/90 py-4 px-4 sm:px-6 text-xs font-mono text-[#87948b]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <span>&copy; 2026 GET APNA DRIVER. All rights reserved.</span>
          <div className="flex items-center gap-4 text-[11px]">
            <span>TLS 1.3 Encrypted</span>
            <span>•</span>
            <span className="text-[#68dba9]">Verified Dispatch Rails</span>
          </div>
        </div>
      </footer>

      <ToastViewport toast={toast} onDismiss={dismissToast} />
    </div>
  );
}

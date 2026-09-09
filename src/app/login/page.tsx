'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
export default function LoginPage() {
  // Test Harness State
  const [testHarnessState, setTestHarnessState] = useState<
    'default' | 'error' | 'pending' | 'suspended'
  >('default');

  // Role Preview Active Tab
  const [activeRoleTab, setActiveRoleTab] = useState<'customer' | 'driver' | 'admin'>('customer');

  // Auth Mode: OTP vs Email
  const [authMode, setAuthMode] = useState<'otp' | 'email'>('otp');

  // OTP Form State
  const [phone, setPhone] = useState('98201 44829');
  const [otpDigits, setOtpDigits] = useState(['7', '4', '1', '9', '', '']);
  const [resendTimer, setResendTimer] = useState(32);
  const [otpDispatched] = useState(true);

  // Email Form State
  const [email, setEmail] = useState('vip.dispatch@apnadriver.in');
  const [password, setPassword] = useState('UltraSecureFleetToken2025#');
  const [showPassword, setShowPassword] = useState(false);
  const [trustDevice, setTrustDevice] = useState(true);

  // Recovery Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState('');
  const [resetSubmitted, setResetSubmitted] = useState(false);

  // General Loading & Error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP Timer Countdown
  useEffect(() => {
    if (!otpDispatched || resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [otpDispatched, resendTimer]);

  const handleOtpDigitChange = (index: number, val: string) => {
    if (val.length > 1) val = val.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = val;
    setOtpDigits(newDigits);

    // Auto advance focus
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
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

      // Hard navigation ensures the server re-reads the freshly-set session cookie.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/';
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected authentication error occurred.');
      }
      setLoading(false);
    }
  };

  const handleOtpSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      const otpCode = otpDigits.join('');
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: `+91${phone.replace(/\s+/g, '')}`, otp: otpCode }),
      });

      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        throw new Error(data.error || 'Invalid telemetry OTP token.');
      }

      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid OTP code.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f131c] text-[#dfe2ee] font-sans antialiased">
      {/* Fixed Top Navigation Header */}
      <header className="fixed top-0 w-full z-50 bg-[#0f131c]/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.45)] border-b border-[#262a33]">
        <div className="h-16 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 shrink-0">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#262a33] flex items-center justify-center text-[#68dba9]">
                <span className="material-symbols-outlined text-lg font-bold">local_taxi</span>
              </div>
              <span className="font-display font-bold text-lg uppercase tracking-tight text-[#dfe2ee]">
                Get Apna Driver
              </span>
            </Link>

            <div className="hidden xl:flex items-center gap-2 bg-[#0a0e16] px-3 py-1 rounded-full border border-[#3d4a42]/30 text-xs font-mono">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#68dba9] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#68dba9]"></span>
              </span>
              <span className="text-[#bccac0]">
                256-Bit SSL Auth Rails • ISO/IEC 27001 Certified
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-[#0a0e16] p-1 rounded-full border border-[#3d4a42]/20 text-xs font-mono">
            <span className="px-3 py-1.5 uppercase tracking-wider bg-[#262a33] text-[#dfe2ee] font-semibold rounded-lg shadow-[0_0_12px_rgba(5,150,105,0.25)]">
              Unified Login
            </span>
            <Link
              href="/register"
              className="px-3 py-1.5 rounded-lg uppercase tracking-wider text-[#bccac0] hover:text-[#dfe2ee] hover:bg-[#181c24] transition-colors"
            >
              Role Selection
            </Link>
            <Link
              href="/register"
              className="px-3 py-1.5 rounded-lg uppercase tracking-wider text-[#bccac0] hover:text-[#dfe2ee] hover:bg-[#181c24] transition-colors"
            >
              Customer Onboarding
            </Link>
            <Link
              href="/driver/onboarding"
              className="px-3 py-1.5 rounded-lg uppercase tracking-wider text-[#bccac0] hover:text-[#dfe2ee] hover:bg-[#181c24] transition-colors"
            >
              Driver KYC Wizard
            </Link>
            <Link
              href="/admin/drivers"
              className="px-3 py-1.5 rounded-lg uppercase tracking-wider text-[#bccac0] hover:text-[#dfe2ee] hover:bg-[#181c24] transition-colors"
            >
              Admin Vault
            </Link>
          </nav>

          <div className="flex items-center gap-4 shrink-0">
            <button
              aria-label="Toggle system theme"
              className="p-2 rounded-lg text-[#bccac0] hover:text-[#dfe2ee] hover:bg-[#181c24] transition-colors flex items-center justify-center"
              type="button"
            >
              <span className="material-symbols-outlined text-lg">dark_mode</span>
            </button>
            <div className="relative flex items-center">
              <Image
                alt="Profile"
                width={32}
                height={32}
                unoptimized
                className="w-8 h-8 rounded-full object-cover ring-1 ring-[#68dba9]/40"
                src="https://lh3.googleusercontent.com/aida/AEtjO1WxTO3NWRJYA6Ib8PoLewFtFM192nboytw0dzwqWk0TIlG-EKLuweHK3XEBiNQPnRKauOOKRhAitZ0MSszwg63MMJtw0CZH0PQuLqh2eFIwV8e0k116pkMkpiHFZjv6K7_YcBF4yrXC9ju4097kjEeBXeIHsRM6FJqVKl32MXq3hJit4vg6qpYolsOCW13MleiFjFXW7na0Il8qSvKmcsODjxcQAHKnbfL_TtjEDmBexYKDZrzUvLjYLyQ"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="pt-20 pb-12 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Interactive Test Harness Controller Strip */}
        <div className="w-full mb-6 bg-[#0a0e16] p-3 rounded-xl border border-[#262a33] shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#68dba9] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#68dba9]"></span>
            </span>
            <span className="text-[#bccac0] uppercase tracking-wider font-bold">
              Interactive Test Harness:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(['default', 'error', 'pending', 'suspended'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setTestHarnessState(st)}
                className={`px-3 py-1 rounded text-xs font-mono uppercase tracking-wider transition-all ${
                  testHarnessState === st
                    ? 'bg-[#262a33] text-[#68dba9] font-bold border border-[#68dba9]/50 shadow'
                    : 'bg-[#181c24] text-[#bccac0] hover:text-[#dfe2ee]'
                }`}
              >
                {st === 'default'
                  ? 'Normal'
                  : st === 'error'
                    ? 'Auth Error'
                    : st === 'pending'
                      ? 'KYC Pending'
                      : 'Access Suspended'}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Alert Banner based on Test Harness */}
        {testHarnessState !== 'default' && (
          <div className="mb-6">
            {testHarnessState === 'error' && (
              <div className="p-4 rounded-xl bg-[#93000a]/40 border border-red-500/50 shadow-lg flex items-start gap-3">
                <span className="material-symbols-outlined text-red-400 text-xl shrink-0">
                  gpp_bad
                </span>
                <div className="space-y-0.5">
                  <h5 className="font-display font-bold text-sm text-red-300">
                    Authentication Protocol Fault
                  </h5>
                  <p className="text-xs text-[#dfe2ee]">
                    Invalid cryptographic key or security code combination. 2 attempts remaining
                    prior to session throttle.
                  </p>
                </div>
              </div>
            )}
            {testHarnessState === 'pending' && (
              <div className="p-4 rounded-xl bg-[#181c24] border border-[#68dba9]/40 shadow-lg flex items-start gap-3">
                <span className="material-symbols-outlined text-[#68dba9] text-xl shrink-0">
                  pending_actions
                </span>
                <div className="space-y-0.5">
                  <h5 className="font-display font-bold text-sm text-[#68dba9]">
                    Driver KYC Verification in Progress
                  </h5>
                  <p className="text-xs text-[#dfe2ee]">
                    Your commercial driver partner profile is under human audit by the sovereign
                    logistics desk. Estimated clearance: 45 minutes.
                  </p>
                </div>
              </div>
            )}
            {testHarnessState === 'suspended' && (
              <div className="p-4 rounded-xl bg-[#93000a] border border-red-400 shadow-lg flex items-start gap-3">
                <span className="material-symbols-outlined text-[#ffdad6] text-xl shrink-0">
                  block
                </span>
                <div className="space-y-0.5">
                  <h5 className="font-display font-bold text-sm text-[#ffdad6]">
                    Access Suspended: Policy Exception
                  </h5>
                  <p className="text-xs text-[#ffdad6]">
                    This operator account has been placed into precautionary lock due to sudden
                    telematics divergence. Contact compliance.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dual-Panel Operational Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Hero & Telemetry Column (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-[#0a0e16] p-6 sm:p-8 lg:p-10 rounded-2xl border border-[#262a33] relative overflow-hidden shadow-2xl">
            {/* Background Ambient Glows */}
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#68dba9]/10 blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-[#0053db]/20 blur-3xl pointer-events-none"></div>

            {/* Top Header & VIP Network Badge */}
            <div className="relative z-10 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#262a33] rounded-full shadow-sm">
                  <span
                    className="material-symbols-outlined text-[#68dba9] text-xs"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified
                  </span>
                  <span className="text-[10px] font-mono text-[#dfe2ee] uppercase tracking-wider font-bold">
                    Verified Chauffeur Network
                  </span>
                </span>
                <span className="text-[10px] font-mono text-[#bccac0] bg-[#181c24] px-3 py-1 rounded border border-[#262a33]">
                  ISO/IEC 27001
                </span>
              </div>

              <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-[#dfe2ee] max-w-xl leading-tight">
                Sovereign Ground Logistics{' '}
                <span className="text-[#68dba9]">&amp; Chauffeur Terminal</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#bccac0] max-w-lg leading-relaxed">
                High-velocity unified portal for high-net-worth customers, elite licensed operators,
                and national fleet dispatch operations.
              </p>
            </div>

            {/* Role Preview Interactive Hub */}
            <div className="relative z-10 my-6 bg-[#181c24] p-5 rounded-xl border border-[#262a33] shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono text-[#bccac0] uppercase tracking-wider font-bold">
                  Target Scope Preview
                </span>
                <span className="text-[10px] font-mono text-[#68dba9] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#68dba9] animate-pulse"></span>
                  Dynamic Role Routing
                </span>
              </div>

              {/* Tab Bar */}
              <div className="grid grid-cols-3 gap-2 bg-[#0a0e16] p-1 rounded-lg mb-4 border border-[#262a33]">
                {(['customer', 'driver', 'admin'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveRoleTab(tab)}
                    className={`py-1.5 px-3 rounded font-mono text-xs uppercase tracking-wider text-center transition-all ${
                      activeRoleTab === tab
                        ? 'bg-[#262a33] text-[#68dba9] font-bold shadow'
                        : 'text-[#bccac0] hover:text-[#dfe2ee]'
                    }`}
                  >
                    {tab === 'customer'
                      ? 'Customer'
                      : tab === 'driver'
                        ? 'Driver Partner'
                        : 'Ops Admin'}
                  </button>
                ))}
              </div>

              {/* Dynamic Content */}
              {activeRoleTab === 'customer' && (
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#31353e] rounded-lg shrink-0 text-[#68dba9]">
                    <span className="material-symbols-outlined text-2xl">directions_car</span>
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-[#dfe2ee] mb-1">
                      VIP On-Demand &amp; Outstation
                    </h4>
                    <p className="text-xs text-[#bccac0] leading-relaxed">
                      Instant booking with background-verified professional drivers. Full trip
                      telemetry, real-time chauffeur vetting scores, and corporate invoice rails.
                    </p>
                    <div className="mt-2 flex items-center gap-3 font-mono text-[11px] text-[#68dba9]">
                      <span>99.8% Availability</span>
                      <span>•</span>
                      <span>Avg ETA: 4.2 Min</span>
                    </div>
                  </div>
                </div>
              )}

              {activeRoleTab === 'driver' && (
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#31353e] rounded-lg shrink-0 text-[#68dba9]">
                    <span className="material-symbols-outlined text-2xl">radar</span>
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-[#dfe2ee] mb-1">
                      Partner Shift Telemetry &amp; Radar
                    </h4>
                    <p className="text-xs text-[#bccac0] leading-relaxed">
                      Geo-spatial heatmap dispatch, automated RazorpayX instant shift settlements,
                      duty-time monitoring, and Aadhaar-backed digital credentials.
                    </p>
                    <div className="mt-2 flex items-center gap-3 font-mono text-[11px] text-[#68dba9]">
                      <span>Daily Payouts Enabled</span>
                      <span>•</span>
                      <span>24/7 SOS Hotlink</span>
                    </div>
                  </div>
                </div>
              )}

              {activeRoleTab === 'admin' && (
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#31353e] rounded-lg shrink-0 text-[#b4c5ff]">
                    <span className="material-symbols-outlined text-2xl">shield_person</span>
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-[#dfe2ee] mb-1">
                      Enterprise Fleet Ops &amp; Governance
                    </h4>
                    <p className="text-xs text-[#bccac0] leading-relaxed">
                      Central KYC verification pipeline, fleet exception escalations, audit vault,
                      and dynamic pricing overrides with multi-sig auth.
                    </p>
                    <div className="mt-2 flex items-center gap-3 font-mono text-[11px] text-[#b4c5ff]">
                      <span>Zero-Trust Vault</span>
                      <span>•</span>
                      <span>Audit Trail Active</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tri-Feature Trust Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10 pt-2">
              <div className="p-4 bg-[#181c24] rounded-xl border border-[#262a33]">
                <div className="flex items-center gap-1.5 text-[#68dba9] mb-1">
                  <span className="material-symbols-outlined text-sm">security</span>
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold">
                    Tier-4 Vetting
                  </span>
                </div>
                <p className="font-display font-bold text-xs text-[#dfe2ee] mb-1">
                  Military Screening
                </p>
                <p className="text-[11px] text-[#bccac0]">
                  Criminal record, fingerprint, and RTO licensing certified.
                </p>
              </div>

              <div className="p-4 bg-[#181c24] rounded-xl border border-[#262a33]">
                <div className="flex items-center gap-1.5 text-[#68dba9] mb-1">
                  <span className="material-symbols-outlined text-sm">sensors</span>
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold">
                    Live In-Flight
                  </span>
                </div>
                <p className="font-display font-bold text-xs text-[#dfe2ee] mb-1">
                  Telematics &amp; SOS
                </p>
                <p className="text-[11px] text-[#bccac0]">
                  Continuous geofence monitoring &amp; silent emergency telemetry.
                </p>
              </div>

              <div className="p-4 bg-[#181c24] rounded-xl border border-[#262a33]">
                <div className="flex items-center gap-1.5 text-[#68dba9] mb-1">
                  <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold">
                    Instant Ledger
                  </span>
                </div>
                <p className="font-display font-bold text-xs text-[#dfe2ee] mb-1">
                  Direct RazorpayX
                </p>
                <p className="text-[11px] text-[#bccac0]">
                  Sub-second UPI and IMPS dispatch clearing for drivers.
                </p>
              </div>
            </div>

            {/* Security Status Footer Indicator */}
            <div className="mt-6 pt-4 border-t border-[#262a33] flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-[#bccac0] relative z-10">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#68dba9] text-sm">lock</span>
                <span>
                  All sessions encrypted via{' '}
                  <strong className="text-[#dfe2ee]">TLS 1.3 &amp; SHA-256</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#68dba9] text-sm">dns</span>
                <span>
                  Node Gateway: <strong className="text-[#dfe2ee]">BOM-01 Secure Rail</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Authentication Interactive Console (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-center bg-[#181c24] p-6 sm:p-8 lg:p-10 rounded-2xl border border-[#262a33] shadow-2xl relative">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono tracking-widest text-[#68dba9] uppercase font-bold">
                  Identity Access Management
                </span>
                <span className="text-[10px] font-mono text-[#bccac0]">v4.19.2</span>
              </div>
              <h2 className="font-display font-bold text-2xl text-[#dfe2ee]">Welcome Back</h2>
              <p className="text-xs text-[#bccac0] mt-1">
                Access your verified mobility workspace or partner console.
              </p>
            </div>

            {/* Auth Method Selector Tabs */}
            <div className="flex p-1 bg-[#0a0e16] rounded-lg mb-6 border border-[#262a33]">
              <button
                type="button"
                onClick={() => setAuthMode('otp')}
                className={`w-1/2 py-2 rounded font-mono text-xs uppercase tracking-wider text-center transition-all ${
                  authMode === 'otp'
                    ? 'bg-[#262a33] text-[#dfe2ee] font-bold shadow'
                    : 'text-[#bccac0] hover:text-[#dfe2ee]'
                }`}
              >
                Mobile Number + OTP
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('email')}
                className={`w-1/2 py-2 rounded font-mono text-xs uppercase tracking-wider text-center transition-all ${
                  authMode === 'email'
                    ? 'bg-[#262a33] text-[#dfe2ee] font-bold shadow'
                    : 'text-[#bccac0] hover:text-[#dfe2ee]'
                }`}
              >
                Email &amp; Password
              </button>
            </div>

            {/* General Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-[#93000a]/30 border border-red-500/40 text-[#ffdad6] text-xs font-mono">
                {error}
              </div>
            )}

            {/* AUTH FORM: Mobile + OTP Workflow */}
            {authMode === 'otp' && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <label
                    htmlFor="inputPhone"
                    className="text-[10px] font-mono text-[#bccac0] uppercase tracking-wider block"
                  >
                    Registered Phone Number
                  </label>
                  <div className="flex items-center bg-[#0a0e16] rounded-lg px-4 py-2.5 border border-[#262a33] focus-within:border-[#68dba9]">
                    <div className="flex items-center gap-1 pr-3 mr-3 border-r border-[#3d4a42]/40 text-[#dfe2ee] font-mono text-sm">
                      <span className="font-medium">🇮🇳 +91</span>
                    </div>
                    <input
                      id="inputPhone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter 10-digit number"
                      className="bg-transparent text-[#dfe2ee] font-mono text-sm focus:outline-none w-full placeholder-[#87948b]"
                    />
                    <span className="material-symbols-outlined text-[#68dba9] text-base ml-2">
                      verified
                    </span>
                  </div>
                  <p className="text-[10px] text-[#bccac0]">
                    Driver partners and VIP customers receive high-priority 4-digit token.
                  </p>
                </div>

                {/* OTP Drawer */}
                <div className="bg-[#262a33] p-4 rounded-xl space-y-4 border border-[#3d4a42]/40 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#68dba9] uppercase tracking-wider font-bold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">mark_email_read</span> OTP
                      Dispatched
                    </span>
                    <button
                      type="button"
                      onClick={() => setPhone('')}
                      className="text-[10px] font-mono text-[#bccac0] hover:text-[#68dba9] underline"
                    >
                      Change Number
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-[#bccac0] uppercase tracking-wider block mb-2">
                      Enter 6-Digit Telemetry Token
                    </label>
                    <div className="grid grid-cols-6 gap-2">
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`otp-input-${idx}`}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          className="w-full text-center bg-[#0a0e16] text-[#dfe2ee] font-mono text-lg py-2 rounded-lg border border-[#3d4a42] focus:outline-none focus:border-[#68dba9]"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between font-mono text-[10px] text-[#bccac0]">
                    <span>
                      Resend Token in:{' '}
                      <strong className="text-[#68dba9]">
                        00:{resendTimer < 10 ? `0${resendTimer}` : resendTimer}
                      </strong>
                    </span>
                    <button
                      type="button"
                      disabled={resendTimer > 0}
                      onClick={() => setResendTimer(30)}
                      className="text-[#bccac0] hover:text-[#dfe2ee] disabled:opacity-50"
                    >
                      Resend Code
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleOtpSubmit}
                  className="w-full py-3 px-6 bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(104,219,169,0.25)] flex items-center justify-center gap-2"
                >
                  <span>{loading ? 'Verifying...' : 'Verify & Enter Workspace'}</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            )}

            {/* AUTH FORM: Email & Password Workflow */}
            {authMode === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-5">
                <div className="space-y-1">
                  <label
                    htmlFor="inputEmail"
                    className="text-[10px] font-mono text-[#bccac0] uppercase tracking-wider block"
                  >
                    Enterprise Work Email
                  </label>
                  <div className="flex items-center bg-[#0a0e16] rounded-lg px-4 py-2.5 border border-[#262a33] focus-within:border-[#68dba9]">
                    <span className="material-symbols-outlined text-[#87948b] text-base mr-3">
                      alternate_email
                    </span>
                    <input
                      id="inputEmail"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="bg-transparent text-[#dfe2ee] font-mono text-sm focus:outline-none w-full placeholder-[#87948b]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="inputPassword"
                      className="text-[10px] font-mono text-[#bccac0] uppercase tracking-wider"
                    >
                      Access Secret
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-[10px] font-mono text-[#68dba9] hover:underline"
                    >
                      Forgot Secret?
                    </button>
                  </div>
                  <div className="flex items-center bg-[#0a0e16] rounded-lg px-4 py-2.5 border border-[#262a33] focus-within:border-[#68dba9]">
                    <span className="material-symbols-outlined text-[#87948b] text-base mr-3">
                      vpn_key
                    </span>
                    <input
                      id="inputPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••••••"
                      className="bg-transparent text-[#dfe2ee] font-mono text-sm focus:outline-none w-full placeholder-[#87948b]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[#bccac0] hover:text-[#dfe2ee]"
                    >
                      <span className="material-symbols-outlined text-base">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={trustDevice}
                      onChange={(e) => setTrustDevice(e.target.checked)}
                      className="w-4 h-4 rounded bg-[#0a0e16] accent-[#68dba9]"
                    />
                    <span className="text-[#bccac0]">Trust this terminal for 30 days</span>
                  </label>
                  <span className="font-mono text-[10px] text-[#bccac0]">SSO Protected</span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-6 bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(104,219,169,0.25)] flex items-center justify-center gap-2"
                >
                  <span>{loading ? 'Authenticating...' : 'Authenticate Session'}</span>
                  <span className="material-symbols-outlined text-sm">lock_open</span>
                </button>
              </form>
            )}

            {/* Divider */}
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full bg-[#262a33] h-px"></div>
              </div>
              <span className="relative bg-[#181c24] px-3 font-mono text-[10px] uppercase tracking-wider text-[#87948b]">
                Federated Sovereign Auth
              </span>
            </div>

            {/* Google Workspace Button */}
            <a
              href="/api/auth/google"
              className="w-full py-2.5 px-4 bg-[#0a0e16] hover:bg-[#262a33] rounded-lg font-mono text-xs uppercase tracking-wider text-[#dfe2ee] transition-all flex items-center justify-center gap-3 border border-[#262a33]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              <span>Continue with Google Workspace</span>
            </a>

            {/* Register Link */}
            <div className="mt-6 pt-3 text-center bg-[#0a0e16]/50 p-2.5 rounded-lg border border-[#262a33]">
              <p className="text-xs text-[#bccac0]">
                Don&apos;t have verified access yet?{' '}
                <Link
                  href="/register"
                  className="text-[#68dba9] font-semibold hover:underline ml-1"
                >
                  Select your role &amp; begin KYC
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Active Operations Live Monitor Strip */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex items-center justify-between shadow-md">
            <div>
              <span className="text-[10px] font-mono text-[#bccac0] uppercase tracking-wider block">
                Chauffeurs Online
              </span>
              <span className="font-display font-bold text-xl text-[#dfe2ee]">1,842</span>
            </div>
            <div className="p-2.5 bg-[#262a33] rounded-lg text-[#68dba9]">
              <span className="material-symbols-outlined text-lg">person_pin_circle</span>
            </div>
          </div>

          <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex items-center justify-between shadow-md">
            <div>
              <span className="text-[10px] font-mono text-[#bccac0] uppercase tracking-wider block">
                Real-Time Dispatch Rate
              </span>
              <span className="font-display font-bold text-xl text-[#68dba9]">99.4%</span>
            </div>
            <div className="p-2.5 bg-[#262a33] rounded-lg text-[#68dba9]">
              <span className="material-symbols-outlined text-lg">speed</span>
            </div>
          </div>

          <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex items-center justify-between shadow-md">
            <div>
              <span className="text-[10px] font-mono text-[#bccac0] uppercase tracking-wider block">
                Settlement Latency
              </span>
              <span className="font-display font-bold text-xl text-[#dfe2ee]">1.8s</span>
            </div>
            <div className="p-2.5 bg-[#262a33] rounded-lg text-[#4edea3]">
              <span className="material-symbols-outlined text-lg">bolt</span>
            </div>
          </div>

          <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex items-center justify-between shadow-md">
            <div>
              <span className="text-[10px] font-mono text-[#bccac0] uppercase tracking-wider block">
                SOS Telemetry Vault
              </span>
              <span className="font-display font-bold text-xl text-[#dfe2ee]">Standby</span>
            </div>
            <div className="p-2.5 bg-[#262a33] rounded-lg text-[#68dba9]">
              <span className="material-symbols-outlined text-lg">health_and_safety</span>
            </div>
          </div>
        </div>
      </main>

      {/* Password Recovery Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0e16]/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#262a33] p-6 rounded-xl border border-[#68dba9]/40 shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#68dba9]">
                <span className="material-symbols-outlined text-base">lock_reset</span>
                <span className="text-xs font-mono uppercase tracking-wider font-bold">
                  Credential Recovery
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-[#bccac0] hover:text-[#dfe2ee]"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <h3 className="font-display font-bold text-lg text-[#dfe2ee]">Reset Terminal Secret</h3>
            <p className="text-xs text-[#bccac0] leading-relaxed">
              Provide your verified mobility identity handle (email or telephone). Our automated
              multi-sig pipeline will dispatch an authorization challenge.
            </p>

            <div className="space-y-1">
              <label
                htmlFor="recoveryInput"
                className="text-[10px] font-mono text-[#bccac0] uppercase tracking-wider"
              >
                Account Identifier
              </label>
              <input
                id="recoveryInput"
                type="text"
                value={recoveryInput}
                onChange={(e) => setRecoveryInput(e.target.value)}
                placeholder="driver-id@apnadriver.in or +91..."
                className="w-full bg-[#0a0e16] border border-[#3d4a42] px-4 py-2 rounded-lg text-sm text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setResetSubmitted(true);
                setTimeout(() => {
                  setShowForgotModal(false);
                  setResetSubmitted(false);
                }, 1000);
              }}
              className="w-full py-2.5 bg-[#68dba9] text-[#003825] font-mono text-xs font-bold rounded-lg uppercase tracking-wider shadow hover:bg-[#85f8c4] transition-all"
            >
              {resetSubmitted ? 'Token Dispatched!' : 'Transmit Verification Link'}
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full border-t border-[#262a33] bg-[#0a0e16] py-6 px-4 sm:px-6 lg:px-8 text-xs font-mono text-[#bccac0]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>&copy; 2026 Get Apna Driver Inc. Enterprise Mobility Systems.</span>
          <div className="flex items-center gap-4">
            <span className="text-[#68dba9]">Tier-4 Sovereign Compliance</span>
            <span>Security Protocol v4.19</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

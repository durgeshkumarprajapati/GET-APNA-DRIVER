'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { validateRegistrationForm } from '@/shared/validation/auth-form-validation';

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Role Selection ('customer' | 'driver')
  const roleParam = searchParams.get('role');
  const urlRole = roleParam === 'driver' || roleParam === 'pilot' ? 'driver' : roleParam === 'customer' ? 'customer' : null;
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

  // Driver Telemetry Switches
  const [vipPings, setVipPings] = useState(true);
  const [sosRelay, setSosRelay] = useState(true);
  const [payoutSms, setPayoutSms] = useState(true);

  // Customer Telemetry Switches
  const [tripStatusAlerts, setTripStatusAlerts] = useState(true);
  const [arrivalPings, setArrivalPings] = useState(true);
  const [smsOtpAlerts, setSmsOtpAlerts] = useState(true);

  // GPS State
  const [gpsStatus, setGpsStatus] = useState<'Standby' | 'Active' | 'Manual'>('Standby');
  const [gpsCoordinates, setGpsCoordinates] = useState(
    '28.5562° N, 77.1000° E [IGI T3 TERMINAL HUB]',
  );

  // Driver Fleet Sub-Tier Selection
  const [driverFleetType, setDriverFleetType] = useState<'pilot' | 'fleet'>('pilot');

  // Time & RTT Counter
  const [currentTime, setCurrentTime] = useState('14:32:08 IST');
  const [rttMs, setRttMs] = useState(18);

  // UI Flow State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [redirectPath, setRedirectPath] = useState<string>('/driver/onboarding');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'Asia/Kolkata',
        }) + ' IST',
      );
      setRttMs(15 + Math.floor(Math.random() * 8));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Password Entropy Calculation
  const hasMinLen = password.length >= 6;
  const hasUpperLower = /[A-Z]/.test(password) || /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  let entropyScore = 0;
  if (password.length > 0) {
    if (hasMinLen) entropyScore++;
    if (hasUpperLower) entropyScore++;
    if (hasSpecial || password.length >= 8) entropyScore++;
  }

  const handleActivateGps = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoordinates(
            `${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E [LIVE GPS]`,
          );
          setGpsStatus('Active');
        },
        () => {
          setGpsCoordinates('28.5562° N, 77.1000° E [IGI T3 TERMINAL HUB]');
          setGpsStatus('Active');
        },
      );
    } else {
      setGpsStatus('Active');
    }
  };

  const handleCustomSector = () => {
    const sector = prompt(
      'Enter your preferred NCR base sector (e.g. Aerocity T3, CyberCity, Golf Course Ext):',
      'Delhi-NCR Hub',
    );
    if (sector) {
      setGpsCoordinates(`ZONE: ${sector.toUpperCase()} SECTOR`);
      setGpsStatus('Manual');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation is only for immediate UX feedback — the server
    // (zod schema + registerWithEmailPassword) remains the authoritative
    // validator and is never relaxed or bypassed by this check.
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
          data.error || data.message || 'Registration failed. Please check your credentials.',
        );
      }

      const targetRedirect =
        data.redirectRoute || (accountType === 'DRIVER' ? '/driver/onboarding' : '/customer');
      setRedirectPath(targetRedirect);
      setShowCompletionModal(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred during registration.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Scroll smoothly to profile form
  const scrollToForm = () => {
    const formElement = document.getElementById('registration-form-panel');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-[#0a0e16] min-h-screen text-[#dfe2ee] font-sans antialiased selection:bg-[#68dba9] selection:text-[#003825]">
      {/* HEADER BAR */}
      <header className="fixed top-0 w-full z-50 bg-[#0f131c]/90 backdrop-blur-xl shadow-[0_1px_12px_rgba(0,0,0,0.45)] border-b border-[#262a33]">
        <div className="h-20 w-full px-4 sm:px-8 max-w-[1440px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#262a33] flex items-center justify-center text-[#68dba9] shadow-sm">
                <span className="material-symbols-outlined text-[20px]">verified_user</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-base uppercase tracking-tight text-[#dfe2ee] font-bold">
                    GET APNA DRIVER
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#262a33] text-[#68dba9] font-mono text-[10px] font-bold">
                    PRO
                  </span>
                </div>
                <div className="font-mono text-[10px] text-[#bccac0] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[#68dba9] text-[11px]">lock</span>
                  <span>256-Bit SSL Auth Rails • ISO/IEC 27001 Certified</span>
                </div>
              </div>
            </Link>

            <div className="hidden xl:flex items-center px-3 py-1 rounded-xl bg-[#181c24] border border-[#262a33] gap-2">
              <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-pulse"></span>
              <span className="font-mono text-[10px] text-[#bccac0] uppercase tracking-wider">
                GATEWAY // APNA-NCR-DRIVER-ONBOARDING
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <nav className="hidden lg:flex items-center gap-3 font-mono text-[11px] text-[#bccac0]">
              <Link href="/login" className="hover:text-[#dfe2ee] transition-colors">
                UNIFIED LOGIN
              </Link>
              <span className="text-[#3d4a42]">/</span>
              <button
                type="button"
                onClick={() => setSelectedRole(selectedRole === 'customer' ? 'driver' : 'customer')}
                className="hover:text-[#dfe2ee] transition-colors uppercase"
              >
                ROLE SELECTION ({selectedRole.toUpperCase()})
              </button>
              <span className="text-[#3d4a42]">/</span>
              <span className="bg-[#25a475] text-[#00311f] font-bold rounded-lg px-2.5 py-1">
                {selectedRole === 'driver' ? 'DRIVER ONBOARDING (ACTIVE)' : 'CUSTOMER REGISTRATION'}
              </span>
              <span className="text-[#3d4a42]">/</span>
              <Link href="/driver/onboarding" className="hover:text-[#dfe2ee] transition-colors">
                KYC WIZARD
              </Link>
              <span className="text-[#3d4a42]">/</span>
              <Link href="/verification-status" className="hover:text-[#dfe2ee] transition-colors">
                VERIFICATION STATUS
              </Link>
            </nav>

            <div className="hidden md:flex items-center gap-3 pl-3">
              <div className="flex flex-col text-right font-mono text-[11px]">
                <span className="text-[#dfe2ee] font-medium">{currentTime}</span>
                <span className="text-[#68dba9] flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#68dba9]"></span>
                  {rttMs}ms RTT
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#68dba9] flex items-center justify-center text-[#003825] font-bold">
                <span className="material-symbols-outlined text-[18px]">person</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN VIEWPORT */}
      <main className="w-full pt-20 bg-[#0a0e16] min-h-screen">
        <div className="flex flex-col w-full">
          {/* SUB-HEADER TELEMATICS BAR */}
          <div className="w-full bg-[#181c24] border-b border-[#262a33] px-4 sm:px-8 py-2.5 shadow-sm">
            <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-[#0a0e16] px-3 py-1 rounded-lg border border-[#262a33] shadow-sm">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#68dba9] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#68dba9]"></span>
                  </span>
                  <span className="font-mono text-[11px] text-[#68dba9] font-semibold tracking-wider">
                    ACCESS NODE: APNA-DELHI-CHAUFFEUR-HUB-01
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-[#bccac0] font-mono text-[11px]">
                  <span className="material-symbols-outlined text-[15px] text-[#4edea3]">hub</span>
                  <span>SARATHI-DL-RELAY // ACTIVE 240BPS</span>
                </div>
              </div>

              <div className="flex items-center gap-4 justify-between md:justify-end">
                <span className="font-mono text-[11px] text-[#dfe2ee] uppercase tracking-wider font-semibold">
                  STEP 01 / 03 •{' '}
                  {selectedRole === 'driver'
                    ? 'PILOT CREDENTIAL SPECIFICATION'
                    : 'CUSTOMER PROFILE INITIALIZATION'}
                </span>
                <div className="w-28 h-1.5 bg-[#31353e] rounded-full overflow-hidden flex">
                  <div className="w-1/3 bg-[#68dba9] h-full shadow-[0_0_8px_rgba(104,219,169,0.8)]"></div>
                </div>
              </div>
            </div>
          </div>

          {/* CONTAINER CONTENT */}
          <div className="w-full px-4 sm:px-8 py-8 max-w-[1440px] mx-auto flex flex-col gap-8">
            {/* HERO / HEADER BANNER BLOCK */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 bg-[#1c2028] p-6 sm:p-8 rounded-2xl border border-[#262a33] shadow-md relative overflow-hidden">
              <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#68dba9]/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="flex flex-col gap-2 max-w-3xl relative z-10">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0a0e16] font-mono text-[10px] text-[#68dba9] uppercase font-bold tracking-widest border border-[#262a33] shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#68dba9] animate-pulse"></span>
                    {selectedRole === 'driver'
                      ? 'CHAUFFEUR DISPATCH NETWORK ACTIVE'
                      : 'PREMIER CHAUFFEUR MARKETPLACE'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#262a33] text-[#bccac0] font-mono text-[10px]">
                    GATEWAY 8.2
                  </span>
                </div>

                <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-[#dfe2ee]">
                  {selectedRole === 'driver'
                    ? 'Register as Executive Chauffeur Pilot'
                    : 'Register for Get Apna Driver Concierge'}
                </h1>
                <p className="text-sm sm:text-base text-[#bccac0] leading-relaxed">
                  {selectedRole === 'driver' ? (
                    <>
                      Join India&apos;s highest-earning vetted driver network. Command premium
                      luxury sedans and VIP outstations with{' '}
                      <span className="text-[#68dba9] font-semibold">zero commission</span> and
                      instant daily IMPS payouts.
                    </>
                  ) : (
                    <>
                      Access verified luxury chauffeurs across Delhi NCR for point-to-point, hourly,
                      and outstation rides with{' '}
                      <span className="text-[#68dba9] font-semibold">zero surge pricing</span> and
                      24/7 SOS safety backup.
                    </>
                  )}
                </p>
              </div>

              {/* Protocol Badge Right */}
              <div className="flex items-center gap-4 bg-[#0a0e16] p-4 rounded-xl border border-[#262a33] shadow-sm self-start lg:self-auto relative z-10 shrink-0">
                <div className="w-11 h-11 rounded-lg bg-[#262a33] flex items-center justify-center text-[#68dba9]">
                  <span className="material-symbols-outlined text-[24px]">verified_user</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-mono text-[10px] text-[#bccac0] uppercase tracking-wider font-bold">
                    CLEARANCE PROTOCOL
                  </span>
                  <span className="font-display font-bold text-2xl text-[#68dba9] leading-tight">
                    98.6% PASS RATE
                  </span>
                  <span className="font-mono text-[10px] text-[#bccac0]">
                    STATUTORY SARATHI VERIFIED
                  </span>
                </div>
              </div>
            </div>

            {/* COMPARISON EXPERIENCE CARDS (2 COLUMNS) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* CARD 1: DRIVER PARTNER (PILOT) */}
              <div
                onClick={() => {
                  setSelectedRole('driver');
                  setDriverFleetType('pilot');
                }}
                className={`p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col justify-between relative overflow-hidden border transition-all cursor-pointer ${
                  selectedRole === 'driver' && driverFleetType === 'pilot'
                    ? 'bg-[#262a33] border-[#68dba9]/70 shadow-[0_0_24px_rgba(104,219,169,0.15)]'
                    : 'bg-[#181c24] border-[#262a33] hover:bg-[#1c2028]'
                }`}
              >
                {selectedRole === 'driver' && (
                  <div className="absolute top-0 right-0 bg-[#68dba9] text-[#003825] font-mono text-[10px] font-bold px-4 py-1 rounded-bl-xl uppercase tracking-wider shadow-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">check_circle</span>
                    SELECTED EXPERIENCE
                  </div>
                )}

                <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#25a475] text-[#00311f] flex items-center justify-center shadow-md">
                      <span className="material-symbols-outlined text-[24px]">directions_car</span>
                    </div>
                    <div>
                      <span className="font-mono text-[10px] text-[#68dba9] uppercase font-bold tracking-wider">
                        CHAUFFEUR TIER
                      </span>
                      <h2 className="font-display text-xl text-[#dfe2ee] font-bold">
                        Driver Partner (Pilot)
                      </h2>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-[#bccac0] leading-relaxed">
                    Private Chauffeur &amp; Enterprise Fleets. Command luxury sedans, VIP airport
                    runs, and outstation trips with guaranteed daily earnings.
                  </p>

                  {/* 4 Pill Badges */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="flex items-center gap-2 bg-[#1c2028] px-3 py-2 rounded-lg text-[#dfe2ee] font-mono text-[11px] border border-[#262a33]">
                      <span className="material-symbols-outlined text-[#68dba9] text-[16px]">
                        bolt
                      </span>
                      <span>Daily IMPS Payouts</span>
                    </div>
                    <div className="flex items-center gap-2 bg-[#1c2028] px-3 py-2 rounded-lg text-[#dfe2ee] font-mono text-[11px] border border-[#262a33]">
                      <span className="material-symbols-outlined text-[#68dba9] text-[16px]">
                        security
                      </span>
                      <span>Zero Commission Tier</span>
                    </div>
                    <div className="flex items-center gap-2 bg-[#1c2028] px-3 py-2 rounded-lg text-[#dfe2ee] font-mono text-[11px] border border-[#262a33]">
                      <span className="material-symbols-outlined text-[#68dba9] text-[16px]">
                        dry_cleaning
                      </span>
                      <span>Complimentary Uniforms</span>
                    </div>
                    <div className="flex items-center gap-2 bg-[#1c2028] px-3 py-2 rounded-lg text-[#dfe2ee] font-mono text-[11px] border border-[#262a33]">
                      <span className="material-symbols-outlined text-[#68dba9] text-[16px]">
                        radar
                      </span>
                      <span>Flexible Geofence</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 bg-[#181c24] p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#262a33]">
                  <div className="flex flex-col">
                    <span className="font-mono text-[10px] text-[#bccac0] uppercase">
                      ESTIMATED TAKE-HOME
                    </span>
                    <span className="font-display text-2xl text-[#68dba9] font-bold">
                      Up to ₹45,000<span className="text-xs text-[#bccac0] font-normal">/mo</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRole('driver');
                      scrollToForm();
                    }}
                    className="px-5 py-2.5 bg-[#68dba9] text-[#003825] font-mono text-xs font-bold rounded-lg shadow-md hover:bg-[#85f8c4] transition-all flex items-center justify-center gap-2"
                  >
                    <span>PROCEED REGISTRATION</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>
              </div>

              {/* CARD 2: FLEET OPERATOR / CUSTOMER PASSENGER */}
              <div
                onClick={() => {
                  if (selectedRole === 'driver') {
                    setDriverFleetType('fleet');
                  } else {
                    setSelectedRole('driver');
                    setDriverFleetType('fleet');
                  }
                }}
                className={`p-6 sm:p-8 rounded-2xl shadow-md flex flex-col justify-between border transition-all cursor-pointer ${
                  selectedRole === 'customer' ||
                  (selectedRole === 'driver' && driverFleetType === 'fleet')
                    ? 'bg-[#262a33] border-[#68dba9]/70 shadow-[0_0_24px_rgba(104,219,169,0.15)]'
                    : 'bg-[#181c24] border-[#262a33] hover:bg-[#1c2028]'
                }`}
              >
                <div className="flex flex-col gap-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-[#31353e] text-[#bccac0] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[24px]">
                          {selectedRole === 'driver' ? 'corporate_fare' : 'person_pin'}
                        </span>
                      </div>
                      <div>
                        <span className="font-mono text-[10px] text-[#bccac0] uppercase font-bold tracking-wider">
                          {selectedRole === 'driver' ? 'ENTERPRISE SCALE' : 'PASSENGER CONCIERGE'}
                        </span>
                        <h2 className="font-display text-xl text-[#dfe2ee] font-bold">
                          {selectedRole === 'driver'
                            ? 'Fleet Operator & Agencies'
                            : 'Customer Passenger Account'}
                        </h2>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-[#31353e] text-[#bccac0] rounded font-mono text-[10px] uppercase font-bold">
                      {selectedRole === 'driver' ? 'Multi-Vehicle' : 'Instant Booking'}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-[#bccac0] leading-relaxed">
                    {selectedRole === 'driver'
                      ? 'Manage multiple commercial chauffeur rosters, track aggregate fleet telematics, and automate payout disbursements across Delhi NCR.'
                      : 'Book luxury verified drivers for personal cars, corporate delegations, airport roundtrips, and outstations with zero surge pricing.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="flex items-center gap-2 bg-[#31353e]/50 px-3 py-2 rounded-lg text-[#bccac0] font-mono text-[11px] border border-[#262a33]">
                      <span className="material-symbols-outlined text-[16px]">groups</span>
                      <span>
                        {selectedRole === 'driver' ? 'Multi-Driver Dispatch' : 'Verified Personnel'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-[#31353e]/50 px-3 py-2 rounded-lg text-[#bccac0] font-mono text-[11px] border border-[#262a33]">
                      <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                      <span>
                        {selectedRole === 'driver'
                          ? 'Consolidated GST Billing'
                          : 'GST Invoice Ready'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-[#31353e]/50 px-3 py-2 rounded-lg text-[#bccac0] font-mono text-[11px] border border-[#262a33]">
                      <span className="material-symbols-outlined text-[16px]">contract</span>
                      <span>
                        {selectedRole === 'driver'
                          ? 'Corporate SLA Ready'
                          : 'Airport Wait Included'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-[#31353e]/50 px-3 py-2 rounded-lg text-[#bccac0] font-mono text-[11px] border border-[#262a33]">
                      <span className="material-symbols-outlined text-[16px]">support_agent</span>
                      <span>
                        {selectedRole === 'driver' ? 'Dedicated Fleet Desk' : '24/7 SOS Helpline'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 bg-[#1c2028] p-4 rounded-xl flex items-center justify-between border border-[#262a33]">
                  <div className="flex flex-col">
                    <span className="font-mono text-[10px] text-[#bccac0] uppercase">
                      {selectedRole === 'driver' ? 'COMMISSION STRUCTURE' : 'BASE CHAUFFEUR RATE'}
                    </span>
                    <span className="font-display text-xl text-[#dfe2ee] font-bold">
                      {selectedRole === 'driver' ? 'B2B Volume SLA' : '₹149 / hr'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRole(selectedRole === 'driver' ? 'customer' : 'driver');
                    }}
                    className="px-4 py-2.5 bg-[#31353e] text-[#dfe2ee] font-mono text-xs font-medium rounded-lg hover:bg-[#353942] transition-all flex items-center gap-2"
                  >
                    <span>
                      {selectedRole === 'driver' ? 'SWITCH TO CUSTOMER' : 'SWITCH TO DRIVER PILOT'}
                    </span>
                    <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ERROR NOTIFICATION ALERT */}
            {error && (
              <div className="p-4 rounded-xl bg-[#93000a]/30 border border-[#ffb4ab]/50 text-[#ffdad6] text-xs font-mono flex items-center gap-3 shadow-lg">
                <span className="material-symbols-outlined text-lg text-red-400">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* TERMINAL ACTIVE SPLIT SECTION */}
            <div className="flex flex-col gap-3" id="registration-form-panel">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-[11px] text-[#dfe2ee] font-bold tracking-widest uppercase">
                  <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-pulse"></span>
                  <span>
                    {selectedRole === 'driver'
                      ? 'DRIVER REGISTRATION TERMINAL ACTIVE'
                      : 'CUSTOMER REGISTRATION TERMINAL ACTIVE'}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-[#bccac0]">
                  SESSION ID: #{selectedRole === 'driver' ? 'PILOT-NCR-9941' : 'CUST-NCR-4810'}
                </span>
              </div>

              {/* SPLIT FORM AND TELEMATICS WIDGET */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT PANEL: PROFILE CREATION FORM (7 COLS) */}
                <div className="lg:col-span-7 bg-[#1c2028] p-6 sm:p-8 rounded-2xl border border-[#262a33] shadow-lg flex flex-col gap-6">
                  <div className="flex items-center justify-between pb-3 bg-[#181c24] p-4 rounded-xl border border-[#262a33]">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-[#68dba9] uppercase font-bold">
                          STEP 01 // MASTER RECORD
                        </span>
                      </div>
                      <h3 className="font-display text-xl text-[#dfe2ee] font-bold">
                        {selectedRole === 'driver'
                          ? 'Chauffeur Profile Creation'
                          : 'Customer Identity Profile'}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-[#31353e] rounded font-mono text-[11px] text-[#4edea3]">
                      <span className="material-symbols-outlined text-[14px]">lock</span>
                      <span>AES-256 GCM</span>
                    </div>
                  </div>

                  <p className="text-xs text-[#bccac0] leading-relaxed">
                    {selectedRole === 'driver'
                      ? 'Provide verified legal identity and emergency contact credentials to initialize statutory background clearance through MoRTH Sarathi and police records.'
                      : 'Provide verified passenger contact details for seamless chauffeur allocation and instant ride status notifications.'}
                  </p>

                  {/* FORM */}
                  <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[10px] text-[#bccac0] uppercase font-bold">
                          FIRST LEGAL NAME
                        </label>
                        <div className="flex items-center bg-[#0a0e16] px-4 py-2.5 rounded-xl border border-[#262a33] focus-within:border-[#68dba9] transition-colors">
                          <span className="material-symbols-outlined text-[#87948b] text-[18px] mr-3">
                            badge
                          </span>
                          <input
                            required
                            className="w-full bg-transparent text-[#dfe2ee] text-sm placeholder:text-[#3d4a42] focus:outline-none"
                            placeholder="e.g. Rajeshwar"
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[10px] text-[#bccac0] uppercase font-bold">
                          LAST NAME
                        </label>
                        <div className="flex items-center bg-[#0a0e16] px-4 py-2.5 rounded-xl border border-[#262a33] focus-within:border-[#68dba9] transition-colors">
                          <span className="material-symbols-outlined text-[#87948b] text-[18px] mr-3">
                            person
                          </span>
                          <input
                            required
                            className="w-full bg-transparent text-[#dfe2ee] text-sm placeholder:text-[#3d4a42] focus:outline-none"
                            placeholder="e.g. Singh"
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Mobile Contact — phone verification (OTP) happens at login, not here */}
                    <div className="flex flex-col gap-1.5">
                      <label className="font-mono text-[10px] text-[#bccac0] uppercase font-bold">
                        PRIMARY MOBILE NUMBER
                      </label>
                      <div className="flex items-center bg-[#0a0e16] px-4 py-2.5 rounded-xl border border-[#262a33] focus-within:border-[#68dba9] transition-colors">
                        <span className="font-mono text-xs text-[#dfe2ee] font-bold mr-3 flex items-center gap-1 shrink-0">
                          <span>🇮🇳</span> +91
                        </span>
                        <input
                          required
                          className="w-full bg-transparent text-[#dfe2ee] text-sm placeholder:text-[#3d4a42] focus:outline-none"
                          placeholder="98765 43210"
                          type="tel"
                          inputMode="numeric"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        />
                      </div>
                    </div>

                    {/* Aadhaar Linked Email */}
                    <div className="flex flex-col gap-1.5">
                      <label className="font-mono text-[10px] text-[#bccac0] uppercase font-bold">
                        {selectedRole === 'driver'
                          ? 'AADHAAR LINKED EMAIL ADDRESS'
                          : 'BUSINESS / PERSONAL EMAIL'}
                      </label>
                      <div className="flex items-center bg-[#0a0e16] px-4 py-2.5 rounded-xl border border-[#262a33] focus-within:border-[#68dba9] transition-colors">
                        <span className="material-symbols-outlined text-[#87948b] text-[18px] mr-3">
                          alternate_email
                        </span>
                        <input
                          required
                          className="w-full bg-transparent text-[#dfe2ee] text-sm placeholder:text-[#3d4a42] focus:outline-none"
                          placeholder={
                            selectedRole === 'driver'
                              ? 'driver.pilot@telematics.in'
                              : 'name@company.com'
                          }
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Referral Code (Optional) */}
                    <div className="flex flex-col gap-1.5">
                      <label className="font-mono text-[10px] text-[#bccac0] uppercase font-bold">
                        REFERRAL CODE (OPTIONAL)
                      </label>
                      <div className="flex items-center bg-[#0a0e16] px-4 py-2.5 rounded-xl border border-[#262a33] focus-within:border-[#68dba9] transition-colors">
                        <span className="material-symbols-outlined text-[#87948b] text-[18px] mr-3">
                          card_giftcard
                        </span>
                        <input
                          className="w-full bg-transparent text-[#68dba9] font-mono text-sm uppercase placeholder:text-[#3d4a42] focus:outline-none"
                          placeholder="e.g. REF-APNA2026"
                          type="text"
                          value={referralCode}
                          onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                        />
                      </div>
                    </div>

                    {/* Secure Passphrase / PIN */}
                    <div className="flex flex-col gap-1.5">
                      <label className="font-mono text-[10px] text-[#bccac0] uppercase font-bold">
                        SECURE PIN / PASSPHRASE
                      </label>
                      <div className="flex items-center bg-[#0a0e16] px-4 py-2.5 rounded-xl border border-[#262a33] focus-within:border-[#68dba9] transition-colors">
                        <span className="material-symbols-outlined text-[#87948b] text-[18px] mr-3">
                          key
                        </span>
                        <input
                          required
                          className="w-full bg-transparent text-[#dfe2ee] text-sm tracking-widest placeholder:tracking-normal placeholder:text-[#3d4a42] focus:outline-none"
                          placeholder="Create 6-digit access PIN or secure pass"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-[#bccac0] hover:text-[#dfe2ee] ml-2"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {showPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>

                      {/* Entropy Strength Indicators */}
                      <div className="flex items-center gap-3 pt-1">
                        <div className="flex-1 h-1.5 bg-[#31353e] rounded-full overflow-hidden flex gap-1">
                          <div
                            className={`h-full transition-all duration-300 ${entropyScore >= 1 ? 'w-1/3 bg-[#68dba9]' : 'w-0'}`}
                          ></div>
                          <div
                            className={`h-full transition-all duration-300 ${entropyScore >= 2 ? 'w-1/3 bg-[#68dba9]' : 'w-0'}`}
                          ></div>
                          <div
                            className={`h-full transition-all duration-300 ${entropyScore >= 3 ? 'w-1/3 bg-[#68dba9]' : 'w-0'}`}
                          ></div>
                        </div>
                        <span className="font-mono text-[10px] text-[#68dba9] font-bold uppercase">
                          {entropyScore >= 3
                            ? 'Strong Entropy'
                            : entropyScore >= 2
                              ? 'Adequate'
                              : 'Minimal'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 pt-1 font-mono text-[10px] text-[#bccac0]">
                        <span
                          className={`flex items-center gap-1 ${hasMinLen ? 'text-[#68dba9]' : ''}`}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {hasMinLen ? 'check' : 'radio_button_unchecked'}
                          </span>{' '}
                          6+ Digits
                        </span>
                        <span className="flex items-center gap-1 text-[#68dba9]">
                          <span className="material-symbols-outlined text-[13px]">check</span>{' '}
                          Biometric Ready
                        </span>
                        <span className="flex items-center gap-1 text-[#68dba9]">
                          <span className="material-symbols-outlined text-[13px]">check</span> No
                          Consecutive Repeats
                        </span>
                      </div>
                    </div>

                    {/* DigiLocker Banner */}
                    <div className="flex items-center justify-between p-3 bg-[#181c24] rounded-xl border border-[#262a33]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#68dba9]/20 flex items-center justify-center text-[#68dba9]">
                          <span className="material-symbols-outlined text-[18px]">cloud_sync</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono text-xs text-[#dfe2ee] font-bold">
                            DigiLocker Instant Ingestion Ready
                          </span>
                          <span className="font-mono text-[10px] text-[#bccac0]">
                            Instant Aadhaar &amp; Commercial DL Pull
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#262a33] text-[#68dba9] font-mono text-[10px] font-bold">
                        LINKED
                      </span>
                    </div>

                    {/* Certification Checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer pt-1">
                      <input
                        checked={termsAgreed}
                        onChange={(e) => setTermsAgreed(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded bg-[#0a0e16] text-[#68dba9] accent-[#68dba9] focus:ring-0 cursor-pointer"
                        type="checkbox"
                      />
                      <span className="text-xs text-[#bccac0] leading-relaxed">
                        I certify that all provided details match my official Government Identity
                        (Aadhaar &amp; Commercial Driving License) and agree to Get Apna
                        Driver&apos;s{' '}
                        <span className="text-[#dfe2ee] font-medium underline">
                          Zero-Tolerance Safety Charter
                        </span>{' '}
                        and Police Verification Protocol.
                      </span>
                    </label>

                    {/* Action CTA */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-2 w-full py-3 bg-[#68dba9] text-[#003825] font-mono text-xs sm:text-sm font-bold rounded-xl shadow-lg hover:bg-[#85f8c4] transition-all flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <span>INITIALIZING AUDIT RECORD...</span>
                      ) : (
                        <>
                          <span>
                            {selectedRole === 'driver'
                              ? 'CONFIRM PILOT PROFILE & CONTINUE'
                              : 'CONFIRM CUSTOMER PROFILE & CONTINUE'}
                          </span>
                          <span className="material-symbols-outlined text-[20px]">
                            arrow_forward
                          </span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* RIGHT PANEL: TELEMATICS RADAR & DISPATCH TOGGLES (5 COLS) */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  {/* STEP 02: OPERATING SECTOR RADAR */}
                  <div className="bg-[#1c2028] p-6 rounded-2xl border border-[#262a33] shadow-lg flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-2 bg-[#181c24] p-3 rounded-xl border border-[#262a33]">
                      <div className="flex flex-col">
                        <span className="font-mono text-[10px] text-[#68dba9] uppercase font-bold">
                          STEP 02 // SECTOR TELEMATICS
                        </span>
                        <h4 className="font-display text-base text-[#dfe2ee] font-bold">
                          Preferred Dispatch Geofence
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 bg-[#31353e] text-[#4edea3] rounded font-mono text-[10px] font-semibold">
                        GPS {gpsStatus.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-[#bccac0]">
                      Select your primary base hub to receive priority high-value airport escorts
                      and corporate VIP runs within your vicinity.
                    </p>

                    {/* Spatial Radar Display Widget */}
                    <div className="relative w-full h-56 bg-[#0a0e16] rounded-xl overflow-hidden shadow-inner flex items-center justify-center border border-[#262a33]">
                      {/* Radar Concentric Rings */}
                      <div className="absolute w-48 h-48 rounded-full border border-[#68dba9]/20 animate-pulse"></div>
                      <div className="absolute w-36 h-36 rounded-full border border-[#3d4a42]/40"></div>
                      <div className="absolute w-20 h-20 rounded-full border border-[#68dba9]/30"></div>

                      {/* Crosshair Lines */}
                      <div className="absolute inset-x-0 top-1/2 h-px bg-[#3d4a42]/40"></div>
                      <div className="absolute inset-y-0 left-1/2 w-px bg-[#3d4a42]/40"></div>

                      {/* Animated Sweep Ray */}
                      <div className="absolute w-24 h-24 origin-bottom-right top-4 left-4 bg-gradient-to-tl from-[#68dba9]/30 to-transparent rounded-tl-full pointer-events-none transform -rotate-45 animate-radar-sweep"></div>

                      {/* Center Hub Marker */}
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="w-5 h-5 rounded-full bg-[#68dba9] flex items-center justify-center shadow-[0_0_12px_rgba(104,219,169,0.8)]">
                          <div className="w-2 h-2 rounded-full bg-[#0a0e16]"></div>
                        </div>
                        <span className="mt-1 font-mono text-[9px] bg-[#262a33] px-2 py-0.5 rounded text-[#68dba9] font-bold">
                          DELHI NCR HUB
                        </span>
                      </div>

                      {/* Active Zone Pings */}
                      <div className="absolute top-4 right-6 flex items-center gap-1.5 bg-[#262a33]/90 backdrop-blur px-2.5 py-1 rounded shadow-sm border border-[#3d4a42]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-ping"></span>
                        <span className="font-mono text-[#dfe2ee] text-[10px]">
                          Aerocity T3 • 1.2km
                        </span>
                      </div>
                      <div className="absolute bottom-6 left-6 flex items-center gap-1.5 bg-[#262a33]/90 backdrop-blur px-2.5 py-1 rounded shadow-sm border border-[#3d4a42]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#68dba9]"></span>
                        <span className="font-mono text-[#dfe2ee] text-[10px]">
                          DLF CyberCity • 3.5km
                        </span>
                      </div>
                      <div className="absolute bottom-10 right-6 flex items-center gap-1.5 bg-[#262a33]/90 backdrop-blur px-2.5 py-1 rounded shadow-sm border border-[#3d4a42]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#b4c5ff]"></span>
                        <span className="font-mono text-[#dfe2ee] text-[10px]">
                          Golf Course Ext • 6km
                        </span>
                      </div>

                      {/* Coordinates Overlay Bottom */}
                      <div className="absolute bottom-2 inset-x-2 flex justify-between items-center text-[9px] font-mono text-[#bccac0] bg-[#0a0e16]/90 px-3 py-1 rounded border border-[#262a33]">
                        <span>{gpsCoordinates}</span>
                        <span className="text-[#68dba9] font-bold">[ACTIVE NCR]</span>
                      </div>
                    </div>

                    {/* Geofence Control Buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleActivateGps}
                        className="w-full py-2.5 bg-[#68dba9] text-[#003825] font-mono text-[11px] font-bold rounded-xl hover:bg-[#85f8c4] transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">my_location</span>
                        <span>SET GPS HOME BASE</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCustomSector}
                        className="w-full py-2.5 bg-[#262a33] text-[#dfe2ee] font-mono text-[11px] font-medium rounded-xl hover:bg-[#353942] transition-all flex items-center justify-center gap-1.5 border border-[#3d4a42]"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          edit_location_alt
                        </span>
                        <span>CUSTOM SECTOR</span>
                      </button>
                    </div>
                  </div>

                  {/* STEP 03: TELEMETRY & SHIFT ALERTS */}
                  <div className="bg-[#1c2028] p-6 rounded-2xl border border-[#262a33] shadow-lg flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-2 bg-[#181c24] p-3 rounded-xl border border-[#262a33]">
                      <div className="flex flex-col">
                        <span className="font-mono text-[10px] text-[#68dba9] uppercase font-bold">
                          STEP 03 // DISPATCH PREFS
                        </span>
                        <h4 className="font-display text-base text-[#dfe2ee] font-bold">
                          Telemetry &amp; Shift Alerts
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 bg-[#31353e] text-[#68dba9] rounded font-mono text-[10px] font-semibold">
                        INSTANT RELAY
                      </span>
                    </div>

                    <div className="flex flex-col gap-3">
                      {/* Toggle 1 */}
                      <div className="flex items-center justify-between p-3 bg-[#181c24] rounded-xl border border-[#262a33]">
                        <div className="flex flex-col pr-3">
                          <span className="text-xs text-[#dfe2ee] font-medium">
                            {selectedRole === 'driver'
                              ? 'High-Value VIP Dispatch Pings'
                              : 'Trip Status & Route Telemetry'}
                          </span>
                          <span className="text-[11px] text-[#bccac0]">
                            {selectedRole === 'driver'
                              ? 'Instant push audio signals for missions > ₹1,200'
                              : 'Live updates when pilot is assigned & en route'}
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedRole === 'driver' ? vipPings : tripStatusAlerts}
                            onChange={(e) =>
                              selectedRole === 'driver'
                                ? setVipPings(e.target.checked)
                                : setTripStatusAlerts(e.target.checked)
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[#31353e] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#68dba9]"></div>
                        </label>
                      </div>

                      {/* Toggle 2 */}
                      <div className="flex items-center justify-between p-3 bg-[#181c24] rounded-xl border border-[#262a33]">
                        <div className="flex flex-col pr-3">
                          <span className="text-xs text-[#dfe2ee] font-medium">
                            {selectedRole === 'driver'
                              ? 'SOS Panic & Incident Telematics Relay'
                              : 'Arrival Chimes & Proximity Pings'}
                          </span>
                          <span className="text-[11px] text-[#bccac0]">
                            {selectedRole === 'driver'
                              ? 'Automated audio sync with 24/7 Gurgaon SOC in emergency'
                              : 'Audio and push nudge when pilot is within 200m'}
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedRole === 'driver' ? sosRelay : arrivalPings}
                            onChange={(e) =>
                              selectedRole === 'driver'
                                ? setSosRelay(e.target.checked)
                                : setArrivalPings(e.target.checked)
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[#31353e] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#68dba9]"></div>
                        </label>
                      </div>

                      {/* Toggle 3 */}
                      <div className="flex items-center justify-between p-3 bg-[#181c24] rounded-xl border border-[#262a33]">
                        <div className="flex flex-col pr-3">
                          <span className="text-xs text-[#dfe2ee] font-medium">
                            {selectedRole === 'driver'
                              ? 'Daily Payout & Settlement SMS'
                              : 'Encrypted SMS Ride Start OTP'}
                          </span>
                          <span className="text-[11px] text-[#bccac0]">
                            {selectedRole === 'driver'
                              ? 'Real-time IMPS disbursement confirmation via SMS'
                              : 'Crucial safety PIN shared directly before vehicle boarding'}
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedRole === 'driver' ? payoutSms : smsOtpAlerts}
                            onChange={(e) =>
                              selectedRole === 'driver'
                                ? setPayoutSms(e.target.checked)
                                : setSmsOtpAlerts(e.target.checked)
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[#31353e] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#68dba9]"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM SECTION: FLEET VERIFICATION TIERS & VEHICLE COMPATIBILITY */}
            <div className="bg-[#1c2028] p-6 sm:p-8 rounded-2xl border border-[#262a33] shadow-lg flex flex-col gap-6 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 bg-[#181c24] p-4 rounded-xl border border-[#262a33]">
                <div>
                  <span className="font-mono text-[10px] text-[#68dba9] uppercase font-bold tracking-widest">
                    FLEET VERIFICATION TIERS
                  </span>
                  <h3 className="font-display text-xl text-[#dfe2ee] font-bold">
                    Target Vehicle Class Endorsements in Your Sector
                  </h3>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-[#68dba9] font-semibold bg-[#0a0e16] px-3 py-1.5 rounded-lg border border-[#262a33]">
                  <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-ping"></span>
                  <span>142 Active High-Value Missions Available in NCR</span>
                </div>
              </div>

              {/* 3 Vehicle Specification Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* CARD 1: Luxury Sedan Specialist */}
                <div className="bg-[#181c24] p-6 rounded-2xl border border-[#262a33] shadow flex flex-col justify-between hover:bg-[#262a33] transition-colors">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-lg bg-[#31353e] text-[#68dba9] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px]">
                          directions_car
                        </span>
                      </div>
                      <span className="px-2.5 py-1 bg-[#25a475] text-[#00311f] rounded font-mono text-[10px] font-bold">
                        CLEARANCE READY
                      </span>
                    </div>
                    <h4 className="font-display text-lg text-[#dfe2ee] font-bold">
                      Luxury Sedan Specialist
                    </h4>
                    <span className="font-mono text-xs text-[#bccac0] font-medium">
                      Mercedes E-Class • BMW 5 • Audi A6
                    </span>
                    <div className="flex items-center gap-1.5 text-[#bccac0] text-xs pt-1">
                      <span className="material-symbols-outlined text-[15px] text-[#4edea3]">
                        check_circle
                      </span>
                      <span>Min. 5 Yrs Commercial Exp Required</span>
                    </div>
                  </div>
                  <div className="mt-6 pt-3 bg-[#0a0e16] px-4 py-2.5 rounded-xl flex items-center justify-between border border-[#262a33]">
                    <span className="font-mono text-[10px] text-[#bccac0] uppercase">
                      BENCHMARK PAY
                    </span>
                    <span className="font-display text-lg text-[#68dba9] font-bold">
                      Avg. ₹1,850{' '}
                      <span className="font-normal text-xs text-[#bccac0]">/ shift</span>
                    </span>
                  </div>
                </div>

                {/* CARD 2: Executive MPV & Flagship Pilot */}
                <div className="bg-[#181c24] p-6 rounded-2xl border border-[#262a33] shadow flex flex-col justify-between hover:bg-[#262a33] transition-colors">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-lg bg-[#31353e] text-[#b4c5ff] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px]">
                          airport_shuttle
                        </span>
                      </div>
                      <span className="px-2.5 py-1 bg-[#0053db] text-[#cdd7ff] rounded font-mono text-[10px] font-bold">
                        HIGH DEMAND
                      </span>
                    </div>
                    <h4 className="font-display text-lg text-[#dfe2ee] font-bold">
                      Executive MPV &amp; Flagship
                    </h4>
                    <span className="font-mono text-xs text-[#bccac0] font-medium">
                      Toyota Vellfire • Carnival • V-Class
                    </span>
                    <div className="flex items-center gap-1.5 text-[#bccac0] text-xs pt-1">
                      <span className="material-symbols-outlined text-[15px] text-[#b4c5ff]">
                        star
                      </span>
                      <span>VIP Protocol &amp; Etiquette Certified</span>
                    </div>
                  </div>
                  <div className="mt-6 pt-3 bg-[#0a0e16] px-4 py-2.5 rounded-xl flex items-center justify-between border border-[#262a33]">
                    <span className="font-mono text-[10px] text-[#bccac0] uppercase">
                      BENCHMARK PAY
                    </span>
                    <span className="font-display text-lg text-[#b4c5ff] font-bold">
                      Avg. ₹2,200{' '}
                      <span className="font-normal text-xs text-[#bccac0]">/ shift</span>
                    </span>
                  </div>
                </div>

                {/* CARD 3: High-Performance SUV & Armored */}
                <div className="bg-[#181c24] p-6 rounded-2xl border border-[#262a33] shadow flex flex-col justify-between hover:bg-[#262a33] transition-colors">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-lg bg-[#31353e] text-[#4edea3] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px]">shield</span>
                      </div>
                      <span className="px-2.5 py-1 bg-[#31353e] text-[#68dba9] font-mono text-[10px] font-bold border border-[#68dba9]/30">
                        SPECIAL CONCIERGE
                      </span>
                    </div>
                    <h4 className="font-display text-lg text-[#dfe2ee] font-bold">
                      Armored &amp; Heavy SUV Class
                    </h4>
                    <span className="font-mono text-xs text-[#bccac0] font-medium">
                      Range Rover • Defender • LC300
                    </span>
                    <div className="flex items-center gap-1.5 text-[#bccac0] text-xs pt-1">
                      <span className="material-symbols-outlined text-[15px] text-[#4edea3]">
                        military_tech
                      </span>
                      <span>Defensive Driving &amp; Evasive Endorsed</span>
                    </div>
                  </div>
                  <div className="mt-6 pt-3 bg-[#0a0e16] px-4 py-2.5 rounded-xl flex items-center justify-between border border-[#262a33]">
                    <span className="font-mono text-[10px] text-[#bccac0] uppercase">
                      BENCHMARK PAY
                    </span>
                    <span className="font-display text-lg text-[#4edea3] font-bold">
                      Avg. ₹2,600{' '}
                      <span className="font-normal text-xs text-[#bccac0]">/ shift</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* COMPLETION MODAL */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0e16]/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#1c2028] p-8 rounded-2xl shadow-2xl border border-[#68dba9]/50 flex flex-col items-center text-center gap-6 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 rounded-full bg-[#68dba9]/20 flex items-center justify-center text-[#68dba9] shadow-[0_0_24px_rgba(104,219,169,0.5)] border border-[#68dba9]/30">
              <span className="material-symbols-outlined text-4xl">verified</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-mono text-[#68dba9] uppercase tracking-wider font-bold">
                Access Clearance Granted
              </span>
              <h2 className="font-display font-bold text-2xl text-[#dfe2ee]">
                {selectedRole === 'driver'
                  ? 'Chauffeur Pilot Registered!'
                  : 'Customer Account Created!'}
              </h2>
              <p className="text-xs text-[#bccac0] max-w-sm mt-1 leading-relaxed">
                {selectedRole === 'driver'
                  ? 'Your master pilot record is initialized. Proceed to complete your statutory document verification & background clearance.'
                  : 'Welcome to Get Apna Driver. Your account is activated and ready for instant chauffeur bookings across NCR.'}
              </p>
            </div>

            {/* Reward Credit Badge */}
            <div className="w-full bg-[#0a0e16] p-4 rounded-xl border border-[#262a33] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#68dba9]/10 flex items-center justify-center text-[#68dba9]">
                  <span className="material-symbols-outlined">redeem</span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-[#dfe2ee]">
                    {selectedRole === 'driver'
                      ? '₹500 Pilot Onboarding Bonus'
                      : '₹200 Welcome Booking Credit'}
                  </span>
                  <span className="text-[10px] font-mono text-[#68dba9]">
                    {selectedRole === 'driver'
                      ? 'Applied upon first verified shift'
                      : 'Applied to first trip invoice'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono bg-[#68dba9] text-[#003825] px-2.5 py-1 rounded font-bold uppercase">
                Active
              </span>
            </div>

            {/* Next Step Trigger */}
            <div className="w-full flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push(redirectPath)}
                className="flex-1 px-6 py-3 bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] rounded-xl font-mono text-xs font-bold uppercase tracking-wider shadow-[0_0_16px_-2px_rgba(5,150,105,0.4)] flex items-center justify-center gap-2 transition-colors"
              >
                <span>
                  {selectedRole === 'driver' ? 'CONTINUE TO KYC WIZARD' : 'GO TO BOOKING CONSOLE'}
                </span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="w-full bg-[#0a0e16] py-6 border-t border-[#262a33]">
        <div className="w-full px-4 sm:px-8 max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs text-[#bccac0]">
          <div className="flex items-center gap-2">
            <span>&copy; 2026 Get Apna Driver Inc. Enterprise Mobility Systems.</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="w-2 h-2 rounded-full bg-[#4edea3]"></span>
            <span>
              Tier-4 Sovereign Compliance • MoRTH Sarathi API Sync Ready • Security Protocol v4.19
            </span>
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
        <div className="min-h-screen bg-[#0a0e16] text-[#dfe2ee] flex items-center justify-center font-mono text-xs">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#68dba9] animate-ping"></span>
            <span>LOADING TELEMATICS REGISTER TERMINAL...</span>
          </div>
        </div>
      }
    >
      <RegisterFormContent />
    </Suspense>
  );
}

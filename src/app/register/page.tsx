'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();

  // Role selection state
  const [selectedRole, setSelectedRole] = useState<'customer' | 'driver'>('customer');

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);

  // Telemetry Switches State
  const [tripStatusAlerts, setTripStatusAlerts] = useState(true);
  const [arrivalPings, setArrivalPings] = useState(true);
  const [smsOtpAlerts, setSmsOtpAlerts] = useState(true);

  // GPS State
  const [gpsStatus, setGpsStatus] = useState<'Standby' | 'Active' | 'Manual'>('Standby');
  const [gpsCoordinates, setGpsCoordinates] = useState('28.6139° N, 77.2090° E [DELHI NCR]');

  // UI Flow State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Password Strength Calculation
  const hasMinLen = password.length >= 8;
  const hasUpperLower = /[A-Z]/.test(password) && /[a-z]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  let entropyScore = 0;
  if (hasMinLen) entropyScore++;
  if (hasUpperLower) entropyScore++;
  if (hasSpecial) entropyScore++;

  const getEntropyLabel = () => {
    if (entropyScore === 0) return { label: 'Entropy: Minimal', color: 'text-[#87948b]' };
    if (entropyScore === 1) return { label: 'Entropy: Weak', color: 'text-[#ffb4ab]' };
    if (entropyScore === 2) return { label: 'Entropy: Adequate', color: 'text-[#4edea3]' };
    return { label: 'Entropy: Military Grade', color: 'text-[#68dba9] font-bold' };
  };

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
          setGpsCoordinates('28.5603° N, 77.1627° E [SOUTH DELHI HUB]');
          setGpsStatus('Active');
        },
      );
    } else {
      setGpsStatus('Active');
    }
  };

  const handleManualCity = () => {
    const city = prompt('Enter your city name (e.g. Mumbai, Gurugram, Bengaluru):', 'Delhi-NCR');
    if (city) {
      setGpsCoordinates(`ZONE: ${city.toUpperCase()} METRO MESH`);
      setGpsStatus('Manual');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedRole === 'driver') {
      router.push('/driver/onboarding');
      return;
    }

    if (!termsAgreed) {
      setError('Please accept the Charter Service Protocols to proceed.');
      return;
    }

    setLoading(true);

    try {
      const fullFullName = `${firstName} ${lastName}`.trim();
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName: fullFullName,
          phoneNumber: phone ? `+91${phone}` : undefined,
        }),
      });

      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

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

  const entropyInfo = getEntropyLabel();

  return (
    <div className="min-h-screen bg-[#0f131c] text-[#dfe2ee] font-sans antialiased">
      {/* Fixed Top Header */}
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
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-lg uppercase tracking-wider text-[#bccac0] hover:text-[#dfe2ee] hover:bg-[#181c24] transition-colors"
            >
              Unified Login
            </Link>
            <button
              type="button"
              onClick={() => setSelectedRole(selectedRole === 'customer' ? 'driver' : 'customer')}
              className="px-3 py-1.5 rounded-lg uppercase tracking-wider text-[#bccac0] hover:text-[#dfe2ee] hover:bg-[#181c24] transition-colors"
            >
              Role Selection
            </button>
            <span className="px-3 py-1.5 uppercase tracking-wider bg-[#262a33] text-[#dfe2ee] font-semibold rounded-lg shadow-[0_0_12px_rgba(5,150,105,0.25)]">
              Customer Onboarding
            </span>
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
              <img
                alt="Profile Avatar"
                className="w-8 h-8 rounded-full object-cover ring-1 ring-[#68dba9]/40"
                src="https://lh3.googleusercontent.com/aida/AEtjO1WxTO3NWRJYA6Ib8PoLewFtFM192nboytw0dzwqWk0TIlG-EKLuweHK3XEBiNQPnRKauOOKRhAitZ0MSszwg63MMJtw0CZH0PQuLqh2eFIwV8e0k116pkMkpiHFZjv6K7_YcBF4yrXC9ju4097kjEeBXeIHsRM6FJqVKl32MXq3hJit4vg6qpYolsOCW13MleiFjFXW7na0Il8qSvKmcsODjxcQAHKnbfL_TtjEDmBexYKDZrzUvLjYLyQ"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-20 pb-16 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-10">
        {/* Stepper & Tactical Flow Tracker */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[#bccac0] font-mono text-xs">
            <div className="flex items-center gap-2 uppercase tracking-widest text-[#68dba9]">
              <span className="material-symbols-outlined text-sm">hub</span>
              <span>Access Node: APNA-DELHI-SOUTH-09</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[#dfe2ee]">
                Step <span className="text-[#68dba9] font-bold font-display text-sm">01</span> / 03
              </span>
              <span className="bg-[#262a33] px-3 py-1 rounded-full text-[#68dba9] uppercase font-bold text-[10px]">
                ROLE SPECIFICATION
              </span>
            </div>
          </div>

          {/* Segmented Terminal Progress Bar */}
          <div className="w-full grid grid-cols-3 gap-2 h-1.5 bg-[#0a0e16] rounded-full overflow-hidden">
            <div className="h-full bg-[#68dba9] transition-all duration-500 rounded-full shadow-[0_0_12px_rgba(104,219,169,0.5)]"></div>
            <div className="h-full bg-[#1c2028] transition-all duration-500 rounded-full"></div>
            <div className="h-full bg-[#1c2028] transition-all duration-500 rounded-full"></div>
          </div>
        </div>

        {/* Header Section with Tactical Typography */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#68dba9] uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-[#68dba9] animate-pulse"></span>
              Gateway Verification Active
            </div>
            <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-[#dfe2ee]">
              Join Get Apna Driver
            </h1>
            <p className="text-sm sm:text-base text-[#bccac0]">
              Choose how you want to experience India&apos;s premier verified chauffeur marketplace.
            </p>
          </div>

          {/* Live Security Protocol Metric */}
          <div className="hidden lg:flex items-center gap-4 bg-[#181c24] p-3 px-5 rounded-xl border border-[#262a33] shadow-md">
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-mono text-[#bccac0] uppercase">
                Clearance Protocol
              </span>
              <span className="font-display font-bold text-xl text-[#68dba9]">99.98%</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#262a33] flex items-center justify-center text-[#68dba9]">
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                shield_with_heart
              </span>
            </div>
          </div>
        </div>

        {/* ROLE SELECTION CARDS (Interactive Switcher) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="role-selection-section">
          {/* Role 1: Customer */}
          <div
            onClick={() => setSelectedRole('customer')}
            className={`relative flex flex-col justify-between p-6 rounded-xl transition-all duration-300 cursor-pointer shadow-xl border ${
              selectedRole === 'customer'
                ? 'bg-[#262a33] border-[#68dba9]/60 shadow-[0_0_20px_rgba(104,219,169,0.15)]'
                : 'bg-[#181c24] border-[#262a33] hover:bg-[#1c2028]'
            }`}
          >
            {selectedRole === 'customer' && (
              <div className="absolute top-4 right-4 flex items-center gap-1 bg-[#68dba9] text-[#003825] px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider shadow-[0_0_12px_rgba(104,219,169,0.4)]">
                <span className="material-symbols-outlined text-xs">check_circle</span>
                Selected Experience
              </div>
            )}

            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#1c2028] flex items-center justify-center text-[#68dba9] shadow-sm">
                  <span className="material-symbols-outlined text-3xl">person_pin</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono tracking-widest text-[#68dba9] uppercase font-bold">
                    Individual &amp; Corporate
                  </span>
                  <h2 className="font-display font-bold text-xl text-[#dfe2ee]">
                    Customer Account
                  </h2>
                  <span className="text-xs text-[#bccac0]">
                    Book Luxury &amp; Verified Chauffeurs
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-[#bccac0] leading-relaxed">
                Command point-to-point luxury transfers, hourly multi-stop delegations, and
                intercity transit with vetted, police-cleared personnel.
              </p>

              {/* Core Value Proposition Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#181c24] text-[#dfe2ee] border border-[#262a33]">
                  <span className="material-symbols-outlined text-[#68dba9] text-base">
                    flight_takeoff
                  </span>
                  <span className="text-xs font-medium">Instant Airport Concierge</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#181c24] text-[#dfe2ee] border border-[#262a33]">
                  <span className="material-symbols-outlined text-[#68dba9] text-base">
                    security
                  </span>
                  <span className="text-xs font-medium">Vetted Police Cleared</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#181c24] text-[#dfe2ee] border border-[#262a33]">
                  <span className="material-symbols-outlined text-[#68dba9] text-base">
                    price_change
                  </span>
                  <span className="text-xs font-medium">Zero Surge Lock Guarantee</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#181c24] text-[#dfe2ee] border border-[#262a33]">
                  <span className="material-symbols-outlined text-[#68dba9] text-base">
                    emergency
                  </span>
                  <span className="text-xs font-medium">Dedicated Priority SOS Escort</span>
                </div>
              </div>
            </div>

            <div className="pt-6 flex items-center justify-between gap-4 border-t border-[#3d4a42]/30 mt-6">
              <div className="flex flex-col font-mono text-xs text-[#bccac0]">
                <span>STARTING FARE BASE</span>
                <span className="font-display font-bold text-lg text-[#dfe2ee]">
                  ₹499<span className="text-xs text-[#bccac0] font-normal"> /hr</span>
                </span>
              </div>
              <button
                type="button"
                className={`px-5 py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
                  selectedRole === 'customer'
                    ? 'bg-[#68dba9] text-[#003825] shadow-[0_0_16px_-2px_rgba(5,150,105,0.4)] hover:brightness-110'
                    : 'bg-[#262a33] text-[#dfe2ee] hover:bg-[#353942]'
                }`}
              >
                Continue as Customer
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Role 2: Driver Partner */}
          <div
            onClick={() => setSelectedRole('driver')}
            className={`relative flex flex-col justify-between p-6 rounded-xl transition-all duration-300 cursor-pointer shadow-md border ${
              selectedRole === 'driver'
                ? 'bg-[#262a33] border-[#b4c5ff]/60 shadow-[0_0_20px_rgba(0,83,219,0.15)]'
                : 'bg-[#181c24] border-[#262a33] hover:bg-[#1c2028]'
            }`}
          >
            {selectedRole === 'driver' && (
              <div className="absolute top-4 right-4 flex items-center gap-1 bg-[#0053db] text-[#cdd7ff] px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider">
                <span className="material-symbols-outlined text-xs">check_circle</span>
                Partner Selected
              </div>
            )}

            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#262a33] flex items-center justify-center text-[#b4c5ff] shadow-sm">
                  <span className="material-symbols-outlined text-3xl">sports_motorsports</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono tracking-widest text-[#b4c5ff] uppercase font-bold">
                    Professional Fleet
                  </span>
                  <h2 className="font-display font-bold text-xl text-[#dfe2ee]">Driver Partner</h2>
                  <span className="text-xs text-[#bccac0]">Elite Chauffeur Network</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-[#bccac0] leading-relaxed">
                Monetize your master driving certification. Access high-ticket private vehicle
                dispatches, corporate contracts, and instant settlements.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#1c2028] text-[#dfe2ee] border border-[#262a33]">
                  <span className="material-symbols-outlined text-[#b4c5ff] text-base">
                    currency_rupee
                  </span>
                  <span className="text-xs font-medium">Up to ₹45,000/mo Earn</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#1c2028] text-[#dfe2ee] border border-[#262a33]">
                  <span className="material-symbols-outlined text-[#b4c5ff] text-base">bolt</span>
                  <span className="text-xs font-medium">Daily IMPS Bank Payouts</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#1c2028] text-[#dfe2ee] border border-[#262a33]">
                  <span className="material-symbols-outlined text-[#b4c5ff] text-base">
                    directions_car
                  </span>
                  <span className="text-xs font-medium">Automatic Car Bookings</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#1c2028] text-[#dfe2ee] border border-[#262a33]">
                  <span className="material-symbols-outlined text-[#b4c5ff] text-base">
                    verified
                  </span>
                  <span className="text-xs font-medium">0% Commission Top Tier</span>
                </div>
              </div>
            </div>

            <div className="pt-6 flex items-center justify-between gap-4 border-t border-[#3d4a42]/30 mt-6">
              <div className="flex flex-col font-mono text-xs text-[#bccac0]">
                <span>AVG PILOT PAYOUT</span>
                <span className="font-display font-bold text-lg text-[#b4c5ff]">
                  ₹1,850<span className="text-xs text-[#bccac0] font-normal"> /shift</span>
                </span>
              </div>
              <button
                type="button"
                className={`px-5 py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
                  selectedRole === 'driver'
                    ? 'bg-[#0053db] text-[#cdd7ff] shadow-[0_0_16px_-2px_rgba(0,83,219,0.4)]'
                    : 'bg-[#262a33] text-[#dfe2ee] hover:bg-[#353942]'
                }`}
              >
                Apply as Chauffeur
                <span className="material-symbols-outlined text-sm">shield_person</span>
              </button>
            </div>
          </div>
        </section>

        {/* SECTION DIVIDER & CURRENT ROUTE DISPLAY */}
        <div className="flex items-center gap-4 py-2">
          <div className="h-px bg-[#262a33] flex-1"></div>
          <div className="flex items-center gap-2 font-mono text-xs text-[#bccac0] uppercase px-4 py-1.5 bg-[#0a0e16] rounded-full border border-[#262a33]">
            <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-ping"></span>
            Customer Registration Terminal Active
          </div>
          <div className="h-px bg-[#262a33] flex-1"></div>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="p-4 rounded-xl bg-[#93000a]/20 border border-red-500/50 text-[#ffdad6] text-xs font-mono flex items-center gap-3">
            <span className="material-symbols-outlined text-base text-red-400">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* LOWER SECTION: 2-PANEL ONBOARDING WORKFLOW */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Step 1 Profile Creation Form (7 cols) */}
          <div className="lg:col-span-7 bg-[#181c24] p-6 sm:p-8 rounded-xl border border-[#262a33] shadow-xl flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#68dba9] uppercase tracking-wider font-bold">
                  Step 01 • Master Record
                </span>
                <span className="text-[10px] font-mono text-[#bccac0] flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-[#68dba9]">lock</span>{' '}
                  AES-256 GCM
                </span>
              </div>
              <h3 className="font-display font-bold text-xl text-[#dfe2ee]">
                Customer Profile Creation
              </h3>
              <p className="text-xs text-[#bccac0]">
                Provide verified passenger credentials for concierge booking dispatches.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Name Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="first-name"
                    className="text-[11px] font-mono text-[#bccac0] uppercase"
                  >
                    First Legal Name
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="first-name"
                      type="text"
                      required
                      placeholder="e.g. Vikram"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-[#0a0e16] text-[#dfe2ee] px-4 py-2.5 rounded-lg text-sm border border-[#262a33] focus:outline-none focus:border-[#68dba9]"
                    />
                    <span className="material-symbols-outlined absolute right-3 text-[#3d4a42] text-sm">
                      badge
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="last-name"
                    className="text-[11px] font-mono text-[#bccac0] uppercase"
                  >
                    Last Name
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="last-name"
                      type="text"
                      required
                      placeholder="e.g. Malhotra"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-[#0a0e16] text-[#dfe2ee] px-4 py-2.5 rounded-lg text-sm border border-[#262a33] focus:outline-none focus:border-[#68dba9]"
                    />
                    <span className="material-symbols-outlined absolute right-3 text-[#3d4a42] text-sm">
                      person
                    </span>
                  </div>
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-[11px] font-mono text-[#bccac0] uppercase">
                    Business / Personal Email
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="email"
                      type="email"
                      required
                      placeholder="name@corporation.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#0a0e16] text-[#dfe2ee] px-4 py-2.5 rounded-lg text-sm border border-[#262a33] focus:outline-none focus:border-[#68dba9]"
                    />
                    <span className="material-symbols-outlined absolute right-3 text-[#3d4a42] text-sm">
                      alternate_email
                    </span>
                  </div>
                </div>

                {/* Mobile Number with Prefix */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="phone" className="text-[11px] font-mono text-[#bccac0] uppercase">
                    Mobile Contact (+91)
                  </label>
                  <div className="flex items-center rounded-lg bg-[#0a0e16] border border-[#262a33] overflow-hidden focus-within:border-[#68dba9]">
                    <span className="px-3 py-2.5 bg-[#262a33] font-mono text-xs text-[#68dba9] font-bold flex items-center gap-1 shrink-0 border-r border-[#3d4a42]/40">
                      🇮🇳 +91
                    </span>
                    <input
                      id="phone"
                      type="tel"
                      pattern="[0-9]{10}"
                      placeholder="98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-transparent text-[#dfe2ee] px-3 py-2.5 text-sm focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Password + Strength Meter */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-[11px] font-mono text-[#bccac0] uppercase"
                  >
                    Secure Passphrase
                  </label>
                  <span className={`text-[10px] font-mono ${entropyInfo.color}`}>
                    {entropyInfo.label}
                  </span>
                </div>
                <div className="relative flex items-center">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Create high-entropy secret"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#0a0e16] text-[#dfe2ee] px-4 py-2.5 rounded-lg text-sm border border-[#262a33] focus:outline-none focus:border-[#68dba9]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-[#bccac0] hover:text-[#dfe2ee]"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>

                {/* Strength Visual Bar */}
                <div className="w-full grid grid-cols-3 gap-2 h-1.5 bg-[#0a0e16] rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full rounded-full transition-colors duration-300 ${
                      entropyScore >= 1 ? 'bg-red-500' : 'bg-[#262a33]'
                    }`}
                  ></div>
                  <div
                    className={`h-full rounded-full transition-colors duration-300 ${
                      entropyScore >= 2 ? 'bg-[#4edea3]' : 'bg-[#262a33]'
                    }`}
                  ></div>
                  <div
                    className={`h-full rounded-full transition-colors duration-300 ${
                      entropyScore >= 3
                        ? 'bg-[#68dba9] shadow-[0_0_8px_rgba(104,219,169,0.6)]'
                        : 'bg-[#262a33]'
                    }`}
                  ></div>
                </div>

                {/* Checklist Tokens */}
                <div className="grid grid-cols-3 gap-2 pt-2 text-[10px] font-mono text-[#bccac0]">
                  <div className="flex items-center gap-1">
                    <span
                      className={`material-symbols-outlined text-xs ${
                        hasMinLen ? 'text-[#68dba9]' : 'text-[#87948b]'
                      }`}
                    >
                      {hasMinLen ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <span>8+ Characters</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className={`material-symbols-outlined text-xs ${
                        hasUpperLower ? 'text-[#68dba9]' : 'text-[#87948b]'
                      }`}
                    >
                      {hasUpperLower ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <span>Upper &amp; Lower</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className={`material-symbols-outlined text-xs ${
                        hasSpecial ? 'text-[#68dba9]' : 'text-[#87948b]'
                      }`}
                    >
                      {hasSpecial ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <span>Special Symbol (#@!)</span>
                  </div>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start gap-3 pt-2">
                <input
                  id="terms"
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  required
                  className="mt-0.5 w-4 h-4 rounded bg-[#0a0e16] text-[#68dba9] accent-[#68dba9] cursor-pointer"
                />
                <label
                  htmlFor="terms"
                  className="text-xs text-[#bccac0] leading-relaxed cursor-pointer"
                >
                  I certify that I am authorized to register this account and agree to Get Apna
                  Driver&apos;s{' '}
                  <span className="text-[#68dba9] underline font-semibold">
                    Charter Service Protocols
                  </span>
                  , Police Clearance Disclaimers, and Zero-Tolerance Passenger Safety Mandates.
                </label>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#262a33]">
                <div className="flex items-center gap-1.5 text-xs font-mono text-[#bccac0]">
                  <span className="material-symbols-outlined text-[#68dba9] text-base">
                    check_box
                  </span>
                  Instant KYC clearance ready
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] rounded-lg font-mono text-xs font-bold uppercase tracking-wider shadow-[0_0_16px_-2px_rgba(5,150,105,0.4)] transition-all flex items-center justify-center gap-2"
                >
                  {loading ? 'Validating Profile...' : 'Confirm Profile & Continue'}
                  <span className="material-symbols-outlined text-sm">verified</span>
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT COLUMN: Telematics Radar & Permission Modules (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Telematics GPS Radar Permission Card */}
            <div className="bg-[#181c24] p-6 sm:p-8 rounded-xl border border-[#262a33] shadow-xl flex flex-col gap-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#68dba9] uppercase tracking-wider font-bold">
                  Step 02 • Spatial Sync
                </span>
                <span className="text-[10px] font-mono px-3 py-0.5 bg-[#0a0e16] rounded-full text-[#bccac0] border border-[#262a33]">
                  GPS {gpsStatus}
                </span>
              </div>
              <h3 className="font-display font-bold text-xl text-[#dfe2ee]">
                Location Access Telematics
              </h3>
              <p className="text-xs text-[#bccac0] leading-relaxed">
                Permit browser location to auto-detect pickup coordinates and calculate travel times
                for nearest active chauffeurs within a 2.5km radius.
              </p>

              {/* Inline SVG Radar Visualizer */}
              <div className="relative w-full h-44 bg-[#0a0e16] rounded-xl flex items-center justify-center overflow-hidden my-2 border border-[#262a33]">
                <svg
                  className="absolute inset-0 w-full h-full"
                  fill="none"
                  viewBox="0 0 320 180"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <pattern
                      id="radar-grid-reg"
                      width="20"
                      height="20"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M 20 0 L 0 0 0 20"
                        fill="none"
                        stroke="#3d4a42"
                        strokeWidth="0.5"
                        strokeOpacity="0.3"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#radar-grid-reg)" />

                  <circle
                    cx="160"
                    cy="90"
                    r="30"
                    stroke="#3d4a42"
                    strokeWidth="1"
                    strokeDasharray="2 3"
                  />
                  <circle cx="160" cy="90" r="60" stroke="#3d4a42" strokeWidth="1" />
                  <circle
                    cx="160"
                    cy="90"
                    r="85"
                    stroke="#3d4a42"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />

                  {/* Chauffeur Blips */}
                  <g id="radar-blips">
                    <circle cx="140" cy="65" r="3" fill="#68dba9" className="animate-ping" />
                    <circle cx="140" cy="65" r="3" fill="#68dba9" />
                    <text x="146" y="68" fill="#85f8c4" fontFamily="Geist" fontSize="8">
                      S-Class • 0.8km
                    </text>

                    <circle cx="205" cy="115" r="3" fill="#68dba9" />
                    <text x="211" y="118" fill="#85f8c4" fontFamily="Geist" fontSize="8">
                      Fortuner • 1.4km
                    </text>

                    <circle cx="110" cy="120" r="3" fill="#4edea3" />
                    <text x="75" y="132" fill="#85f8c4" fontFamily="Geist" fontSize="8">
                      Camry • 2.1km
                    </text>
                  </g>

                  {/* Center Passenger Hub */}
                  <circle cx="160" cy="90" r="6" fill="#b4c5ff" />
                  <circle
                    cx="160"
                    cy="90"
                    r="10"
                    stroke="#b4c5ff"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                </svg>

                {/* Coordinate HUD */}
                <div className="absolute bottom-2 left-3 font-mono text-[10px] text-[#68dba9] bg-[#181c24]/90 px-2.5 py-1 rounded border border-[#262a33]">
                  {gpsCoordinates}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleActivateGps}
                  className="flex-1 px-4 py-2 bg-[#68dba9] text-[#003825] rounded-lg font-mono text-xs font-bold uppercase tracking-wider shadow-md flex items-center justify-center gap-2 hover:brightness-110"
                >
                  <span className="material-symbols-outlined text-sm">my_location</span>
                  Allow Precise GPS
                </button>
                <button
                  type="button"
                  onClick={handleManualCity}
                  className="px-4 py-2 bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">location_city</span>
                  Enter City Manually
                </button>
              </div>
            </div>

            {/* Step 3: Notification & SMS Dispatch Preferences Card */}
            <div className="bg-[#181c24] p-6 sm:p-8 rounded-xl border border-[#262a33] shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#68dba9] uppercase tracking-wider font-bold">
                  Step 03 • Telemetry Alerts
                </span>
                <span className="text-[10px] font-mono text-[#68dba9] flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">sensors</span> Instant Relay
                </span>
              </div>
              <h3 className="font-display font-bold text-xl text-[#dfe2ee]">
                Push Notifications &amp; SMS Dispatch
              </h3>

              {/* Switch 1 */}
              <div className="flex items-center justify-between p-3 bg-[#0a0e16] rounded-lg border border-[#262a33]">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#68dba9] text-xl">route</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#dfe2ee]">
                      Trip Status &amp; Route Telemetry
                    </span>
                    <span className="text-[11px] text-[#bccac0]">
                      Live updates when driver is assigned &amp; en route
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={tripStatusAlerts}
                  onChange={(e) => setTripStatusAlerts(e.target.checked)}
                  className="w-4 h-4 accent-[#68dba9] cursor-pointer"
                />
              </div>

              {/* Switch 2 */}
              <div className="flex items-center justify-between p-3 bg-[#0a0e16] rounded-lg border border-[#262a33]">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#68dba9] text-xl">
                    notifications_active
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#dfe2ee]">
                      Arrival Chimes &amp; Proximity Pings
                    </span>
                    <span className="text-[11px] text-[#bccac0]">
                      Audio and push nudge when pilot is within 200m
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={arrivalPings}
                  onChange={(e) => setArrivalPings(e.target.checked)}
                  className="w-4 h-4 accent-[#68dba9] cursor-pointer"
                />
              </div>

              {/* Switch 3 */}
              <div className="flex items-center justify-between p-3 bg-[#0a0e16] rounded-lg border border-[#262a33]">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#68dba9] text-xl">sms</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#dfe2ee]">
                      Encrypted SMS Ride Start OTP
                    </span>
                    <span className="text-[11px] text-[#bccac0]">
                      Crucial safety PIN shared directly before vehicle boarding
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={smsOtpAlerts}
                  onChange={(e) => setSmsOtpAlerts(e.target.checked)}
                  className="w-4 h-4 accent-[#68dba9] cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* VIP FLEET ROSTER PREVIEW */}
        <div className="bg-[#0a0e16] p-6 sm:p-8 rounded-xl border border-[#262a33] shadow-2xl flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-[#68dba9] uppercase font-bold">
                Fleet Intelligence Network
              </span>
              <h4 className="font-display font-bold text-xl text-[#dfe2ee]">
                Available Chauffeur Tiers in Your Sector
              </h4>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-[#bccac0]">
              <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-ping"></span>
              <span>142 Active Chauffeurs En Route in NCR</span>
            </div>
          </div>

          {/* Driver Cards Mosaic */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Chauffeur 1 */}
            <div className="bg-[#181c24] p-4 rounded-lg border border-[#262a33] flex flex-col justify-between gap-4 shadow-md">
              <div className="flex items-center gap-4">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAKNCqq2PM1oa59sRcaSonA1k4gRzmzr3mkjHrNB9UnYqG3folXJkF5zUuK5QDt6sx4n48Exa1ZlvjknD7PMLvbMg6MYEiYWPZcnPVX9lRCKwat-njkKU5C_T-RPP6QEfa7dCTz3dBzErijFPrTA4S_4zMDBE6ayEKSj5p_cHc4_47vRwEqu0xfVOkj8ijp8024iYjaDaUfsr22TMJYhTsiABJNT3b4s6Q9VCW_37QLDAsHno9oSR7h_g"
                  alt="Rajesh Sharma portrait"
                  className="w-14 h-14 rounded-full object-cover border border-[#262a33]"
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-[#dfe2ee] text-sm">Rajesh Sharma</span>
                    <span
                      className="material-symbols-outlined text-[#68dba9] text-xs"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      verified
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#bccac0]">
                    Mercedes E-Class • 7 Yrs Exp
                  </span>
                  <div className="flex items-center gap-1 text-[#68dba9] font-mono text-xs mt-1">
                    <span>★ 4.98</span>
                    <span className="text-[#bccac0]">(1,420 Trips)</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between font-mono text-[10px] bg-[#0a0e16] p-2 rounded border border-[#262a33]">
                <span className="text-[#bccac0]">POLICE VERIFIED: YES</span>
                <span className="text-[#68dba9] font-bold">DISPATCH READY</span>
              </div>
            </div>

            {/* Chauffeur 2 */}
            <div className="bg-[#181c24] p-4 rounded-lg border border-[#262a33] flex flex-col justify-between gap-4 shadow-md">
              <div className="flex items-center gap-4">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCeWik2094HCznjY2yliY9CCOq03Wnm8kS7Y7lIAacN-iLTlnEh6P9l6UhcjheFrdP1hhB9QK7rJJiPbnPsRFvEoFtvsM-0H-m9VrF1PlxWrZ-QjgMDnQqxwArYQsWIvyZvoyRvEDUKIdru36tXwAoXKupkgYqkto3L4hJRxkm_8Gayfot3ARl3c1UIi0lBEXBkMv3ThZD09-ZZICL5wv2TkBJw1EOJuv4K48PleemaYthIS-hsnrTi1g"
                  alt="Gurpreet Singh portrait"
                  className="w-14 h-14 rounded-full object-cover border border-[#262a33]"
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-[#dfe2ee] text-sm">Gurpreet Singh</span>
                    <span
                      className="material-symbols-outlined text-[#68dba9] text-xs"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      verified
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#bccac0]">
                    Toyota Vellfire • 11 Yrs Exp
                  </span>
                  <div className="flex items-center gap-1 text-[#68dba9] font-mono text-xs mt-1">
                    <span>★ 5.00</span>
                    <span className="text-[#bccac0]">(2,180 Trips)</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between font-mono text-[10px] bg-[#0a0e16] p-2 rounded border border-[#262a33]">
                <span className="text-[#bccac0]">SPECIALTY: VIP DELEGATION</span>
                <span className="text-[#68dba9] font-bold">DISPATCH READY</span>
              </div>
            </div>

            {/* Chauffeur 3 */}
            <div className="bg-[#181c24] p-4 rounded-lg border border-[#262a33] flex flex-col justify-between gap-4 shadow-md">
              <div className="flex items-center gap-4">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8F6F_G60tL85i0VbLoYsZUe6_uzL7l6D-KtuIDLdlpqFxIYqY57HHbCF2tOxTlAMnnWiRKb3ELkhl-HDYA4v13dBO5sJZ_RTQdWz7JrVlYllgBI_eR10dlPO9jvwG3jQ6ZZO32JZPyH0PvqlvLtX9cUGfjbmWvSptC7KXokWZxjOtfCFssMpPoDGgyIfphTpiqVUJmEVCTrZGy6ym6bc8mteVmqPhNEoB_57KxFtN9hFR_p-WcM7APg"
                  alt="Amitav Roy portrait"
                  className="w-14 h-14 rounded-full object-cover border border-[#262a33]"
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-[#dfe2ee] text-sm">Amitav Roy</span>
                    <span
                      className="material-symbols-outlined text-[#68dba9] text-xs"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      verified
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#bccac0]">BMW 7 Series • 6 Yrs Exp</span>
                  <div className="flex items-center gap-1 text-[#68dba9] font-mono text-xs mt-1">
                    <span>★ 4.96</span>
                    <span className="text-[#bccac0]">(950 Trips)</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between font-mono text-[10px] bg-[#0a0e16] p-2 rounded border border-[#262a33]">
                <span className="text-[#bccac0]">ARMORED TRAINED: YES</span>
                <span className="text-[#68dba9] font-bold">DISPATCH READY</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* COMPLETION SUCCESS OVERLAY MODAL */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0e16]/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#262a33] p-8 rounded-2xl shadow-2xl border border-[#68dba9]/40 flex flex-col items-center text-center gap-6 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 rounded-full bg-[#68dba9]/20 flex items-center justify-center text-[#68dba9] shadow-[0_0_24px_rgba(104,219,169,0.5)]">
              <span
                className="material-symbols-outlined text-4xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-mono text-[#68dba9] uppercase tracking-wider font-bold">
                Access Clearance Granted
              </span>
              <h2 className="font-display font-bold text-2xl text-[#dfe2ee]">Account Ready!</h2>
              <p className="text-xs text-[#bccac0] max-w-sm mt-1">
                Welcome to Get Apna Driver. Your profile is validated and encrypted on our Tier-4
                sovereign mobility rails.
              </p>
            </div>

            {/* Reward Credit Badge */}
            <div className="w-full bg-[#181c24] p-4 rounded-xl border border-[#3d4a42]/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#68dba9]/10 flex items-center justify-center text-[#68dba9]">
                  <span className="material-symbols-outlined">redeem</span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-[#dfe2ee]">₹200 Welcome Credit</span>
                  <span className="text-[10px] font-mono text-[#68dba9]">
                    Applied to first trip invoice
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono bg-[#68dba9] text-[#003825] px-2.5 py-1 rounded font-bold uppercase">
                Active
              </span>
            </div>

            {/* Interactive Next Step Trigger */}
            <div className="w-full flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push('/bookings/new')}
                className="flex-1 px-6 py-3 bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] rounded-xl font-mono text-xs font-bold uppercase tracking-wider shadow-[0_0_16px_-2px_rgba(5,150,105,0.4)] flex items-center justify-center gap-2 transition-colors"
              >
                Book First Chauffeur
                <span className="material-symbols-outlined text-sm">speed</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCompletionModal(false)}
                className="px-5 py-3 bg-[#181c24] hover:bg-[#353942] text-[#dfe2ee] rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-colors border border-[#3d4a42]"
              >
                Dismiss
              </button>
            </div>

            <span className="text-[10px] font-mono text-[#bccac0]">
              System Auth Token: 89f4b-chffr-92a01
            </span>
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

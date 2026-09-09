'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [tripMode, setTripMode] = useState<'hourly' | 'oneway' | 'outstation' | 'monthly'>(
    'hourly',
  );
  const [pickupNode, setPickupNode] = useState('DLF Phase 5, Gurugram');
  const [deploymentWindow, setDeploymentWindow] = useState('Today, 19:30 (Instant)');
  const [vehicleProfile, setVehicleProfile] = useState('Sedan / Luxury (Automatic)');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const faqs = [
    {
      question: 'How are Get Apna Driver chauffeurs vetted?',
      answer:
        'Every chauffeur undergoes a rigorous 50-point screening process including criminal background checks via state police registries, biometric fingerprint verification, drug screening, prior employment audits, and a mandatory 15-point practical driving examination in both manual and automatic luxury vehicles.',
    },
    {
      question: 'Is my vehicle insured during the trip?',
      answer:
        'Yes. All bookings on Get Apna Driver automatically include secondary trip protection coverage up to ₹5,00,000 for incidental vehicular damage during the active booking lifecycle, backed by our zero-incident SLA guarantee.',
    },
    {
      question: 'Can I book a driver for late-night party return trips?',
      answer:
        'Absolutely. Our live dispatch radar operates 24/7. You can book an executive chauffeur up to 30 days in advance or request instant dispatch for safe, late-night transit back home in your personal vehicle.',
    },
    {
      question: 'How are hourly and outstation fares calculated?',
      answer:
        'Fares are 100% transparent with zero cash surge fees. Hourly rentals start at ₹149/hr for standard city commutes (minimum 2 hours), while outstation daily packages are calculated on a transparent 12-hour / 24-hour flat slab with food & accommodation allowances included.',
    },
  ];

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#0f131c] text-[#dfe2ee] font-sans antialiased selection:bg-[#68dba9] selection:text-[#003825]">
      {/* HEADER NAVBAR */}
      <header className="fixed top-0 w-full z-50 bg-[#0f131c]/90 backdrop-blur-xl border-b border-[#262a33]/60 shadow-[0_1px_8px_rgba(0,0,0,0.3)]">
        <div className="h-20 w-full px-4 md:px-8 max-w-[1440px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-[#262a33] flex items-center justify-center text-[#68dba9] group-hover:scale-105 transition-transform shadow-md">
                <span className="material-symbols-outlined text-2xl">local_taxi</span>
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight text-[#dfe2ee] block leading-none font-['Space_Grotesk']">
                  GET APNA DRIVER
                </span>
                <span className="text-[10px] font-semibold uppercase text-[#68dba9] tracking-widest block mt-0.5 font-['Space_Grotesk']">
                  Elite Mobility Network
                </span>
              </div>
            </Link>

            {/* Portal Switcher Pill Navigation */}
            <div className="hidden xl:flex items-center bg-[#0a0e16] p-1 rounded-full border border-[#262a33]">
              <Link
                href="/"
                className="px-4 py-1.5 rounded-full text-xs font-medium bg-[#1c2028] text-[#dfe2ee] shadow-[0_1px_4px_rgba(0,0,0,0.4)]"
              >
                Public Website
              </Link>
              <Link
                href="/bookings"
                className="px-4 py-1.5 rounded-full text-xs font-medium text-[#bccac0] hover:text-[#dfe2ee] transition-colors"
              >
                Customer Hub
              </Link>
              <Link
                href="/driver/bookings"
                className="px-4 py-1.5 rounded-full text-xs font-medium text-[#bccac0] hover:text-[#dfe2ee] transition-colors"
              >
                Driver Partner Portal
              </Link>
              <Link
                href="/admin/drivers"
                className="px-4 py-1.5 rounded-full text-xs font-medium text-[#bccac0] hover:text-[#dfe2ee] transition-colors"
              >
                Enterprise Admin
              </Link>
            </div>
          </div>

          {/* Quick Search */}
          <div className="hidden lg:flex items-center bg-[#0a0e16] px-3.5 py-1.5 rounded-xl w-64 justify-between border border-[#262a33]">
            <button
              onClick={() => setSearchModalOpen(true)}
              className="flex items-center gap-2 text-[#bccac0] text-xs w-full text-left"
            >
              <span className="material-symbols-outlined text-base">search</span>
              <span>Search drivers, routes...</span>
            </button>
            <kbd className="bg-[#262a33] px-1.5 py-0.5 rounded text-[#bccac0] text-[10px] font-mono">
              ⌘K
            </kbd>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-[#181c24] px-3 py-1.5 rounded-full border border-[#262a33]">
              <span className="material-symbols-outlined text-[#68dba9] text-base">
                location_on
              </span>
              <span className="text-xs font-mono text-[#dfe2ee]">South Delhi / NCR</span>
              <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-ping ml-1" />
            </div>

            <button
              aria-label="Notifications"
              onClick={() => setSearchModalOpen(true)}
              className="relative w-9 h-9 rounded-xl bg-[#181c24] hover:bg-[#1c2028] text-[#bccac0] hover:text-[#dfe2ee] flex items-center justify-center transition-colors border border-[#262a33]"
            >
              <span className="material-symbols-outlined text-lg">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#68dba9]" />
            </button>

            <Link href="/profile" className="flex items-center gap-2 pl-1">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-[#68dba9]/20 border border-[#68dba9] flex items-center justify-center text-[#68dba9] font-bold text-xs">
                  AD
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#0f131c] rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#68dba9] text-[10px]">
                    verified
                  </span>
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* Sub-Nav Bar */}
        <div className="w-full bg-[#0a0e16]/80 backdrop-blur-md px-4 md:px-8 border-t border-[#262a33]/40">
          <nav className="max-w-[1440px] mx-auto flex items-center gap-8 h-10 overflow-x-auto text-xs">
            <Link href="/" className="whitespace-nowrap text-[#68dba9] font-bold">
              Home
            </Link>
            <a
              href="#how-it-works"
              className="text-[#bccac0] hover:text-[#dfe2ee] whitespace-nowrap transition-colors"
            >
              How It Works
            </a>
            <a
              href="#trust-safety"
              className="text-[#bccac0] hover:text-[#dfe2ee] whitespace-nowrap transition-colors"
            >
              Safety & Verification
            </a>
            <a
              href="#chauffeurs"
              className="text-[#bccac0] hover:text-[#dfe2ee] whitespace-nowrap transition-colors"
            >
              Top Drivers
            </a>
            <Link
              href="/driver/onboarding"
              className="text-[#bccac0] hover:text-[#dfe2ee] whitespace-nowrap transition-colors"
            >
              For Drivers
            </Link>
            <Link
              href="/bookings/new"
              className="text-[#bccac0] hover:text-[#dfe2ee] whitespace-nowrap transition-colors"
            >
              Book Chauffeur
            </Link>
          </nav>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="w-full pt-32">
        {/* SECTION 1: HERO & LIVE DISPATCH RADAR */}
        <section className="relative w-full overflow-hidden px-4 md:px-8 py-12 lg:py-20">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[#68dba9]/10 blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 right-0 w-80 h-80 rounded-full bg-[#0053db]/15 blur-3xl pointer-events-none" />

          <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
            {/* Left Column: Value Prop & Tactical Search Engine */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="flex items-center gap-2.5 w-fit bg-[#181c24] px-4 py-1.5 rounded-full border border-[#262a33]">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#68dba9] animate-ping" />
                <span className="font-bold text-xs uppercase tracking-wider text-[#68dba9] font-['Space_Grotesk']">
                  Live Dispatch Mesh Active
                </span>
                <span className="text-xs font-mono text-[#bccac0]">| 412 Drivers Ready in NCR</span>
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#dfe2ee] leading-[1.08] font-['Space_Grotesk']">
                  Find a Trusted Driver.
                  <br />
                  <span className="text-[#68dba9]">Wherever</span> You Need One.
                </h1>
                <p className="text-base sm:text-lg text-[#bccac0] max-w-2xl">
                  Book background-verified, executive chauffeurs for your personal car on demand,
                  hourly, or outstation. Rated 4.9/5 across 185,000+ completed journeys.
                </p>
              </div>

              {/* Integrated Tactical Booking Widget */}
              <div className="w-full bg-[#1c2028] rounded-2xl p-5 md:p-6 shadow-2xl border border-[#262a33] flex flex-col gap-5">
                {/* Trip Mode Switcher */}
                <div className="flex flex-wrap items-center gap-2 bg-[#0a0e16] p-1.5 rounded-xl border border-[#262a33]">
                  <button
                    type="button"
                    onClick={() => setTripMode('hourly')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all font-['Space_Grotesk'] ${
                      tripMode === 'hourly'
                        ? 'bg-[#1c2028] text-[#68dba9] shadow-md border border-[#3d4a42]'
                        : 'text-[#bccac0] hover:text-[#dfe2ee]'
                    }`}
                  >
                    Hourly Rental
                  </button>
                  <button
                    type="button"
                    onClick={() => setTripMode('oneway')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all font-['Space_Grotesk'] ${
                      tripMode === 'oneway'
                        ? 'bg-[#1c2028] text-[#68dba9] shadow-md border border-[#3d4a42]'
                        : 'text-[#bccac0] hover:text-[#dfe2ee]'
                    }`}
                  >
                    One-Way Drop
                  </button>
                  <button
                    type="button"
                    onClick={() => setTripMode('outstation')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all font-['Space_Grotesk'] ${
                      tripMode === 'outstation'
                        ? 'bg-[#1c2028] text-[#68dba9] shadow-md border border-[#3d4a42]'
                        : 'text-[#bccac0] hover:text-[#dfe2ee]'
                    }`}
                  >
                    Outstation Trip
                  </button>
                  <button
                    type="button"
                    onClick={() => setTripMode('monthly')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all font-['Space_Grotesk'] ${
                      tripMode === 'monthly'
                        ? 'bg-[#1c2028] text-[#68dba9] shadow-md border border-[#3d4a42]'
                        : 'text-[#bccac0] hover:text-[#dfe2ee]'
                    }`}
                  >
                    Monthly Dedicated
                  </button>
                </div>

                {/* Input Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Pickup Location */}
                  <div className="bg-[#181c24] rounded-xl p-3.5 border border-[#262a33] flex flex-col justify-between">
                    <label className="text-[10px] font-bold uppercase text-[#bccac0] tracking-wider flex items-center gap-1 font-['Space_Grotesk']">
                      <span className="material-symbols-outlined text-sm text-[#68dba9]">
                        my_location
                      </span>
                      Pickup Node
                    </label>
                    <input
                      type="text"
                      value={pickupNode}
                      onChange={(e) => setPickupNode(e.target.value)}
                      className="bg-transparent text-sm text-[#dfe2ee] font-medium focus:outline-none w-full mt-1"
                      placeholder="Enter landmark or street"
                    />
                    <span className="text-[10px] font-mono text-[#68dba9]/80 mt-1">
                      Radar locked: Sector 54 hub
                    </span>
                  </div>

                  {/* Deployment Window */}
                  <div className="bg-[#181c24] rounded-xl p-3.5 border border-[#262a33] flex flex-col justify-between">
                    <label className="text-[10px] font-bold uppercase text-[#bccac0] tracking-wider flex items-center gap-1 font-['Space_Grotesk']">
                      <span className="material-symbols-outlined text-sm text-[#68dba9]">
                        schedule
                      </span>
                      Deployment Window
                    </label>
                    <input
                      type="text"
                      value={deploymentWindow}
                      onChange={(e) => setDeploymentWindow(e.target.value)}
                      className="bg-transparent text-sm text-[#dfe2ee] font-medium focus:outline-none w-full mt-1"
                    />
                    <span className="text-[10px] font-mono text-[#bccac0] mt-1">
                      Estimated ETA: 6 mins
                    </span>
                  </div>

                  {/* Vehicle Specification */}
                  <div className="bg-[#181c24] rounded-xl p-3.5 border border-[#262a33] flex flex-col justify-between">
                    <label className="text-[10px] font-bold uppercase text-[#bccac0] tracking-wider flex items-center gap-1 font-['Space_Grotesk']">
                      <span className="material-symbols-outlined text-sm text-[#68dba9]">
                        directions_car
                      </span>
                      Your Vehicle Profile
                    </label>
                    <select
                      value={vehicleProfile}
                      onChange={(e) => setVehicleProfile(e.target.value)}
                      className="bg-transparent text-sm text-[#dfe2ee] font-medium focus:outline-none w-full mt-1 cursor-pointer"
                    >
                      <option className="bg-[#1c2028]">Sedan / Luxury (Automatic)</option>
                      <option className="bg-[#1c2028]">SUV / 4x4 (Automatic)</option>
                      <option className="bg-[#1c2028]">Hatchback / Compact (Manual)</option>
                      <option className="bg-[#1c2028]">Vintage / Electric (EV)</option>
                    </select>
                    <span className="text-[10px] font-mono text-[#bccac0] mt-1">
                      Chauffeur grade matched
                    </span>
                  </div>
                </div>

                {/* Submit CTA & Live Pulse */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#68dba9] text-xl">
                      verified_user
                    </span>
                    <span className="text-xs text-[#bccac0]">
                      Tier-1 Police verified + Drug-tested chauffeur deployment
                    </span>
                  </div>

                  <Link
                    href={`/bookings/new?mode=${tripMode}&pickup=${encodeURIComponent(pickupNode)}`}
                    className="w-full sm:w-auto px-6 py-3.5 bg-[#68dba9] text-[#003825] rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl hover:bg-[#85f8c4] transition-all font-['Space_Grotesk']"
                  >
                    <span>Search Verified Drivers</span>
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Radar Canvas & Floating Driver Profile */}
            <div className="lg:col-span-5 relative w-full flex flex-col items-center">
              {/* Radar Visualizer */}
              <div className="relative w-full aspect-square max-w-[460px] bg-[#0a0e16] rounded-3xl p-6 overflow-hidden shadow-2xl border border-[#262a33] flex items-center justify-center">
                {/* Concentric Telemetry Circles */}
                <div className="absolute w-80 h-80 rounded-full bg-[#1c2028]/50 border border-[#262a33]/60" />
                <div className="absolute w-56 h-56 rounded-full bg-[#1c2028]/80 border border-[#262a33]" />
                <div className="absolute w-32 h-32 rounded-full bg-[#68dba9]/10 animate-pulse border border-[#68dba9]/30" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#68dba9]/10 via-transparent to-transparent" />

                {/* Sweep Ray */}
                <div className="absolute inset-0 origin-center animate-radar-sweep pointer-events-none">
                  <div className="w-1/2 h-1/2 bg-gradient-to-br from-[#68dba9]/30 to-transparent origin-bottom-right transform rotate-45 rounded-tl-full" />
                </div>

                {/* Center Car Marker */}
                <div className="relative z-20 flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#68dba9] text-[#003825] flex items-center justify-center shadow-2xl">
                    <span className="material-symbols-outlined text-3xl">directions_car</span>
                  </div>
                  <div className="mt-2 bg-[#262a33] px-3 py-1 rounded-full shadow-md border border-[#3d4a42]">
                    <span className="text-[10px] font-bold text-[#dfe2ee] uppercase tracking-wider font-['Space_Grotesk']">
                      Owner Car Node
                    </span>
                  </div>
                </div>

                {/* Nearby Driver Ping 1 */}
                <div className="absolute top-12 left-16 z-20 flex items-center gap-1.5 group cursor-pointer">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#68dba9] ring-4 ring-[#68dba9]/20" />
                  <div className="bg-[#1c2028] px-2 py-0.5 rounded text-[#68dba9] font-mono text-[10px] shadow-md border border-[#3d4a42]">
                    4m away
                  </div>
                </div>

                {/* Nearby Driver Ping 2 */}
                <div className="absolute bottom-16 right-14 z-20 flex items-center gap-1.5 group cursor-pointer">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#4edea3] ring-4 ring-[#4edea3]/20" />
                  <div className="bg-[#1c2028] px-2 py-0.5 rounded text-[#dfe2ee] font-mono text-[10px] shadow-md border border-[#3d4a42]">
                    6m away
                  </div>
                </div>

                {/* Top Overlay: Telemetry Stats Bar */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-center bg-[#181c24]/90 backdrop-blur-md px-4 py-2 rounded-xl border border-[#262a33]">
                  <span className="font-mono text-[10px] text-[#bccac0] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-ping" /> RADAR: 2.5
                    KM SWEEP
                  </span>
                  <span className="font-bold text-[10px] text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk']">
                    9 Chauffeurs Online
                  </span>
                </div>
              </div>

              {/* Floating Driver Card Overlay */}
              <div className="-mt-14 relative z-30 w-full max-w-[420px] bg-[#262a33] rounded-2xl p-4 md:p-5 shadow-2xl border border-[#3d4a42]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-xl bg-[#68dba9]/20 border border-[#68dba9] flex items-center justify-center text-xl font-bold text-[#68dba9]">
                        RK
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#68dba9] text-[#003825] rounded-full flex items-center justify-center shadow">
                        <span className="material-symbols-outlined text-[12px]">verified</span>
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-base text-[#dfe2ee] font-['Space_Grotesk']">
                          Rajesh Kumar
                        </h4>
                        <span className="text-[9px] font-bold bg-[#68dba9]/20 text-[#68dba9] px-1.5 py-0.5 rounded font-['Space_Grotesk']">
                          TOP RATED
                        </span>
                      </div>
                      <p className="text-xs text-[#bccac0] mt-0.5">
                        8 yrs exp • Mercedes & BMW Specialist
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center justify-end text-[#68dba9] font-bold text-sm font-['Space_Grotesk']">
                      <span className="material-symbols-outlined text-sm mr-0.5">star</span>
                      4.96
                    </div>
                    <span className="font-mono text-[10px] text-[#bccac0]">1,420 trips</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 bg-[#0a0e16] px-4 py-2.5 rounded-xl flex items-center justify-between border border-[#1c2028]">
                  <div className="flex items-center gap-1.5 text-xs text-[#dfe2ee] font-mono">
                    <span className="material-symbols-outlined text-[#68dba9] text-base">
                      electric_bolt
                    </span>
                    <span>
                      Deploy ETA: <strong className="text-[#68dba9]">4 mins</strong>
                    </span>
                  </div>
                  <span className="font-bold text-base text-[#dfe2ee] font-['Space_Grotesk']">
                    ₹169<span className="text-xs text-[#bccac0] font-normal">/hr</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: TRUST & SAFETY TELEMETRY METRIC RIBBON */}
        <section
          id="trust-safety"
          className="w-full bg-[#0a0e16] py-12 px-4 md:px-8 border-y border-[#262a33]"
        >
          <div className="max-w-[1440px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#181c24] rounded-2xl p-6 flex items-start gap-4 shadow-sm border border-[#262a33] hover:border-[#68dba9]/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-[#68dba9]/15 text-[#68dba9] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">policy</span>
              </div>
              <div>
                <h4 className="font-bold text-base text-[#dfe2ee] font-['Space_Grotesk']">
                  100% Police Clearance
                </h4>
                <p className="text-xs text-[#bccac0] mt-1">
                  Verified criminal record check via state crime registry & biometric fingerprint.
                </p>
              </div>
            </div>

            <div className="bg-[#181c24] rounded-2xl p-6 flex items-start gap-4 shadow-sm border border-[#262a33] hover:border-[#68dba9]/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-[#68dba9]/15 text-[#68dba9] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">fact_check</span>
              </div>
              <div>
                <h4 className="font-bold text-base text-[#dfe2ee] font-['Space_Grotesk']">
                  50-Point Screening
                </h4>
                <p className="text-xs text-[#bccac0] mt-1">
                  Rigorous driving skill test, drug test, address validation & reference
                  cross-audits.
                </p>
              </div>
            </div>

            <div className="bg-[#181c24] rounded-2xl p-6 flex items-start gap-4 shadow-sm border border-[#262a33] hover:border-[#68dba9]/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-[#68dba9]/15 text-[#68dba9] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">security</span>
              </div>
              <div>
                <h4 className="font-bold text-base text-[#dfe2ee] font-['Space_Grotesk']">
                  Zero Incident Guarantee
                </h4>
                <p className="text-xs text-[#bccac0] mt-1">
                  Trip protection coverage up to ₹5,00,000 against incidental car damage.
                </p>
              </div>
            </div>

            <div className="bg-[#181c24] rounded-2xl p-6 flex items-start gap-4 shadow-sm border border-[#262a33] hover:border-[#68dba9]/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-[#68dba9]/15 text-[#68dba9] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">emergency_share</span>
              </div>
              <div>
                <h4 className="font-bold text-base text-[#dfe2ee] font-['Space_Grotesk']">
                  Live Telematics & SOS
                </h4>
                <p className="text-xs text-[#bccac0] mt-1">
                  Real-time GPS trip tracking, speed alerts, and 24/7 armed command desk response.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: HOW IT WORKS (4-STEP TACTICAL WORKFLOW) */}
        <section id="how-it-works" className="w-full bg-[#0f131c] px-4 md:px-8 py-20 relative">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#68dba9] block mb-1 font-['Space_Grotesk']">
                  Seamless Execution
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Effortless Chauffeur Deployment in 4 Steps
                </h2>
              </div>
              <p className="text-sm text-[#bccac0] max-w-md">
                Zero paperwork, zero negotiations. Your personal luxury or daily commute vehicle
                driven with white-glove respect.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
              {/* Step 1 */}
              <div className="bg-[#181c24] rounded-2xl p-6 flex flex-col justify-between group hover:bg-[#1c2028] transition-all border border-[#262a33] shadow-md">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-4xl font-bold text-[#3d4a42] group-hover:text-[#68dba9] transition-colors font-['Space_Grotesk']">
                      01
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-[#262a33] flex items-center justify-center text-[#68dba9]">
                      <span className="material-symbols-outlined text-xl">pin_drop</span>
                    </div>
                  </div>
                  <h3 className="font-bold text-lg text-[#dfe2ee] mb-2 font-['Space_Grotesk']">
                    Share Trip Coordinates
                  </h3>
                  <p className="text-xs text-[#bccac0]">
                    Specify your pickup node, trip type (hourly/outstation), and vehicle
                    transmission details.
                  </p>
                </div>
                <div className="mt-6 pt-4 bg-[#0a0e16] px-3 py-2 rounded-xl font-mono text-[11px] text-[#68dba9] flex items-center gap-1.5 border border-[#1c2028]">
                  <span className="material-symbols-outlined text-sm">check_circle</span> Instant
                  GPS geotagging
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-[#181c24] rounded-2xl p-6 flex flex-col justify-between group hover:bg-[#1c2028] transition-all border border-[#262a33] shadow-md">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-4xl font-bold text-[#3d4a42] group-hover:text-[#68dba9] transition-colors font-['Space_Grotesk']">
                      02
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-[#262a33] flex items-center justify-center text-[#68dba9]">
                      <span className="material-symbols-outlined text-xl">badge</span>
                    </div>
                  </div>
                  <h3 className="font-bold text-lg text-[#dfe2ee] mb-2 font-['Space_Grotesk']">
                    Select Verified Driver
                  </h3>
                  <p className="text-xs text-[#bccac0]">
                    Compare verified chauffeur profiles, languages spoken, luxury vehicle
                    certifications, and passenger ratings.
                  </p>
                </div>
                <div className="mt-6 pt-4 bg-[#0a0e16] px-3 py-2 rounded-xl font-mono text-[11px] text-[#68dba9] flex items-center gap-1.5 border border-[#1c2028]">
                  <span className="material-symbols-outlined text-sm">check_circle</span>{' '}
                  Transparent fixed rate cards
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-[#181c24] rounded-2xl p-6 flex flex-col justify-between group hover:bg-[#1c2028] transition-all border border-[#262a33] shadow-md">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-4xl font-bold text-[#3d4a42] group-hover:text-[#68dba9] transition-colors font-['Space_Grotesk']">
                      03
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-[#262a33] flex items-center justify-center text-[#68dba9]">
                      <span className="material-symbols-outlined text-xl">directions_walk</span>
                    </div>
                  </div>
                  <h3 className="font-bold text-lg text-[#dfe2ee] mb-2 font-['Space_Grotesk']">
                    Driver Arrives in Uniform
                  </h3>
                  <p className="text-xs text-[#bccac0]">
                    Your chauffeur arrives 10 minutes ahead in crisp uniform, takes custody of
                    vehicle keys, and logs odometer.
                  </p>
                </div>
                <div className="mt-6 pt-4 bg-[#0a0e16] px-3 py-2 rounded-xl font-mono text-[11px] text-[#68dba9] flex items-center gap-1.5 border border-[#1c2028]">
                  <span className="material-symbols-outlined text-sm">check_circle</span> Pre-trip
                  vehicle walkaround
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-[#181c24] rounded-2xl p-6 flex flex-col justify-between group hover:bg-[#1c2028] transition-all border border-[#262a33] shadow-md">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-4xl font-bold text-[#3d4a42] group-hover:text-[#68dba9] transition-colors font-['Space_Grotesk']">
                      04
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-[#262a33] flex items-center justify-center text-[#68dba9]">
                      <span className="material-symbols-outlined text-xl">payments</span>
                    </div>
                  </div>
                  <h3 className="font-bold text-lg text-[#dfe2ee] mb-2 font-['Space_Grotesk']">
                    Relax & Settle Post-Trip
                  </h3>
                  <p className="text-xs text-[#bccac0]">
                    Enjoy your commute or night out. Seamless automated billing via UPI, corporate
                    credit card, or monthly invoicing.
                  </p>
                </div>
                <div className="mt-6 pt-4 bg-[#0a0e16] px-3 py-2 rounded-xl font-mono text-[11px] text-[#68dba9] flex items-center gap-1.5 border border-[#1c2028]">
                  <span className="material-symbols-outlined text-sm">check_circle</span> Zero cash
                  surge surcharge
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: FEATURED TOP-RATED CHAUFFEURS */}
        <section
          id="chauffeurs"
          className="w-full bg-[#0a0e16] px-4 md:px-8 py-20 border-t border-[#262a33]"
        >
          <div className="max-w-[1440px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#68dba9] block mb-1 font-['Space_Grotesk']">
                  Elite Talent Roster
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Hand-Selected Executive Chauffeurs
                </h2>
              </div>
              <Link
                href="/bookings/new"
                className="flex items-center gap-1.5 font-mono text-xs text-[#68dba9] hover:text-[#85f8c4] transition-colors"
              >
                <span>View All 4,850+ Chauffeurs</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Chauffeur Card 1 */}
              <div className="bg-[#1c2028] rounded-2xl p-6 flex flex-col justify-between shadow-xl border border-[#262a33] hover:-translate-y-1 transition-transform">
                <div>
                  <div className="flex items-start gap-4 mb-5">
                    <div className="relative shrink-0">
                      <div className="w-20 h-20 rounded-2xl bg-[#68dba9]/20 border border-[#68dba9] flex items-center justify-center text-2xl font-bold text-[#68dba9]">
                        VS
                      </div>
                      <span className="absolute -bottom-2 -right-2 bg-[#68dba9] text-[#003825] rounded-full p-1 shadow">
                        <span className="material-symbols-outlined text-sm block">verified</span>
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-lg text-[#dfe2ee] truncate font-['Space_Grotesk']">
                          Vikramaditya S.
                        </h3>
                        <div className="flex items-center gap-1 text-[#68dba9] font-bold text-sm font-['Space_Grotesk']">
                          <span className="material-symbols-outlined text-sm">star</span>
                          4.98
                        </div>
                      </div>
                      <p className="text-xs text-[#bccac0] mt-0.5">
                        Ex-Hotel Taj Ambassador Chauffeur
                      </p>
                      <span className="inline-block mt-2 font-mono text-[11px] text-[#bccac0]">
                        11 Years Experience • 2,890 Trips
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-5">
                    <span className="bg-[#262a33] text-[#dfe2ee] px-2.5 py-1 rounded-md font-mono text-[10px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-[#68dba9]">
                        auto_transmission
                      </span>{' '}
                      Automatic & Manual
                    </span>
                    <span className="bg-[#262a33] text-[#dfe2ee] px-2.5 py-1 rounded-md font-mono text-[10px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-[#68dba9]">
                        shield
                      </span>{' '}
                      VVIP Protocol Certified
                    </span>
                    <span className="bg-[#262a33] text-[#dfe2ee] px-2.5 py-1 rounded-md font-mono text-[10px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-[#68dba9]">
                        airport_shuttle
                      </span>{' '}
                      German Luxury Cars
                    </span>
                  </div>

                  <p className="text-xs text-[#bccac0] line-clamp-2">
                    Fluent in English & Hindi. Specialized in long-distance night driving, Mercedes
                    S-Class, BMW 7-Series, and Audi A8 handling.
                  </p>
                </div>

                <div className="mt-6 pt-4 bg-[#181c24] px-4 py-3 rounded-xl flex items-center justify-between border border-[#262a33]">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#bccac0] block font-['Space_Grotesk']">
                      Hourly Base Tariff
                    </span>
                    <div className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                      ₹159<span className="text-xs text-[#bccac0] font-normal"> /hr</span>
                    </div>
                  </div>
                  <Link
                    href="/bookings/new"
                    className="px-4 py-2 bg-[#68dba9] text-[#003825] rounded-xl font-bold text-xs hover:bg-[#85f8c4] transition-colors flex items-center gap-1.5 shadow font-['Space_Grotesk']"
                  >
                    <span>Quick Book</span>
                    <span className="material-symbols-outlined text-sm">calendar_month</span>
                  </Link>
                </div>
              </div>

              {/* Chauffeur Card 2 */}
              <div className="bg-[#1c2028] rounded-2xl p-6 flex flex-col justify-between shadow-xl border border-[#262a33] hover:-translate-y-1 transition-transform">
                <div>
                  <div className="flex items-start gap-4 mb-5">
                    <div className="relative shrink-0">
                      <div className="w-20 h-20 rounded-2xl bg-[#68dba9]/20 border border-[#68dba9] flex items-center justify-center text-2xl font-bold text-[#68dba9]">
                        MS
                      </div>
                      <span className="absolute -bottom-2 -right-2 bg-[#68dba9] text-[#003825] rounded-full p-1 shadow">
                        <span className="material-symbols-outlined text-sm block">verified</span>
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-lg text-[#dfe2ee] truncate font-['Space_Grotesk']">
                          Manpreet Singh
                        </h3>
                        <div className="flex items-center gap-1 text-[#68dba9] font-bold text-sm font-['Space_Grotesk']">
                          <span className="material-symbols-outlined text-sm">star</span>
                          4.97
                        </div>
                      </div>
                      <p className="text-xs text-[#bccac0] mt-0.5">
                        Executive SUV & Highway Expert
                      </p>
                      <span className="inline-block mt-2 font-mono text-[11px] text-[#bccac0]">
                        9 Years Experience • 2,140 Trips
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-5">
                    <span className="bg-[#262a33] text-[#dfe2ee] px-2.5 py-1 rounded-md font-mono text-[10px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-[#68dba9]">
                        terrain
                      </span>{' '}
                      Hills & Highway Pro
                    </span>
                    <span className="bg-[#262a33] text-[#dfe2ee] px-2.5 py-1 rounded-md font-mono text-[10px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-[#68dba9]">
                        ev_station
                      </span>{' '}
                      EV Specialist
                    </span>
                    <span className="bg-[#262a33] text-[#dfe2ee] px-2.5 py-1 rounded-md font-mono text-[10px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-[#68dba9]">
                        translate
                      </span>{' '}
                      English, Punjabi, Hindi
                    </span>
                  </div>

                  <p className="text-xs text-[#bccac0] line-clamp-2">
                    Expert handling on Fortuner, Defender, Range Rover, and Volvo XC90. Non-smoker
                    with defensive driver training certification.
                  </p>
                </div>

                <div className="mt-6 pt-4 bg-[#181c24] px-4 py-3 rounded-xl flex items-center justify-between border border-[#262a33]">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#bccac0] block font-['Space_Grotesk']">
                      Hourly Base Tariff
                    </span>
                    <div className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                      ₹149<span className="text-xs text-[#bccac0] font-normal"> /hr</span>
                    </div>
                  </div>
                  <Link
                    href="/bookings/new"
                    className="px-4 py-2 bg-[#68dba9] text-[#003825] rounded-xl font-bold text-xs hover:bg-[#85f8c4] transition-colors flex items-center gap-1.5 shadow font-['Space_Grotesk']"
                  >
                    <span>Quick Book</span>
                    <span className="material-symbols-outlined text-sm">calendar_month</span>
                  </Link>
                </div>
              </div>

              {/* Chauffeur Card 3 */}
              <div className="bg-[#1c2028] rounded-2xl p-6 flex flex-col justify-between shadow-xl border border-[#262a33] hover:-translate-y-1 transition-transform">
                <div>
                  <div className="flex items-start gap-4 mb-5">
                    <div className="relative shrink-0">
                      <div className="w-20 h-20 rounded-2xl bg-[#68dba9]/20 border border-[#68dba9] flex items-center justify-center text-2xl font-bold text-[#68dba9]">
                        AJ
                      </div>
                      <span className="absolute -bottom-2 -right-2 bg-[#68dba9] text-[#003825] rounded-full p-1 shadow">
                        <span className="material-symbols-outlined text-sm block">verified</span>
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-lg text-[#dfe2ee] truncate font-['Space_Grotesk']">
                          Amitabh Joshi
                        </h3>
                        <div className="flex items-center gap-1 text-[#68dba9] font-bold text-sm font-['Space_Grotesk']">
                          <span className="material-symbols-outlined text-sm">star</span>
                          4.95
                        </div>
                      </div>
                      <p className="text-xs text-[#bccac0] mt-0.5">
                        Corporate Fleet & Airport Transfer Specialist
                      </p>
                      <span className="inline-block mt-2 font-mono text-[11px] text-[#bccac0]">
                        7 Years Experience • 1,760 Trips
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-5">
                    <span className="bg-[#262a33] text-[#dfe2ee] px-2.5 py-1 rounded-md font-mono text-[10px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-[#68dba9]">
                        local_police
                      </span>{' '}
                      Special Police Cleared
                    </span>
                    <span className="bg-[#262a33] text-[#dfe2ee] px-2.5 py-1 rounded-md font-mono text-[10px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-[#68dba9]">
                        schedule
                      </span>{' '}
                      100% Punctuality Index
                    </span>
                    <span className="bg-[#262a33] text-[#dfe2ee] px-2.5 py-1 rounded-md font-mono text-[10px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-[#68dba9]">
                        lock
                      </span>{' '}
                      Discretion NDA Signed
                    </span>
                  </div>

                  <p className="text-xs text-[#bccac0] line-clamp-2">
                    Specially trained for late-night city party pickups, airport transfers, and
                    corporate executive daily round-trips.
                  </p>
                </div>

                <div className="mt-6 pt-4 bg-[#181c24] px-4 py-3 rounded-xl flex items-center justify-between border border-[#262a33]">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#bccac0] block font-['Space_Grotesk']">
                      Hourly Base Tariff
                    </span>
                    <div className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                      ₹149<span className="text-xs text-[#bccac0] font-normal"> /hr</span>
                    </div>
                  </div>
                  <Link
                    href="/bookings/new"
                    className="px-4 py-2 bg-[#68dba9] text-[#003825] rounded-xl font-bold text-xs hover:bg-[#85f8c4] transition-colors flex items-center gap-1.5 shadow font-['Space_Grotesk']"
                  >
                    <span>Quick Book</span>
                    <span className="material-symbols-outlined text-sm">calendar_month</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: LIVE OPERATIONAL STATS WITH COUNTERS */}
        <section className="w-full bg-[#0f131c] px-4 md:px-8 py-16">
          <div className="max-w-[1440px] mx-auto bg-[#181c24] rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl border border-[#262a33]">
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-[#68dba9]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#68dba9] block mb-1 font-['Space_Grotesk']">
                  Real-Time Operational Mesh
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Network Velocity & Performance Metrics
                </h2>
              </div>
              <div className="flex items-center gap-2 bg-[#1c2028] px-4 py-2 rounded-xl border border-[#262a33]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#68dba9] animate-ping" />
                <span className="font-mono text-xs text-[#dfe2ee]">TELEMETRY SYNCED: JUST NOW</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Stat 1 */}
              <div className="flex flex-col bg-[#0a0e16] p-6 rounded-2xl border border-[#1c2028]">
                <span className="text-4xl lg:text-5xl font-bold text-[#68dba9] font-['Space_Grotesk']">
                  4,850+
                </span>
                <span className="font-bold text-lg text-[#dfe2ee] mt-1 font-['Space_Grotesk']">
                  Active Verified Drivers
                </span>
                <p className="text-xs text-[#bccac0] mt-2">
                  Ready for instant dispatch across NCR, Mumbai, Bengaluru & Pune.
                </p>
              </div>

              {/* Stat 2 */}
              <div className="flex flex-col bg-[#0a0e16] p-6 rounded-2xl border border-[#1c2028]">
                <span className="text-4xl lg:text-5xl font-bold text-[#b4c5ff] font-['Space_Grotesk']">
                  185,000+
                </span>
                <span className="font-bold text-lg text-[#dfe2ee] mt-1 font-['Space_Grotesk']">
                  Journeys Completed
                </span>
                <p className="text-xs text-[#bccac0] mt-2">
                  Zero major accidents recorded since network inception.
                </p>
              </div>

              {/* Stat 3 */}
              <div className="flex flex-col bg-[#0a0e16] p-6 rounded-2xl border border-[#1c2028]">
                <span className="text-4xl lg:text-5xl font-bold text-[#4edea3] font-['Space_Grotesk']">
                  99.4%
                </span>
                <span className="font-bold text-lg text-[#dfe2ee] mt-1 font-['Space_Grotesk']">
                  On-Time Arrival SLA
                </span>
                <p className="text-xs text-[#bccac0] mt-2">
                  Average arrival window is within 8 minutes of target schedule.
                </p>
              </div>

              {/* Stat 4 */}
              <div className="flex flex-col bg-[#0a0e16] p-6 rounded-2xl border border-[#1c2028]">
                <span className="text-4xl lg:text-5xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  14
                </span>
                <span className="font-bold text-lg text-[#dfe2ee] mt-1 font-['Space_Grotesk']">
                  Metropolitan Cities
                </span>
                <p className="text-xs text-[#bccac0] mt-2">
                  Complete coverage in Tier-1 corridors and satellite financial districts.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: DRIVER PARTNER RECRUITMENT BANNER */}
        <section className="w-full bg-[#0a0e16] px-4 md:px-8 py-20 border-t border-[#262a33]">
          <div className="max-w-[1440px] mx-auto bg-gradient-to-r from-[#1c2028] to-[#262a33] rounded-3xl p-8 md:p-12 shadow-2xl border border-[#3d4a42] relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              <div className="lg:col-span-8 space-y-4">
                <div className="flex items-center gap-2 bg-[#68dba9]/20 px-4 py-1.5 rounded-full w-fit border border-[#68dba9]/30">
                  <span className="material-symbols-outlined text-[#68dba9] text-base">
                    handshake
                  </span>
                  <span className="text-xs font-bold text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk']">
                    Driver Partner Enrollment Open
                  </span>
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#dfe2ee] leading-tight font-['Space_Grotesk']">
                  Earn up to <span className="text-[#68dba9]">₹45,000/month</span> Driving Executive
                  Cars.
                </h2>
                <p className="text-base text-[#bccac0] max-w-2xl">
                  Join India&apos;s highest-paying chauffeur network. Flexible 4-hr, 8-hr or 12-hr
                  duty slots, instant daily UPI payouts, accidental insurance coverage, and
                  respectful corporate clientele.
                </p>

                <div className="flex flex-wrap items-center gap-6 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#68dba9] text-base">
                      currency_rupee
                    </span>
                    <span className="font-mono text-xs text-[#dfe2ee]">Daily UPI Settlements</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#68dba9] text-base">
                      health_and_safety
                    </span>
                    <span className="font-mono text-xs text-[#dfe2ee]">
                      ₹10 Lakh Medical Shield
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#68dba9] text-base">
                      hotel_class
                    </span>
                    <span className="font-mono text-xs text-[#dfe2ee]">Zero Surge Commissions</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 flex flex-col items-start lg:items-end gap-3">
                <Link
                  href="/driver/onboarding"
                  className="w-full sm:w-auto px-8 py-4 bg-[#68dba9] text-[#003825] font-bold text-base rounded-2xl flex items-center justify-center gap-2 shadow-2xl hover:bg-[#85f8c4] transition-all text-center font-['Space_Grotesk']"
                >
                  <span>Become a Driver Partner</span>
                  <span className="material-symbols-outlined">north_east</span>
                </Link>
                <span className="font-mono text-[10px] text-[#bccac0] text-center lg:text-right w-full">
                  Requires valid Commercial/LMV license & minimum 3 yrs experience.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 7: TESTIMONIALS & FAQ ACCORDION */}
        <section className="w-full bg-[#0f131c] px-4 md:px-8 py-20">
          <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left Column: Testimonials */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#68dba9] block mb-1 font-['Space_Grotesk']">
                  Executive Praise
                </span>
                <h2 className="text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Trusted by CEOs, Doctors & Families
                </h2>
              </div>

              {/* Review Card 1 */}
              <div className="bg-[#181c24] p-6 rounded-2xl border border-[#262a33] shadow-md">
                <div className="flex items-center gap-1 text-[#68dba9] mb-3">
                  <span className="material-symbols-outlined text-sm">star</span>
                  <span className="material-symbols-outlined text-sm">star</span>
                  <span className="material-symbols-outlined text-sm">star</span>
                  <span className="material-symbols-outlined text-sm">star</span>
                  <span className="material-symbols-outlined text-sm">star</span>
                </div>
                <p className="text-sm text-[#dfe2ee] mb-4 italic leading-relaxed">
                  &quot;I frequently host visiting delegates from Europe. Get Apna Driver provides
                  chauffeurs who understand executive etiquette, smooth braking, and route
                  optimization. Truly five-star service.&quot;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#262a33] flex items-center justify-center text-[#68dba9] font-bold text-sm font-['Space_Grotesk']">
                    AK
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                      Arjun Kapoor
                    </h4>
                    <p className="text-xs text-[#bccac0]">
                      Managing Partner, Nexus Capital • South Delhi
                    </p>
                  </div>
                </div>
              </div>

              {/* Review Card 2 */}
              <div className="bg-[#181c24] p-6 rounded-2xl border border-[#262a33] shadow-md">
                <div className="flex items-center gap-1 text-[#68dba9] mb-3">
                  <span className="material-symbols-outlined text-sm">star</span>
                  <span className="material-symbols-outlined text-sm">star</span>
                  <span className="material-symbols-outlined text-sm">star</span>
                  <span className="material-symbols-outlined text-sm">star</span>
                  <span className="material-symbols-outlined text-sm">star</span>
                </div>
                <p className="text-sm text-[#dfe2ee] mb-4 italic leading-relaxed">
                  &quot;Booked an outstation driver for a 4-day trip to Jaipur in my BMW 5-Series.
                  The driver was impeccably mannered, never exceeded 90 km/h, and kept the car
                  spotless throughout.&quot;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#262a33] flex items-center justify-center text-[#68dba9] font-bold text-sm font-['Space_Grotesk']">
                    RS
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                      Dr. Radhika Sen
                    </h4>
                    <p className="text-xs text-[#bccac0]">Senior Cardiologist, Gurugram</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: FAQ Accordion */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#68dba9] block mb-1 font-['Space_Grotesk']">
                  Resolution Desk
                </span>
                <h2 className="text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Frequently Asked Questions
                </h2>
              </div>

              <div className="space-y-4">
                {faqs.map((faq, index) => {
                  const isOpen = openFaqIndex === index;
                  return (
                    <div
                      key={faq.question}
                      className="bg-[#181c24] border border-[#262a33] rounded-2xl overflow-hidden transition-colors"
                    >
                      <button
                        onClick={() => toggleFaq(index)}
                        className="w-full p-6 text-left flex items-center justify-between gap-4 font-bold text-base text-[#dfe2ee] hover:text-[#68dba9] transition-colors font-['Space_Grotesk']"
                      >
                        <span>{faq.question}</span>
                        <span className="material-symbols-outlined text-xl text-[#68dba9] shrink-0">
                          {isOpen ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="px-6 pb-6 text-xs text-[#bccac0] leading-relaxed border-t border-[#262a33]/60 pt-4">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 8: FINAL CONVERSION CTA */}
        <section className="w-full bg-[#0a0e16] px-4 md:px-8 py-20 border-t border-[#262a33]">
          <div className="max-w-[1440px] mx-auto bg-[#181c24] rounded-3xl p-10 md:p-16 text-center space-y-6 relative overflow-hidden border border-[#262a33] shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-[#68dba9]/20 text-[#68dba9] flex items-center justify-center mx-auto mb-2 border border-[#68dba9]/40">
              <span className="material-symbols-outlined text-3xl">directions_car</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#dfe2ee] max-w-3xl mx-auto font-['Space_Grotesk'] leading-tight">
              Ready to Experience First-Class Chauffeur Service?
            </h2>

            <p className="text-sm sm:text-base text-[#bccac0] max-w-xl mx-auto">
              Book within 60 seconds. Chauffeur arrives in under 15 minutes across prime NCR nodes.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/bookings/new"
                className="w-full sm:w-auto px-8 py-4 bg-[#68dba9] text-[#003825] font-bold text-sm rounded-xl hover:bg-[#85f8c4] transition-all shadow-xl font-['Space_Grotesk']"
              >
                Book Chauffeur Now &rarr;
              </Link>
              <Link
                href="/bookings"
                className="w-full sm:w-auto px-8 py-4 bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] font-bold text-sm rounded-xl transition-all border border-[#3d4a42] font-['Space_Grotesk']"
              >
                Explore Rate Cards
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* SEARCH MODAL DIALOG */}
      {searchModalOpen && (
        <div className="fixed inset-0 bg-[#0a0e16]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c2028] border border-[#3d4a42] rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
              <h3 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk'] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#68dba9]">search</span>
                Search Drivers & Locations
              </h3>
              <button
                onClick={() => setSearchModalOpen(false)}
                className="text-[#bccac0] hover:text-[#dfe2ee]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type location, driver name, or booking ID..."
                className="w-full bg-[#0a0e16] border border-[#262a33] rounded-xl px-4 py-3 text-sm text-[#dfe2ee] focus:outline-none focus:ring-2 focus:ring-[#68dba9]"
                autoFocus
              />
            </div>

            <div className="space-y-2 pt-2 text-xs">
              <span className="text-[10px] font-bold uppercase text-[#bccac0] font-['Space_Grotesk']">
                Quick Links
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/bookings/new"
                  onClick={() => setSearchModalOpen(false)}
                  className="p-3 bg-[#181c24] hover:bg-[#262a33] rounded-xl text-[#dfe2ee] flex items-center gap-2 border border-[#262a33]"
                >
                  <span className="material-symbols-outlined text-[#68dba9] text-base">
                    add_circle
                  </span>
                  Create New Booking
                </Link>
                <Link
                  href="/bookings"
                  onClick={() => setSearchModalOpen(false)}
                  className="p-3 bg-[#181c24] hover:bg-[#262a33] rounded-xl text-[#dfe2ee] flex items-center gap-2 border border-[#262a33]"
                >
                  <span className="material-symbols-outlined text-[#68dba9] text-base">
                    history
                  </span>
                  My Bookings
                </Link>
                <Link
                  href="/driver/bookings"
                  onClick={() => setSearchModalOpen(false)}
                  className="p-3 bg-[#181c24] hover:bg-[#262a33] rounded-xl text-[#dfe2ee] flex items-center gap-2 border border-[#262a33]"
                >
                  <span className="material-symbols-outlined text-[#68dba9] text-base">badge</span>
                  Driver Portal
                </Link>
                <Link
                  href="/admin/drivers"
                  onClick={() => setSearchModalOpen(false)}
                  className="p-3 bg-[#181c24] hover:bg-[#262a33] rounded-xl text-[#dfe2ee] flex items-center gap-2 border border-[#262a33]"
                >
                  <span className="material-symbols-outlined text-[#68dba9] text-base">
                    admin_panel_settings
                  </span>
                  Enterprise Admin
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="w-full bg-[#0a0e16] text-[#bccac0] pt-16 pb-12 px-4 md:px-8 border-t border-[#262a33]">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-[#262a33]">
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#262a33] flex items-center justify-center text-[#68dba9]">
                <span className="material-symbols-outlined text-xl">local_taxi</span>
              </div>
              <span className="font-bold text-base tracking-tight text-[#dfe2ee] font-['Space_Grotesk']">
                GET APNA DRIVER
              </span>
            </Link>
            <p className="text-xs text-[#bccac0] max-w-sm leading-relaxed">
              India&apos;s premier executive chauffeur network for personal luxury and commute cars.
              100% background verified, police cleared, with live telemetry tracking.
            </p>

            <div className="flex items-center gap-4 text-xs font-mono pt-2">
              <span className="flex items-center gap-1.5 text-[#68dba9]">
                <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-ping" /> SOS DESK: LIVE
              </span>
              <span>•</span>
              <span>24/7 GPS TELEMETRY</span>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-xs uppercase text-[#dfe2ee] tracking-wider mb-4 font-['Space_Grotesk']">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/bookings/new" className="hover:text-[#68dba9] transition-colors">
                  Book Chauffeur
                </Link>
              </li>
              <li>
                <Link href="/bookings" className="hover:text-[#68dba9] transition-colors">
                  Customer Hub
                </Link>
              </li>
              <li>
                <Link href="/driver/onboarding" className="hover:text-[#68dba9] transition-colors">
                  Driver Partner Enrollment
                </Link>
              </li>
              <li>
                <Link href="/admin/drivers" className="hover:text-[#68dba9] transition-colors">
                  Enterprise Admin
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-xs uppercase text-[#dfe2ee] tracking-wider mb-4 font-['Space_Grotesk']">
              Trust & Security
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a href="#trust-safety" className="hover:text-[#68dba9] transition-colors">
                  Police Verification Protocol
                </a>
              </li>
              <li>
                <a href="#trust-safety" className="hover:text-[#68dba9] transition-colors">
                  Emergency Response SOS
                </a>
              </li>
              <li>
                <a href="#trust-safety" className="hover:text-[#68dba9] transition-colors">
                  Zero Incident Protection
                </a>
              </li>
              <li>
                <a href="#trust-safety" className="hover:text-[#68dba9] transition-colors">
                  Insurance Coverage
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-xs uppercase text-[#dfe2ee] tracking-wider mb-4 font-['Space_Grotesk']">
              24/7 Command Hotline
            </h4>
            <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] space-y-2">
              <span className="text-[10px] font-mono text-[#68dba9] uppercase block font-['Space_Grotesk']">
                24/7 SUPPORT & DISPATCH
              </span>
              <a
                href="tel:+917740002020"
                className="text-sm font-bold text-[#dfe2ee] block font-['Space_Grotesk']"
              >
                +91 774-000-2020
              </a>
              <span className="text-[10px] text-[#bccac0] block">
                Priority executive reservations & emergency SOS telemetry operations.
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#bccac0]">
          <div>
            © {new Date().getFullYear()} Get Apna Driver Technologies Pvt. Ltd. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-xs">
            <a href="#" className="hover:text-[#dfe2ee]">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-[#dfe2ee]">
              Terms of Service
            </a>
            <a href="#" className="hover:text-[#dfe2ee]">
              Compliance
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

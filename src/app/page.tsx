'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type RolePanel = 'customer' | 'driver' | 'admin';
type ServiceType = 'hourly' | 'airport' | 'outstation';
type VehicleClass = 'sedan' | 'luxury' | 'suv';

const HERO_SERVICE_LABEL: Record<ServiceType, string> = {
  hourly: 'Est. Rate: ₹149/hr (min 2h)',
  airport: 'Fixed Fare: ₹899 (IGI T1/T2/T3)',
  outstation: 'From ₹1,499/day (driver stay incl.)',
};

const VEHICLE_MULTIPLIER: Record<VehicleClass, number> = {
  sedan: 1,
  luxury: 1.4,
  suv: 1.2,
};

function estimateFare(service: ServiceType, hours: number, vehicle: VehicleClass): number {
  const multiplier = VEHICLE_MULTIPLIER[vehicle];
  if (service === 'hourly') {
    return Math.round(149 * hours * multiplier);
  }
  if (service === 'airport') {
    return Math.round(899 * multiplier);
  }
  const days = Math.max(1, Math.ceil(hours / 24));
  return Math.round(1499 * days * multiplier);
}

interface SessionInfo {
  dashboardHref: string;
  dashboardLabel: string;
}

function resolveSession(roles: string[]): SessionInfo {
  if (roles.includes('ADMINISTRATOR')) {
    return { dashboardHref: '/admin/mission-dashboard', dashboardLabel: 'Admin Console' };
  }
  if (roles.includes('DRIVER')) {
    return { dashboardHref: '/driver', dashboardLabel: 'Driver Console' };
  }
  return { dashboardHref: '/bookings', dashboardLabel: 'Customer Console' };
}

const FAQS = [
  {
    question: 'How are Get Apna Driver chauffeurs vetted?',
    answer:
      'Every chauffeur undergoes a rigorous screening process including criminal background checks via state police registries, biometric identity verification, prior employment audits, and a mandatory practical driving examination in both manual and automatic vehicles.',
  },
  {
    question: 'Is my vehicle insured during the trip?',
    answer:
      'Yes. All bookings automatically include secondary trip protection coverage for incidental vehicular damage during the active booking lifecycle.',
  },
  {
    question: 'Can I book a driver for late-night return trips?',
    answer:
      'Yes — you can book an executive chauffeur up to 30 days in advance or request on-demand dispatch for safe, late-night transit home in your own vehicle.',
  },
  {
    question: 'How are hourly and outstation fares calculated?',
    answer:
      'Fares are transparent with zero surge fees. Hourly rentals start at ₹149/hr for standard city commutes (minimum 2 hours), while outstation trips are calculated on a transparent daily rate that includes the driver’s stay allowance.',
  },
];

export default function LandingPage() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [rolePanel, setRolePanel] = useState<RolePanel>('customer');
  const [heroService, setHeroService] = useState<ServiceType>('hourly');

  const [calcService, setCalcService] = useState<ServiceType>('hourly');
  const [calcHours, setCalcHours] = useState(8);
  const [calcVehicle, setCalcVehicle] = useState<VehicleClass>('sedan');

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (isMounted) setSession(resolveSession(data.principal?.roles ?? []));
      })
      .catch(() => {
        if (isMounted) setSession(null);
      })
      .finally(() => {
        if (isMounted) setSessionChecked(true);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setSession(null);
      setLoggingOut(false);
    }
  };

  const estimatedFare = estimateFare(calcService, calcHours, calcVehicle);

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased selection:bg-primary selection:text-on-primary">
      {/* SESSION BANNER — real auth state only, never a fabricated "active session" */}
      {sessionChecked && session && (
        <div className="w-full bg-surface-container-lowest border-b border-primary/20">
          <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-on-surface-variant">Signed in</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={session.dashboardHref}
                className="px-3 py-1 rounded bg-primary text-on-primary font-bold text-xs flex items-center gap-1.5"
              >
                <span>Resume {session.dashboardLabel}</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
              <button
                type="button"
                disabled={loggingOut}
                onClick={handleSignOut}
                className="px-2.5 py-1 rounded border border-outline-variant/60 text-on-surface-variant hover:text-on-surface hover:border-primary text-xs disabled:opacity-50"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRIMARY NAVIGATION */}
      <header className="sticky top-0 w-full z-40 bg-surface/90 backdrop-blur-xl border-b border-surface-variant/30 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <div className="h-20 w-full px-4 md:px-8 mx-auto max-w-[1440px] flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-2xl">local_taxi</span>
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-on-surface block leading-none font-['Space_Grotesk']">
                GET APNA DRIVER
              </span>
              <span className="text-[10px] uppercase text-primary tracking-widest block mt-0.5 font-bold font-['Space_Grotesk']">
                Executive Dispatch Terminal
              </span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-1.5 bg-surface-container-lowest border border-surface-variant/40 px-3 py-1.5 rounded-lg text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-base text-primary">security</span>
            <span className="font-mono">Delhi Police Verification Cleared</span>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="px-3 py-2 rounded-lg text-xs text-on-surface hover:text-primary hover:bg-surface-container transition-all flex items-center gap-1.5 border border-outline-variant/40"
            >
              <span className="material-symbols-outlined text-base">login</span>
              <span>Sign In</span>
            </Link>
            <div className="relative group">
              <button
                type="button"
                className="px-3 py-2 rounded-lg bg-primary text-on-primary text-xs uppercase tracking-wider hover:bg-primary-hover transition-all flex items-center gap-1.5 shadow-md font-bold"
              >
                <span className="material-symbols-outlined text-base">how_to_reg</span>
                <span>Register</span>
                <span className="material-symbols-outlined text-xs">expand_more</span>
              </button>
              <div className="absolute right-0 mt-2 w-64 bg-surface-container-high border border-surface-variant/60 rounded-xl shadow-2xl p-2 hidden group-hover:block z-50">
                <Link
                  href="/register"
                  className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-primary mt-0.5">person</span>
                  <div>
                    <p className="text-xs font-bold text-on-surface font-['Space_Grotesk']">
                      Customer Registration
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      Book chauffeurs &amp; verified pilots
                    </p>
                  </div>
                </Link>
                <Link
                  href="/register"
                  className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-surface-container transition-colors border-t border-surface-variant/20 mt-1 pt-1"
                >
                  <span className="material-symbols-outlined text-tertiary mt-0.5">
                    sports_motorsports
                  </span>
                  <div>
                    <p className="text-xs font-bold text-on-surface font-['Space_Grotesk']">
                      Driver Partner Enrollment
                    </p>
                    <p className="text-[11px] text-on-surface-variant">Zero platform deductions</p>
                  </div>
                </Link>
                <Link
                  href="/login"
                  className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-surface-container transition-colors border-t border-surface-variant/20 mt-1 pt-1"
                >
                  <span className="material-symbols-outlined text-secondary mt-0.5">
                    admin_panel_settings
                  </span>
                  <div>
                    <p className="text-xs font-bold text-on-surface font-['Space_Grotesk']">
                      Enterprise Fleet Admin
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      Corporate accounts &amp; audit console
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full bg-surface-container-lowest/90 border-t border-surface-variant/20 px-4 md:px-8">
          <nav className="max-w-[1440px] mx-auto flex items-center gap-6 h-11 overflow-x-auto text-xs uppercase tracking-wider text-on-surface-variant">
            <a
              className="hover:text-primary transition-colors py-1 flex items-center gap-1 text-primary border-b-2 border-primary"
              href="#overview"
            >
              <span className="material-symbols-outlined text-[14px]">explore</span>Overview
            </a>
            <a
              className="hover:text-primary transition-colors py-1 flex items-center gap-1"
              href="#how-it-works"
            >
              <span className="material-symbols-outlined text-[14px]">flowsheet</span>3-Step
              Protocol
            </a>
            <a
              className="hover:text-primary transition-colors py-1 flex items-center gap-1"
              href="#services-fleet"
            >
              <span className="material-symbols-outlined text-[14px]">directions_car</span>Flagship
              Fleet
            </a>
            <a
              className="hover:text-primary transition-colors py-1 flex items-center gap-1"
              href="#safety-telematics"
            >
              <span className="material-symbols-outlined text-[14px]">verified_user</span>Safety
            </a>
            <a
              className="hover:text-primary transition-colors py-1 flex items-center gap-1"
              href="#driver-partner-perks"
            >
              <span className="material-symbols-outlined text-[14px]">military_tech</span>Pilot
              Perks
            </a>
            <a
              className="hover:text-primary transition-colors py-1 flex items-center gap-1"
              href="#enterprise-admin"
            >
              <span className="material-symbols-outlined text-[14px]">corporate_fare</span>
              Enterprise
            </a>
            <a
              className="hover:text-primary transition-colors py-1 flex items-center gap-1"
              href="#pricing-transparency"
            >
              <span className="material-symbols-outlined text-[14px]">payments</span>Tariff Card
            </a>
            <a
              className="hover:text-primary transition-colors py-1 flex items-center gap-1"
              href="#testimonials-reputation"
            >
              <span className="material-symbols-outlined text-[14px]">reviews</span>Reputation
            </a>
            <a
              className="hover:text-primary transition-colors py-1 flex items-center gap-1"
              href="#faq"
            >
              <span className="material-symbols-outlined text-[14px]">help_center</span>FAQ
            </a>
          </nav>
        </div>
      </header>

      <main className="w-full bg-surface">
        {/* SECTION 1: HERO */}
        <section
          className="relative w-full overflow-hidden bg-surface px-4 md:px-8 py-12 lg:py-16"
          id="overview"
        >
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 right-0 w-80 h-80 rounded-full bg-secondary-container/15 blur-3xl pointer-events-none" />
          <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-7 flex flex-col gap-5">
              <div className="flex items-center gap-2 w-fit bg-surface-container-low border border-primary/20 px-3 py-1 rounded-full">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
                <span className="text-[11px] uppercase tracking-wider text-primary font-bold">
                  Live Dispatch Mesh Active
                </span>
              </div>
              <h1 className="text-4xl lg:text-5xl text-on-surface leading-[1.08] tracking-tight font-bold font-['Space_Grotesk']">
                Executive Chauffeur Dispatch.
                <br />
                <span className="text-primary">Your Car.</span> Apex Vetted Drivers.
              </h1>
              <p className="text-lg text-on-surface-variant max-w-2xl pt-2">
                India&apos;s unified mobility standard for private vehicle owners, corporate fleets,
                and high-earning certified pilots. Tier-1 police verification, 24/7 telematics, zero
                surge guarantee.
              </p>

              {/* Multi-Role Launchpad */}
              <div className="w-full bg-surface-container border border-surface-variant/50 rounded-2xl p-4 lg:p-5 shadow-2xl flex flex-col gap-4">
                <div className="flex items-center bg-surface-container-lowest p-1 rounded-xl border border-surface-variant/40">
                  {(
                    [
                      { key: 'customer', label: 'Hire Chauffeur', icon: 'hail' },
                      { key: 'driver', label: 'Drive & Earn', icon: 'sports_motorsports' },
                      { key: 'admin', label: 'Enterprise Fleet', icon: 'business_center' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setRolePanel(tab.key)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs uppercase transition-all flex items-center justify-center gap-1.5 ${
                        rolePanel === tab.key
                          ? 'bg-surface-container text-primary font-bold shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {rolePanel === 'customer' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-surface-container-low rounded-xl p-3 border border-surface-variant/30">
                        <label className="text-[11px] uppercase text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-primary text-sm">
                            my_location
                          </span>
                          Pickup Node
                        </label>
                        <p className="text-sm text-on-surface mt-1.5">DLF Phase 5, Gurugram</p>
                      </div>
                      <div className="bg-surface-container-low rounded-xl p-3 border border-surface-variant/30">
                        <label className="text-[11px] uppercase text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-primary text-sm">
                            schedule
                          </span>
                          Deployment Mode
                        </label>
                        <select
                          value={heroService}
                          onChange={(e) => setHeroService(e.target.value as ServiceType)}
                          className="bg-transparent text-sm text-on-surface focus:outline-none w-full mt-1.5 cursor-pointer"
                        >
                          <option className="bg-surface-container" value="hourly">
                            Hourly Chauffeur (₹149/hr)
                          </option>
                          <option className="bg-surface-container" value="airport">
                            Airport VIP Escort (Fixed ₹899)
                          </option>
                          <option className="bg-surface-container" value="outstation">
                            Outstation Trip (₹1,499/day)
                          </option>
                        </select>
                        <span className="text-[11px] text-on-surface-variant mt-1 block">
                          {HERO_SERVICE_LABEL[heroService]}
                        </span>
                      </div>
                      <div className="bg-surface-container-low rounded-xl p-3 border border-surface-variant/30">
                        <label className="text-[11px] uppercase text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-primary text-sm">
                            directions_car
                          </span>
                          Transmission / Grade
                        </label>
                        <p className="text-sm text-on-surface mt-1.5">
                          Luxury Automatic (BMW/Merc)
                        </p>
                        <span className="text-[11px] text-primary/80 mt-1 block">
                          Trained pilot assigned
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                        <span className="material-symbols-outlined text-primary text-base">
                          verified_user
                        </span>
                        <span>Police clearance certificate verified on dispatch</span>
                      </div>
                      <Link
                        href="/register"
                        className="w-full sm:w-auto px-6 py-2.5 bg-primary text-on-primary rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg hover:bg-primary-hover transition-all font-bold"
                      >
                        <span>Continue Booking → Sign Up</span>
                        <span className="material-symbols-outlined text-base">arrow_forward</span>
                      </Link>
                    </div>
                  </div>
                )}

                {rolePanel === 'driver' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-surface-container-low rounded-xl p-3 border border-surface-variant/30">
                        <span className="text-[11px] uppercase text-tertiary block">
                          Monthly Earnings
                        </span>
                        <p className="text-xl text-on-surface mt-1 font-bold font-['Space_Grotesk']">
                          ₹35,000 – ₹48,000
                        </p>
                        <span className="text-[11px] text-on-surface-variant">
                          Net take-home + tips
                        </span>
                      </div>
                      <div className="bg-surface-container-low rounded-xl p-3 border border-surface-variant/30">
                        <span className="text-[11px] uppercase text-tertiary block">
                          Payout Frequency
                        </span>
                        <p className="text-xl text-on-surface mt-1 font-bold font-['Space_Grotesk']">
                          Fast IMPS / UPI
                        </p>
                        <span className="text-[11px] text-on-surface-variant">
                          Zero platform surge deductions
                        </span>
                      </div>
                      <div className="bg-surface-container-low rounded-xl p-3 border border-surface-variant/30">
                        <span className="text-[11px] uppercase text-tertiary block">
                          Driver Shield
                        </span>
                        <p className="text-xl text-on-surface mt-1 font-bold font-['Space_Grotesk']">
                          Accident Cover
                        </p>
                        <span className="text-[11px] text-on-surface-variant">
                          Included on active trips
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                      <span className="text-xs text-on-surface-variant">
                        Requirements: Commercial/LMV licence + 3 years clean record.
                      </span>
                      <Link
                        href="/register"
                        className="w-full sm:w-auto px-6 py-2.5 bg-tertiary text-on-tertiary rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-all font-bold"
                      >
                        <span>Apply as Driver Partner</span>
                        <span className="material-symbols-outlined text-base">badge</span>
                      </Link>
                    </div>
                  </div>
                )}

                {rolePanel === 'admin' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-surface-container-low rounded-xl p-3 border border-surface-variant/30">
                        <span className="text-[11px] uppercase text-secondary block">
                          Consolidated Billing
                        </span>
                        <p className="text-base text-on-surface mt-1 font-bold font-['Space_Grotesk']">
                          Monthly GST Invoicing
                        </p>
                        <span className="text-[11px] text-on-surface-variant">
                          Automated toll &amp; expense reconciliation
                        </span>
                      </div>
                      <div className="bg-surface-container-low rounded-xl p-3 border border-surface-variant/30">
                        <span className="text-[11px] uppercase text-secondary block">
                          Fleet Oversight
                        </span>
                        <p className="text-base text-on-surface mt-1 font-bold font-['Space_Grotesk']">
                          Live Ops Console
                        </p>
                        <span className="text-[11px] text-on-surface-variant">
                          Booking, dispatch &amp; driver management
                        </span>
                      </div>
                      <div className="bg-surface-container-low rounded-xl p-3 border border-surface-variant/30">
                        <span className="text-[11px] uppercase text-secondary block">
                          Dedicated Account
                        </span>
                        <p className="text-base text-on-surface mt-1 font-bold font-['Space_Grotesk']">
                          Priority Dispatch
                        </p>
                        <span className="text-[11px] text-on-surface-variant">
                          Corporate SLA &amp; dedicated pilot pools
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                      <span className="text-xs text-on-surface-variant">
                        Corporate accounts with customized SLA and dedicated pilot pools.
                      </span>
                      <Link
                        href="/login"
                        className="w-full sm:w-auto px-6 py-2.5 bg-secondary-container text-on-secondary-container rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-all font-bold"
                      >
                        <span>Open Enterprise Admin Console</span>
                        <span className="material-symbols-outlined text-base">
                          admin_panel_settings
                        </span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right column: illustrative dispatch visualization (marketing decoration, not a live feed) */}
            <div className="lg:col-span-5 relative w-full flex flex-col items-center">
              <div className="relative w-full aspect-square max-w-[440px] bg-surface-container-lowest rounded-3xl p-6 overflow-hidden shadow-2xl border border-surface-variant/30 flex items-center justify-center">
                <div className="absolute w-80 h-80 rounded-full border border-surface-variant/40" />
                <div className="absolute w-56 h-56 rounded-full border border-surface-variant/60" />
                <div className="absolute w-32 h-32 rounded-full border border-primary/30 bg-primary/5 animate-pulse" />
                <div className="relative z-20 flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-2xl">
                    <span className="material-symbols-outlined text-3xl">directions_car</span>
                  </div>
                  <div className="mt-2 bg-surface-container-high px-3 py-1 rounded-full shadow-md border border-surface-variant/40">
                    <span className="text-[10px] text-on-surface uppercase">Your Vehicle Node</span>
                  </div>
                </div>
              </div>

              <div className="-mt-12 relative z-30 w-full max-w-[400px] bg-surface-container-high rounded-2xl p-4 shadow-2xl border border-surface-variant/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Image
                        alt="Illustrative chauffeur portrait"
                        className="w-12 h-12 rounded-xl object-cover"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCO3yMCwbxgKCghsL-i16RfdjWsBXRQ9hFbSTooCQOv0kAbZF2mAY3HS8a_MaTr38wgDpJTvRI-xbengnxFDc9dJO9o6y5chaOetxeu5W69yQbc_m6JcTUIskC8qicyLwjVYiohSP06onzJEFqgC-ZOdZuxhBezm1BnKZRyWE2bBF9kYPFiqIICNJH7oqYybYzlZgdYvToGn1TSiz7xZCe6X7JNjfJkH77_p1sfAK0laisOj2hhn4x6BA"
                        width={48}
                        height={48}
                        unoptimized
                      />
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary text-on-primary rounded-full flex items-center justify-center shadow">
                        <span className="material-symbols-outlined text-[10px]">verified</span>
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm text-on-surface font-bold font-['Space_Grotesk']">
                          Rajesh Kumar
                        </h4>
                        <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">
                          TOP PILOT
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant">
                        BMW 7 &amp; Mercedes Specialist • 8 yrs exp
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end text-primary text-sm font-bold font-['Space_Grotesk']">
                      <span className="material-symbols-outlined text-sm mr-1">star</span>4.96
                    </div>
                    <span className="text-[11px] text-on-surface-variant">1,420 trips</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: 3-STEP PROTOCOL */}
        <section
          className="w-full bg-surface-container-lowest px-4 md:px-8 py-16 border-t border-surface-variant/20"
          id="how-it-works"
        >
          <div className="max-w-[1440px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
              <div>
                <span className="text-xs uppercase tracking-widest text-primary block mb-1 font-bold">
                  Standard Operating Procedure
                </span>
                <h2 className="text-3xl text-on-surface font-bold font-['Space_Grotesk']">
                  3-Step Executive Chauffeur Deployment
                </h2>
              </div>
              <p className="text-sm text-on-surface-variant max-w-md">
                Zero bargaining, zero paperwork. Chauffeurs arrive in clean uniforms with pre-trip
                vehicle logs and a sanitized driving cabin.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  step: '01',
                  icon: 'pin_drop',
                  title: 'Request Trip & Vehicle Spec',
                  body: 'Specify your exact pickup coordinates, vehicle transmission, and duty window (hourly, airport escort, or outstation).',
                  footer: 'Instant GPS geofencing',
                },
                {
                  step: '02',
                  icon: 'badge',
                  title: 'Pilot Dispatched with Digital KYC',
                  body: 'Inspect the pilot profile, police verification status, aggregate rating, and track live ETA to your door.',
                  footer: 'Verified police badge & photo ID',
                },
                {
                  step: '03',
                  icon: 'verified',
                  title: 'Pre-Trip Audit & Smooth Commute',
                  body: 'Your chauffeur inspects exterior condition, logs starting odometer, and ensures a discreet, quiet journey.',
                  footer: 'Automated post-trip receipt',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="bg-surface-container-low rounded-2xl p-6 border border-surface-variant/40 flex flex-col justify-between hover:border-primary/50 transition-all shadow-md group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-3xl text-outline-variant group-hover:text-primary transition-colors font-bold font-['Space_Grotesk']">
                        {item.step}
                      </span>
                      <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">{item.icon}</span>
                      </div>
                    </div>
                    <h3 className="text-lg text-on-surface font-bold mb-2 font-['Space_Grotesk']">
                      {item.title}
                    </h3>
                    <p className="text-sm text-on-surface-variant">{item.body}</p>
                  </div>
                  <div className="mt-6 pt-3 border-t border-surface-variant/30 text-xs text-primary flex items-center gap-1.5 font-mono">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    {item.footer}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 3: FLAGSHIP FLEET */}
        <section
          className="w-full bg-surface px-4 md:px-8 py-16 border-t border-surface-variant/20"
          id="services-fleet"
        >
          <div className="max-w-[1440px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <span className="text-xs uppercase tracking-widest text-primary block mb-1 font-bold">
                  High-Spec Fleet Proficiency
                </span>
                <h2 className="text-3xl text-on-surface font-bold font-['Space_Grotesk']">
                  Trained for the World&apos;s Finest Vehicles
                </h2>
              </div>
              <p className="text-sm text-on-surface-variant max-w-md">
                Every pilot passes practical tests on air suspensions, lane-assist calibration, EV
                regenerative braking, and tight urban maneuvering.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  icon: 'airport_shuttle',
                  tag: 'Ultra-Luxury Sedans',
                  title: 'Mercedes S-Class / BMW 7',
                  body: 'Smooth acceleration curve, whisper-quiet cabin protocol, and soft-close door etiquette.',
                  years: '7+ Years',
                },
                {
                  icon: 'directions_car',
                  tag: 'Executive MPVs & Vans',
                  title: 'Toyota Vellfire / Kia Carnival',
                  body: 'First-class recliner configuration, multi-passenger luggage handling, smooth highway cruising.',
                  years: '5+ Years',
                },
                {
                  icon: 'terrain',
                  tag: 'Premium Heavy SUVs',
                  title: 'Defender / Range Rover / Fortuner',
                  body: 'Hill assist, rough-terrain navigation, high ground-clearance awareness.',
                  years: '6+ Years',
                },
                {
                  icon: 'electric_car',
                  tag: 'Modern Electric Vehicles',
                  title: 'BMW iX / Audi e-tron / BYD Seal',
                  body: 'Regenerative one-pedal modulation and fast-charging station setup.',
                  years: 'EV Certified',
                },
              ].map((fleet) => (
                <div
                  key={fleet.title}
                  className="bg-surface-container rounded-2xl p-5 border border-surface-variant/40 hover:border-primary/40 transition-all"
                >
                  <div className="h-32 rounded-xl bg-surface-container-lowest flex items-center justify-center text-primary mb-4 border border-surface-variant/20">
                    <span className="material-symbols-outlined text-5xl">{fleet.icon}</span>
                  </div>
                  <span className="text-[10px] text-primary uppercase font-bold">{fleet.tag}</span>
                  <h4 className="text-base text-on-surface font-bold mt-1 font-['Space_Grotesk']">
                    {fleet.title}
                  </h4>
                  <p className="text-xs text-on-surface-variant mt-2">{fleet.body}</p>
                  <div className="mt-4 pt-3 border-t border-surface-variant/30 flex items-center justify-between text-xs font-mono">
                    <span className="text-on-surface-variant">Min Experience</span>
                    <span className="text-primary font-bold">{fleet.years}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 4: SAFETY & TELEMATICS */}
        <section
          className="w-full bg-surface-container-lowest px-4 md:px-8 py-16 border-t border-surface-variant/20"
          id="safety-telematics"
        >
          <div className="max-w-[1440px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center gap-2 text-primary text-xs tracking-wider uppercase font-bold">
                  <span className="material-symbols-outlined text-sm">shield</span>
                  Zero-Tolerance Security Framework
                </div>
                <h2 className="text-3xl text-on-surface leading-tight font-bold font-['Space_Grotesk']">
                  Rigorous Screening &amp; 24/7 Safety Desk
                </h2>
                <p className="text-sm text-on-surface-variant">
                  Your car is one of your most valuable assets. Every chauffeur passes a
                  multi-pillar security review before receiving an active dispatch badge.
                </p>
                <div className="space-y-3 pt-2">
                  {[
                    {
                      icon: 'policy',
                      title: 'State Police Crime Registry Clearances',
                      body: 'Background and litigation checks coordinated through state police headquarters.',
                    },
                    {
                      icon: 'crisis_alert',
                      title: '24/7 Emergency SOS Response',
                      body: 'An in-app panic button routes directly to our safety desk for immediate escalation.',
                    },
                    {
                      icon: 'health_and_safety',
                      title: 'Incidental Trip Damage Protection',
                      body: 'Trip-time coverage for incidental vehicular damage while operated by a verified driver.',
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low border border-surface-variant/30"
                    >
                      <span className="material-symbols-outlined text-primary text-xl mt-0.5">
                        {item.icon}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-on-surface font-['Space_Grotesk']">
                          {item.title}
                        </h4>
                        <p className="text-xs text-on-surface-variant">{item.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-6 bg-surface-container rounded-3xl p-6 border border-surface-variant/40 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-surface-variant/30 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs text-on-surface font-bold font-mono">
                      SAMPLE TRIP TELEMETRY VIEW
                    </span>
                  </div>
                  <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded">
                    ILLUSTRATIVE
                  </span>
                </div>
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between bg-surface-container-lowest p-2.5 rounded-lg border border-surface-variant/20">
                    <span className="text-on-surface-variant">Vehicle Custody</span>
                    <span className="text-on-surface font-semibold">
                      BMW 530d M Sport [HR26-DQ-****]
                    </span>
                  </div>
                  <div className="flex justify-between bg-surface-container-lowest p-2.5 rounded-lg border border-surface-variant/20">
                    <span className="text-on-surface-variant">Pilot Assigned</span>
                    <span className="text-primary font-semibold">Rajesh Kumar</span>
                  </div>
                  <div className="flex justify-between bg-surface-container-lowest p-2.5 rounded-lg border border-surface-variant/20">
                    <span className="text-on-surface-variant">Status</span>
                    <span className="text-tertiary font-semibold">En Route to Pickup</span>
                  </div>
                </div>
                <div className="mt-5 p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-primary font-bold">
                    <span className="material-symbols-outlined text-sm">support_agent</span>
                    <span>24/7 Dispatch Support Standby</span>
                  </div>
                  <a href="tel:+917740002020" className="font-mono text-xs text-on-surface">
                    +91 774-000-2020
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: DRIVER PARTNER PERKS */}
        <section
          className="w-full bg-surface px-4 md:px-8 py-16 border-t border-surface-variant/20"
          id="driver-partner-perks"
        >
          <div className="max-w-[1440px] mx-auto bg-gradient-to-r from-surface-container-low to-surface-container rounded-3xl p-6 lg:p-10 border border-surface-variant/40 shadow-xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-4">
                <div className="flex items-center gap-2 text-tertiary text-xs tracking-wider uppercase font-bold">
                  <span className="material-symbols-outlined text-sm">sports_motorsports</span>
                  For Professional Chauffeurs &amp; Pilots
                </div>
                <h2 className="text-3xl lg:text-4xl text-on-surface leading-tight font-bold font-['Space_Grotesk']">
                  India&apos;s Highest Respect, 0% Platform Deductions, and{' '}
                  <span className="text-tertiary">Fast Cashouts</span>
                </h2>
                <p className="text-sm text-on-surface-variant max-w-2xl">
                  We treat professional chauffeurs with the respect they deserve. Zero surge cuts,
                  honest wages, and executive clientele who treat you with dignity.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                  {[
                    { label: 'Top Tier Pay', value: '₹45k+/mo' },
                    { label: 'Settlement', value: 'Fast IMPS' },
                    { label: 'Free Uniform', value: '2 Sets/Yr' },
                    { label: 'Honor Rating', value: '4.92 Avg' },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-surface-container-lowest p-3 rounded-xl border border-surface-variant/30"
                    >
                      <span className="text-[10px] uppercase text-on-surface-variant">
                        {stat.label}
                      </span>
                      <p className="text-xl text-tertiary mt-1 font-bold font-['Space_Grotesk']">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-4 flex flex-col items-start lg:items-end gap-3">
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-8 py-3 bg-tertiary text-on-tertiary text-sm rounded-xl flex items-center justify-center gap-2 shadow-xl hover:opacity-90 transition-all font-bold text-center"
                >
                  <span>Apply as Driver Pilot</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
                <span className="text-[11px] text-on-surface-variant font-mono text-center lg:text-right w-full">
                  5-minute application, no paperwork on day one
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: ENTERPRISE */}
        <section
          className="w-full bg-surface-container-lowest px-4 md:px-8 py-16 border-t border-surface-variant/20"
          id="enterprise-admin"
        >
          <div className="max-w-[1440px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <span className="text-xs uppercase tracking-widest text-secondary block mb-1 font-bold">
                  Corporate Mobility Infrastructure
                </span>
                <h2 className="text-3xl text-on-surface font-bold font-['Space_Grotesk']">
                  Enterprise Chauffeur Desk &amp; Audit Logs
                </h2>
              </div>
              <Link
                href="/login"
                className="text-xs text-secondary hover:underline flex items-center gap-1"
              >
                <span>Request Enterprise Access</span>
                <span className="material-symbols-outlined text-sm">open_in_new</span>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: 'receipt_long',
                  title: 'Consolidated GST Invoicing',
                  body: 'Centralized monthly tax invoices with trip logs and department cost-center allocation.',
                },
                {
                  icon: 'vpn_lock',
                  title: 'Discretion NDA & Board-Level Pilots',
                  body: 'Dedicated chauffeurs with signed non-disclosure agreements for confidential travel.',
                },
                {
                  icon: 'map',
                  title: 'Multi-City Corporate Pool',
                  body: 'A single corporate contract covering every metro your fleet operates in.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="bg-surface-container rounded-2xl p-6 border border-surface-variant/40"
                >
                  <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined">{item.icon}</span>
                  </div>
                  <h4 className="text-base text-on-surface font-bold mb-2 font-['Space_Grotesk']">
                    {item.title}
                  </h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 7: TARIFF CARDS & FARE ESTIMATOR */}
        <section
          className="w-full bg-surface px-4 md:px-8 py-16 border-t border-surface-variant/20"
          id="pricing-transparency"
        >
          <div className="max-w-[1440px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <span className="text-xs uppercase tracking-widest text-primary block mb-1 font-bold">
                  Transparent Economics
                </span>
                <h2 className="text-3xl text-on-surface font-bold font-['Space_Grotesk']">
                  Zero Surge Guarantee Tariff Cards
                </h2>
              </div>
              <p className="text-sm text-on-surface-variant max-w-md">
                No midnight surcharges, no rain-surge multiplier. Predictable hourly and outstation
                rates.
              </p>
            </div>

            {/* Fare Estimator */}
            <div className="bg-surface-container rounded-3xl p-6 lg:p-8 border border-surface-variant/40 mb-8 shadow-xl">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-8 space-y-4">
                  <h3 className="text-xl text-on-surface font-bold flex items-center gap-2 font-['Space_Grotesk']">
                    <span className="material-symbols-outlined text-primary">calculate</span>
                    Interactive Chauffeur Fare Estimator
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Adjust hours or select your travel service to preview transparent charges.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div>
                      <label className="block text-xs uppercase text-on-surface-variant mb-1">
                        Service Type
                      </label>
                      <select
                        value={calcService}
                        onChange={(e) => setCalcService(e.target.value as ServiceType)}
                        className="w-full bg-surface-container-low border border-surface-variant/50 rounded-xl p-2.5 text-sm text-on-surface"
                      >
                        <option value="hourly">Hourly City Chauffeur</option>
                        <option value="airport">Airport VIP Escort</option>
                        <option value="outstation">Outstation Roundtrip</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs uppercase text-on-surface-variant mb-1">
                        Duration
                      </label>
                      <select
                        value={calcHours}
                        onChange={(e) => setCalcHours(Number(e.target.value))}
                        disabled={calcService === 'airport'}
                        className="w-full bg-surface-container-low border border-surface-variant/50 rounded-xl p-2.5 text-sm text-on-surface disabled:opacity-50"
                      >
                        <option value={2}>2 Hours (Minimum block)</option>
                        <option value={4}>4 Hours (Half Day)</option>
                        <option value={8}>8 Hours (Full Business Day)</option>
                        <option value={12}>12 Hours (Extended Shift)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs uppercase text-on-surface-variant mb-1">
                        Vehicle Classification
                      </label>
                      <select
                        value={calcVehicle}
                        onChange={(e) => setCalcVehicle(e.target.value as VehicleClass)}
                        className="w-full bg-surface-container-low border border-surface-variant/50 rounded-xl p-2.5 text-sm text-on-surface"
                      >
                        <option value="sedan">Standard Sedan / Hatchback</option>
                        <option value="luxury">Luxury Chauffeur (BMW/Merc/Audi)</option>
                        <option value="suv">Executive SUV / 4x4</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 bg-surface-container-lowest rounded-2xl p-5 border border-primary/30 flex flex-col justify-between text-center gap-3">
                  <span className="text-[10px] uppercase text-on-surface-variant">
                    Estimated Transparent Fare
                  </span>
                  <span className="text-4xl text-primary font-bold font-['Space_Grotesk']">
                    ₹{estimatedFare.toLocaleString('en-IN')}
                  </span>
                  <Link
                    href="/register"
                    className="px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-bold hover:bg-primary-hover transition-all"
                  >
                    Book This Package
                  </Link>
                </div>
              </div>
            </div>

            {/* Tariff Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-surface-container rounded-2xl p-6 border border-surface-variant/40 flex flex-col gap-3">
                <span className="text-xs uppercase text-on-surface-variant font-bold">
                  Hourly Chauffeur
                </span>
                <span className="text-3xl text-on-surface font-bold font-['Space_Grotesk']">
                  ₹149<span className="text-sm text-on-surface-variant">/hr</span>
                </span>
                <p className="text-xs text-on-surface-variant">
                  Min 2-hr block • Free pickup within 5km • Live ETA tracking
                </p>
                <Link
                  href="/register"
                  className="mt-auto text-center px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-container-highest transition-colors"
                >
                  Book Hourly
                </Link>
              </div>
              <div className="bg-surface-container rounded-2xl p-6 border-2 border-primary flex flex-col gap-3 relative">
                <span className="absolute -top-3 right-4 px-2 py-0.5 rounded-full bg-primary text-on-primary text-[10px] font-bold uppercase">
                  Popular
                </span>
                <span className="text-xs uppercase text-primary font-bold">
                  Airport VIP One-Way
                </span>
                <span className="text-3xl text-on-surface font-bold font-['Space_Grotesk']">
                  ₹899<span className="text-sm text-on-surface-variant"> fixed</span>
                </span>
                <p className="text-xs text-on-surface-variant">
                  IGI T1 / T2 / T3 • 30 min complimentary wait • Meet &amp; greet
                </p>
                <Link
                  href="/register"
                  className="mt-auto text-center px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover transition-colors"
                >
                  Book Airport Trip
                </Link>
              </div>
              <div className="bg-surface-container rounded-2xl p-6 border border-surface-variant/40 flex flex-col gap-3">
                <span className="text-xs uppercase text-on-surface-variant font-bold">
                  Outstation Roundtrip
                </span>
                <span className="text-3xl text-on-surface font-bold font-['Space_Grotesk']">
                  ₹1,499<span className="text-sm text-on-surface-variant">/day</span>
                </span>
                <p className="text-xs text-on-surface-variant">
                  Highway-certified pilots • Driver stay allowance included
                </p>
                <Link
                  href="/register"
                  className="mt-auto text-center px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-container-highest transition-colors"
                >
                  Book Outstation
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 8: TESTIMONIALS & FAQ */}
        <section
          className="w-full bg-surface-container-lowest px-4 md:px-8 py-16 border-t border-surface-variant/20"
          id="testimonials-reputation"
        >
          <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div>
                <span className="text-xs uppercase tracking-widest text-primary block mb-1 font-bold">
                  Executive Praise
                </span>
                <h2 className="text-3xl text-on-surface font-bold font-['Space_Grotesk']">
                  Endorsed by Top Executives &amp; Families
                </h2>
              </div>

              {[
                {
                  quote:
                    'I frequently host visiting delegates from Europe. Get Apna Driver provides chauffeurs who understand executive etiquette, smooth braking, and route optimization.',
                  initials: 'AK',
                  name: 'Arjun Kapoor',
                  role: 'Managing Partner, Nexus Capital • South Delhi',
                },
                {
                  quote:
                    'Booked an outstation driver for a 4-day trip to Jaipur in my BMW 5-Series. The driver was impeccably mannered, never exceeded the speed limit, and kept the car spotless throughout.',
                  initials: 'RS',
                  name: 'Dr. Radhika Sen',
                  role: 'Senior Cardiologist, Gurugram',
                },
              ].map((review) => (
                <div
                  key={review.name}
                  className="bg-surface-container p-6 rounded-2xl border border-surface-variant/40 shadow-md"
                >
                  <div className="flex items-center gap-1 text-primary mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="material-symbols-outlined text-sm">
                        star
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-on-surface mb-4 italic leading-relaxed">
                    &quot;{review.quote}&quot;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary text-sm font-bold font-['Space_Grotesk']">
                      {review.initials}
                    </div>
                    <div>
                      <h4 className="text-sm text-on-surface font-bold font-['Space_Grotesk']">
                        {review.name}
                      </h4>
                      <p className="text-xs text-on-surface-variant">{review.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-7 flex flex-col gap-6" id="faq">
              <div>
                <span className="text-xs uppercase tracking-widest text-primary block mb-1 font-bold">
                  Resolution Desk
                </span>
                <h2 className="text-3xl text-on-surface font-bold font-['Space_Grotesk']">
                  Frequently Asked Questions
                </h2>
              </div>
              <div className="space-y-4">
                {FAQS.map((faq, index) => {
                  const isOpen = openFaqIndex === index;
                  return (
                    <div
                      key={faq.question}
                      className="bg-surface-container border border-surface-variant/40 rounded-2xl overflow-hidden transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                        className="w-full p-6 text-left flex items-center justify-between gap-4 text-base text-on-surface hover:text-primary transition-colors font-bold font-['Space_Grotesk']"
                      >
                        <span>{faq.question}</span>
                        <span className="material-symbols-outlined text-xl text-primary shrink-0">
                          {isOpen ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="px-6 pb-6 text-xs text-on-surface-variant leading-relaxed border-t border-surface-variant/40 pt-4">
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

        {/* SECTION 9: FINAL CTA */}
        <section className="w-full bg-surface px-4 md:px-8 py-16 border-t border-surface-variant/20">
          <div className="max-w-[1440px] mx-auto bg-surface-container rounded-3xl p-10 md:p-16 text-center space-y-6 border border-surface-variant/40 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 text-primary flex items-center justify-center mx-auto border border-primary/40">
              <span className="material-symbols-outlined text-3xl">directions_car</span>
            </div>
            <h2 className="text-3xl sm:text-4xl text-on-surface max-w-3xl mx-auto leading-tight font-bold font-['Space_Grotesk']">
              Ready to Experience India&apos;s Premier Chauffeur Network?
            </h2>
            <p className="text-sm sm:text-base text-on-surface-variant max-w-xl mx-auto">
              Select your role below to access dedicated onboarding flows &amp; the unified
              automobile console.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                href="/register"
                className="w-full sm:w-auto px-6 py-3 bg-primary text-on-primary rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:bg-primary-hover transition-all"
              >
                Continue Booking
              </Link>
              <Link
                href="/register"
                className="w-full sm:w-auto px-6 py-3 bg-surface-container-high text-on-surface rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-surface-container-highest transition-all"
              >
                Drive Fleet &amp; KYC
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-6 py-3 bg-surface-container-high text-on-surface rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-surface-container-highest transition-all"
              >
                Enterprise Admin
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-surface-container-lowest text-on-surface-variant pt-16 pb-12 px-4 md:px-8 border-t border-surface-variant/40">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-surface-variant/40">
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-xl">local_taxi</span>
              </div>
              <span className="text-base tracking-tight text-on-surface font-bold font-['Space_Grotesk']">
                GET APNA DRIVER
              </span>
            </Link>
            <p className="text-xs text-on-surface-variant max-w-sm leading-relaxed">
              India&apos;s executive chauffeur network for personal luxury and commute cars.
              Background-verified drivers with live trip tracking.
            </p>
            <div className="flex items-center gap-4 text-xs font-mono pt-2">
              <span className="flex items-center gap-1.5 text-primary">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping" /> SAFETY DESK: LIVE
              </span>
              <span>•</span>
              <span>24/7 GPS TELEMETRY</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs uppercase text-on-surface tracking-wider mb-4 font-bold font-['Space_Grotesk']">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/bookings/new" className="hover:text-primary transition-colors">
                  Book Chauffeur
                </Link>
              </li>
              <li>
                <Link href="/bookings" className="hover:text-primary transition-colors">
                  Customer Hub
                </Link>
              </li>
              <li>
                <Link href="/driver/onboarding" className="hover:text-primary transition-colors">
                  Driver Partner Enrollment
                </Link>
              </li>
              <li>
                <Link href="/admin/drivers" className="hover:text-primary transition-colors">
                  Enterprise Admin
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs uppercase text-on-surface tracking-wider mb-4 font-bold font-['Space_Grotesk']">
              Trust &amp; Security
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a href="#safety-telematics" className="hover:text-primary transition-colors">
                  Police Verification Protocol
                </a>
              </li>
              <li>
                <a href="#safety-telematics" className="hover:text-primary transition-colors">
                  Emergency Response SOS
                </a>
              </li>
              <li>
                <a href="#safety-telematics" className="hover:text-primary transition-colors">
                  Trip Damage Protection
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs uppercase text-on-surface tracking-wider mb-4 font-bold font-['Space_Grotesk']">
              24/7 Command Hotline
            </h4>
            <div className="bg-surface-container p-4 rounded-xl border border-surface-variant/40 space-y-2">
              <span className="text-[10px] font-mono text-primary uppercase block font-bold">
                24/7 Support &amp; Dispatch
              </span>
              <a
                href="tel:+917740002020"
                className="text-sm text-on-surface block font-bold font-['Space_Grotesk']"
              >
                +91 774-000-2020
              </a>
              <span className="text-[10px] text-on-surface-variant block">
                Priority reservations &amp; emergency SOS operations.
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-on-surface-variant">
          <div>
            © {new Date().getFullYear()} Get Apna Driver Technologies Pvt. Ltd. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-xs">
            <a href="#" className="hover:text-on-surface">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-on-surface">
              Terms of Service
            </a>
            <a href="#" className="hover:text-on-surface">
              Compliance
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

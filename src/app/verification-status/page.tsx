'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function VerificationStatusPage() {
  const [activeTab, setActiveTab] = useState<'suspended' | 'blocked' | 'recovery'>('suspended');
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('SovereignVIP2025!');
  const [strengthText, setStrengthText] = useState('Strong (96-Bit Hash)');
  const [suspensionTimeLeft, setSuspensionTimeLeft] = useState(99660); // seconds (~27h 41m)

  useEffect(() => {
    const timer = setInterval(() => {
      setSuspensionTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return `${h}h ${m < 10 ? '0' : ''}${m}m`;
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (val.length < 6) {
      setStrengthText('Weak (Non-Compliant)');
    } else if (val.length < 10) {
      setStrengthText('Moderate (Passable)');
    } else {
      setStrengthText('Strong (96-Bit Hash)');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f131c] text-[#dfe2ee] font-sans antialiased">
      {/* Top Header */}
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
            <span className="px-3 py-1.5 uppercase tracking-wider bg-[#262a33] text-[#dfe2ee] font-semibold rounded-lg shadow-[0_0_12px_rgba(5,150,105,0.25)]">
              Verification Status
            </span>
            <Link
              href="/admin/vault"
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
      <main className="pt-20 pb-16 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-10">
        {/* Real-time Status Banner / Telemetry Ticker */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0a0e16] p-3 px-4 rounded-xl border border-[#262a33] shadow-md">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative flex items-center justify-center h-7 w-7 rounded-lg bg-[#262a33] shrink-0">
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-[#68dba9] opacity-60"></span>
              <span
                className="material-symbols-outlined text-[#68dba9] text-base"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                security
              </span>
            </div>
            <div className="flex items-baseline gap-2 truncate text-xs font-mono">
              <span className="text-[#bccac0] uppercase tracking-wider">Active Pipeline:</span>
              <span className="text-[#68dba9] font-bold">APP-REQ-2025-IND-89104</span>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden sm:flex items-center gap-2 text-[#bccac0] font-mono text-xs">
              <span className="material-symbols-outlined text-xs text-[#68dba9]">sync</span>
              <span>
                NCR Bureau Sync: <strong className="text-[#dfe2ee]">Online</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#262a33] px-3 py-1 rounded-full border border-[#3d4a42]/30">
              <span className="h-1.5 w-1.5 rounded-full bg-[#68dba9] animate-pulse"></span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#68dba9] font-bold">
                Live Review Rail
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 1: DRIVER APPLICATION LIFECYCLE & REAL-TIME REVIEW HUB */}
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#68dba9]">
                <span>Security Lifecycle Node</span>
                <span>/</span>
                <span>Tier-1 Chauffeur Validation</span>
              </div>
              <h1 className="font-display text-2xl sm:text-4xl font-bold text-[#dfe2ee] tracking-tight mt-1">
                Application Clearance &amp; Verification Protocol
              </h1>
            </div>

            <div className="flex items-center gap-3 bg-[#262a33] px-4 py-2 rounded-xl border border-[#3d4a42]/30">
              <div className="flex flex-col items-end font-mono">
                <span className="text-[10px] text-[#bccac0] uppercase">Global Queue SLA</span>
                <span className="text-sm font-semibold text-[#68dba9]">04h 18m Left</span>
              </div>
              <div className="h-7 w-px bg-[#3d4a42]/40"></div>
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#0a0e16] text-[#68dba9]">
                <span className="material-symbols-outlined text-base">hourglass_top</span>
              </div>
            </div>
          </div>

          {/* Hero Status Card (In Review / Step 3 of 4) */}
          <div className="relative bg-[#181c24] rounded-2xl p-6 lg:p-8 border border-[#262a33] overflow-hidden shadow-xl">
            <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-[#68dba9]/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 min-w-0">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#262a33] shrink-0 border border-[#3d4a42]">
                  <Image
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAJB_3T9vYBscafDrA2dRFG613_zj1Jygcl8LkKK0LDCZMPxRfelzZZ5_qi3gpqncrHXJZIiag75UMCsHbVutc8e4DL8XfeBCZ5VdQXmYiEbsvTJYlpQhydddjMib8RU04QMnS7IJyESCLlDsa6E87g5mghApBNGOAStGLWH31AYfKZ_vnoq-qiYtz6IPk67asU3t7LamxjousZCJv8TMk0hW6EdXtoGckZSOKctE904vTnKIPtYmOrIQ"
                    alt="Chauffeur Portrait"
                    fill
                    unoptimized
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 right-1 flex items-center justify-center w-5 h-5 rounded-full bg-[#68dba9] text-[#003825]">
                    <span
                      className="material-symbols-outlined text-xs"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      done
                    </span>
                  </div>
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-[#68dba9]/15 text-[#68dba9] font-mono text-[10px] uppercase font-bold px-3 py-1 rounded-full">
                      Step 3 of 4 Active
                    </span>
                    <span className="bg-[#262a33] text-[#bccac0] font-mono text-[10px] px-3 py-1 rounded-full">
                      Chauffeur ID: #DL-88219-X
                    </span>
                  </div>
                  <h2 className="font-display font-bold text-xl sm:text-2xl text-[#dfe2ee] mt-1.5 truncate">
                    Your Chauffeur Application is Under Verification
                  </h2>
                  <p className="text-xs sm:text-sm text-[#bccac0] mt-1 max-w-2xl leading-relaxed">
                    National Crime Records Bureau (NCRB) &amp; Regional Transport Authority
                    cross-verification is currently in progress. Your telematics dispatch kit will
                    unlock immediately upon record sign-off.
                  </p>
                </div>
              </div>

              {/* Radial Score Widget */}
              <div className="w-full lg:w-auto flex items-center justify-between lg:justify-end gap-6 bg-[#0a0e16] p-4 rounded-xl border border-[#262a33] shrink-0">
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-16 h-16 -rotate-90 transform" viewBox="0 0 36 36">
                      <path
                        className="text-[#262a33]"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                      ></path>
                      <path
                        className="text-[#68dba9]"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeDasharray="75, 100"
                        strokeLinecap="round"
                        strokeWidth="3.5"
                      ></path>
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center font-mono font-bold text-sm text-[#dfe2ee]">
                      75%
                    </div>
                  </div>
                  <div className="flex flex-col font-mono text-xs">
                    <span className="text-[10px] text-[#bccac0] uppercase">Overall Intake</span>
                    <span className="text-xs text-[#68dba9] font-bold">Clearance Imminent</span>
                    <span className="text-[10px] text-[#bccac0] mt-0.5">
                      Estimated: Today 18:00
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2-Column Bento: Timeline (Left) & Document Repository (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Timeline (7 cols) */}
            <div className="lg:col-span-7 flex flex-col bg-[#181c24] rounded-2xl p-6 border border-[#262a33] shadow-lg">
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#262a33]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#68dba9] text-xl">
                    account_tree
                  </span>
                  <h3 className="font-display font-bold text-base text-[#dfe2ee]">
                    Verification Sequence
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-[#bccac0]">Updated 8 mins ago</span>
              </div>

              <div className="relative flex flex-col gap-4 mt-4">
                <div className="absolute top-4 bottom-4 left-4 w-0.5 bg-[#262a33] -translate-x-1/2 pointer-events-none"></div>

                {/* Stage 1: Passed */}
                <div className="relative flex items-start gap-4 z-10">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#68dba9] text-[#003825] shrink-0 font-bold">
                    ✓
                  </div>
                  <div className="flex-1 bg-[#0a0e16] rounded-xl p-4 border border-[#262a33]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-[#68dba9] uppercase font-bold">
                        Stage 01 • Application Received
                      </span>
                      <span className="text-[10px] font-mono text-[#bccac0]">14 Oct, 11:20 AM</span>
                    </div>
                    <div className="text-xs font-bold text-[#dfe2ee] mt-1">
                      Candidate Profile Ingestion &amp; Consent Ledger
                    </div>
                    <div className="text-[11px] text-[#bccac0] mt-0.5">
                      Electronic signature sealed under UIDAI framework v4.
                    </div>
                  </div>
                </div>

                {/* Stage 2: Passed */}
                <div className="relative flex items-start gap-4 z-10">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#68dba9] text-[#003825] shrink-0 font-bold">
                    ✓
                  </div>
                  <div className="flex-1 bg-[#0a0e16] rounded-xl p-4 border border-[#262a33]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-[#68dba9] uppercase font-bold">
                        Stage 02 • Automated OCR Audit
                      </span>
                      <span className="text-[10px] font-mono text-[#bccac0]">14 Oct, 11:23 AM</span>
                    </div>
                    <div className="text-xs font-bold text-[#dfe2ee] mt-1">
                      DL &amp; Aadhaar Biometric Extraction Complete
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-mono text-[#68dba9]">
                      <span className="material-symbols-outlined text-xs">verified</span>
                      <span>Sarathi RTO Match: Grade-A Commercial Chauffeur</span>
                    </div>
                  </div>
                </div>

                {/* Stage 3: In Progress */}
                <div className="relative flex items-start gap-4 z-10">
                  <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-[#262a33] text-[#b4c5ff] shrink-0 font-bold border border-[#b4c5ff]/50">
                    <span className="animate-spin text-xs">↻</span>
                  </div>
                  <div className="flex-1 bg-[#262a33] rounded-xl p-4 border border-[#b4c5ff]/40 shadow-md">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#b4c5ff] animate-ping"></span>
                        <span className="text-[10px] font-mono text-[#b4c5ff] uppercase font-bold">
                          Stage 03 • In Review
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[#bccac0]">ETA: 4 to 12 hrs</span>
                    </div>
                    <div className="text-xs font-bold text-[#dfe2ee] mt-1">
                      NCR Police Criminal Records &amp; Court Clearing
                    </div>
                    <p className="text-[11px] text-[#bccac0] mt-1 leading-relaxed">
                      Automated background run cross-referencing CCTNS repository. Station officer
                      verification certificate dispatched.
                    </p>
                    <div className="w-full bg-[#0a0e16] rounded-full h-1.5 mt-3 overflow-hidden">
                      <div className="bg-[#b4c5ff] h-full rounded-full w-[62%]"></div>
                    </div>
                  </div>
                </div>

                {/* Stage 4: Pending */}
                <div className="relative flex items-start gap-4 z-10 opacity-70">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#0a0e16] text-[#bccac0] shrink-0 border border-[#262a33]">
                    4
                  </div>
                  <div className="flex-1 bg-[#0a0e16] rounded-xl p-4 border border-[#262a33]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-[#bccac0] uppercase">
                        Stage 04 • Briefing Module
                      </span>
                      <span className="text-[10px] font-mono text-[#bccac0]">Queue #14</span>
                    </div>
                    <div className="text-xs font-bold text-[#dfe2ee] mt-1">
                      Telematics Induction &amp; VIP Etiquette Briefing
                    </div>
                    <div className="text-[11px] text-[#bccac0] mt-0.5">
                      Requires 20-min digital protocol exam via Apna Driver Terminal.
                    </div>
                  </div>
                </div>

                {/* Stage 5: Locked */}
                <div className="relative flex items-start gap-4 z-10 opacity-50">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#0a0e16] text-[#bccac0] shrink-0 border border-[#262a33]">
                    🔒
                  </div>
                  <div className="flex-1 bg-[#0a0e16] rounded-xl p-4 border border-[#262a33]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-[#bccac0] uppercase">
                        Stage 05 • Activation
                      </span>
                      <span className="text-[10px] font-mono text-[#bccac0]">Terminal Locked</span>
                    </div>
                    <div className="text-xs font-bold text-[#dfe2ee] mt-1">
                      Account Activation &amp; Shift Dispatch Radar
                    </div>
                    <div className="text-[11px] text-[#bccac0] mt-0.5">
                      Instant biometric login token provisioning and dispatch availability.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Repository (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#68dba9] text-xl">
                    folder_shared
                  </span>
                  <h3 className="font-display font-bold text-base text-[#dfe2ee]">
                    Document Repository
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-[#68dba9] font-bold uppercase">
                  3 Uploaded
                </span>
              </div>

              {/* Card 1 */}
              <div className="bg-[#181c24] rounded-xl p-4 border border-[#262a33] flex flex-col gap-3 shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#262a33] flex items-center justify-center text-[#68dba9]">
                      <span className="material-symbols-outlined text-xl">badge</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#dfe2ee]">
                        Commercial DL (LMV/TR)
                      </span>
                      <span className="text-[10px] font-mono text-[#bccac0]">
                        DL-0420220019284 • EXP 2031
                      </span>
                    </div>
                  </div>
                  <span className="bg-[#00311f] text-[#68dba9] font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    ✓ APPROVED
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[#262a33] text-[10px] font-mono text-[#bccac0]">
                  <span>Sarathi Verified</span>
                  <button
                    type="button"
                    onClick={() => alert('Inspecting DL proof...')}
                    className="text-[#68dba9] hover:underline"
                  >
                    Inspect Proof
                  </button>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-[#181c24] rounded-xl p-4 border border-[#262a33] flex flex-col gap-3 shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#262a33] flex items-center justify-center text-[#68dba9]">
                      <span className="material-symbols-outlined text-xl">fingerprint</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#dfe2ee]">UIDAI Aadhaar Card</span>
                      <span className="text-[10px] font-mono text-[#bccac0]">
                        Masked UID: XXXX-XXXX-9142
                      </span>
                    </div>
                  </div>
                  <span className="bg-[#00311f] text-[#68dba9] font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    ✓ APPROVED
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[#262a33] text-[10px] font-mono text-[#bccac0]">
                  <span>e-KYC Token: eKYC_849204_A7</span>
                  <button
                    type="button"
                    onClick={() => alert('Inspecting Aadhaar proof...')}
                    className="text-[#68dba9] hover:underline"
                  >
                    Inspect Proof
                  </button>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-[#262a33] rounded-xl p-4 border border-[#b4c5ff]/40 flex flex-col gap-3 shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#0a0e16] flex items-center justify-center text-[#b4c5ff]">
                      <span className="material-symbols-outlined text-xl">local_police</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#dfe2ee]">
                        NCR Police Clearance Certificate
                      </span>
                      <span className="text-[10px] font-mono text-[#b4c5ff]">
                        Pending Desk Verification
                      </span>
                    </div>
                  </div>
                  <span className="bg-[#0053db]/30 text-[#b4c5ff] font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    UNDER REVIEW
                  </span>
                </div>
                <p className="text-[11px] text-[#bccac0] leading-relaxed">
                  Docket #DEL-POL-9924 dispatched to Connaught Place Central Secretariat branch.
                  Clearance SLA is active.
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-[#3d4a42]/40 text-[10px] font-mono text-[#bccac0]">
                  <button
                    type="button"
                    onClick={() => alert('Connecting to Operations Hotline...')}
                    className="text-[#dfe2ee] bg-[#0a0e16] px-2.5 py-1 rounded hover:bg-[#181c24] transition-colors"
                  >
                    Contact Operations Hotline
                  </button>
                  <span>Ref: #PCC-8821</span>
                </div>
              </div>

              {/* ISO Box */}
              <div className="bg-[#0a0e16] rounded-xl p-4 border border-[#262a33] flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-[#262a33] flex items-center justify-center text-[#68dba9] shrink-0">
                  <span className="material-symbols-outlined text-xl">verified_user</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-[#68dba9] font-bold uppercase">
                    ISO/IEC 27701 PRIVACY PROTOCOL
                  </span>
                  <span className="text-[11px] text-[#bccac0] leading-tight">
                    Your records are encrypted and stored in government-certified sovereign vault
                    clouds.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: ACCOUNT EXCEPTION & GOVERNANCE STATES */}
        <div className="flex flex-col gap-6 pt-4 border-t border-[#262a33]">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono text-[#bccac0] uppercase tracking-wider font-bold">
                Exception Triage &amp; Governance Center
              </span>
              <h2 className="font-display font-bold text-2xl text-[#dfe2ee] tracking-tight mt-1">
                Account Security &amp; Policy States
              </h2>
            </div>

            {/* State Switcher Tabs */}
            <div className="flex items-center gap-2 bg-[#0a0e16] p-1.5 rounded-xl border border-[#262a33]">
              {(['suspended', 'blocked', 'recovery'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-2 ${
                    activeTab === tab
                      ? 'bg-[#262a33] text-[#dfe2ee] font-bold shadow-[0_0_12px_rgba(5,150,105,0.2)]'
                      : 'text-[#bccac0] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      tab === 'suspended'
                        ? 'bg-red-400'
                        : tab === 'blocked'
                          ? 'bg-red-600'
                          : 'bg-[#68dba9]'
                    }`}
                  ></span>
                  <span>
                    {tab === 'suspended'
                      ? 'Account Suspended'
                      : tab === 'blocked'
                        ? 'Security Lockout'
                        : 'Password & 2FA Recovery'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* TAB 1: SUSPENDED */}
          {activeTab === 'suspended' && (
            <div className="bg-[#181c24] rounded-2xl p-6 lg:p-8 border border-[#262a33] shadow-xl">
              <div className="flex flex-col lg:flex-row items-start justify-between gap-8">
                <div className="flex flex-col gap-4 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 bg-[#93000a]/40 text-[#ffb4ab] font-mono text-[10px] font-bold uppercase px-3 py-1 rounded-full border border-red-500/30">
                      <span className="material-symbols-outlined text-xs">warning</span>
                      Operational Hold • 72-Hour Cooldown
                    </span>
                    <span className="text-[10px] font-mono text-[#bccac0]">
                      Ticket Reference: #SUS-8910
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-xl text-[#dfe2ee]">
                    Account Temporarily Suspended: Telematics Infraction Detected
                  </h3>
                  <p className="text-xs sm:text-sm text-[#bccac0] leading-relaxed">
                    Automatic telemetry sensors flagged repeated speed deviations exceeding VIP
                    Fleet Standards (+25 km/h over airport expressway limit) alongside two
                    unnotified late cancellations on 13 October. Pursuant to Section 9.2, dispatch
                    privileges are held pending telemetry re-attestation.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                    <div className="bg-[#0a0e16] p-4 rounded-xl border border-[#262a33] flex flex-col">
                      <span className="text-[10px] font-mono text-[#bccac0] uppercase">
                        Incident Metric
                      </span>
                      <span className="font-display font-bold text-2xl text-[#ffb4ab] mt-1">
                        114 km/h
                      </span>
                      <span className="text-[10px] font-mono text-[#bccac0] mt-1">
                        Max Limit: 90 km/h
                      </span>
                    </div>

                    <div className="bg-[#0a0e16] p-4 rounded-xl border border-[#262a33] flex flex-col">
                      <span className="text-[10px] font-mono text-[#bccac0] uppercase">
                        Dispute Timer
                      </span>
                      <span className="font-display font-bold text-2xl text-[#b4c5ff] mt-1">
                        {formatTimer(suspensionTimeLeft)}
                      </span>
                      <span className="text-[10px] font-mono text-[#bccac0] mt-1">
                        Window closes auto
                      </span>
                    </div>

                    <div className="bg-[#0a0e16] p-4 rounded-xl border border-[#262a33] flex flex-col">
                      <span className="text-[10px] font-mono text-[#bccac0] uppercase">
                        Impact On Merit
                      </span>
                      <span className="font-display font-bold text-2xl text-[#dfe2ee] mt-1">
                        -0.12 ★
                      </span>
                      <span className="text-[10px] font-mono text-[#68dba9] mt-1">
                        Recoverable via Module
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => alert('Connecting to Support Concierge...')}
                      className="bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-mono text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-xl shadow transition-all flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">support_agent</span>
                      Contact Support Concierge
                    </button>
                    <button
                      type="button"
                      onClick={() => alert('Downloading Telematics PDF...')}
                      className="bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] font-mono text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 border border-[#3d4a42]"
                    >
                      <span className="material-symbols-outlined text-sm">receipt_long</span>
                      Download Telematics Log (PDF)
                    </button>
                  </div>
                </div>

                {/* Map Snapshot */}
                <div className="w-full lg:w-80 flex flex-col bg-[#0a0e16] p-4 rounded-xl border border-[#262a33] shrink-0 shadow-inner">
                  <span className="text-[10px] font-mono text-[#bccac0] uppercase font-bold">
                    Telemetry Snapshot
                  </span>
                  <div className="w-full h-44 rounded-lg mt-2 overflow-hidden relative border border-red-500/40 bg-[#181c24]">
                    <Image
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDdAKFq1zmnOXJidFjStDMJsbS5Bdgzptayvz9arFPVtlMh7BTRr5h7lIVj4BIxWoAbtk2DWGaVMSN-ybIjPxbASu7dixkF8yq8iiAtQ0mkj8aSqxbNFJa32X-9BgzJ3jvGX5O3-IjmVEJjLV1h0sGtUHEWu5urgYMYp8fTl4roSk-yy_saln7lNWctkBdge2eGWPcrh5Q5nZJ2uIU3e_VsSAeKjBtCKeW-9PQdr6PZ5ALZowM0JdXa2A"
                      alt="Telemetry Map"
                      fill
                      unoptimized
                      className="w-full h-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-[#0a0e16]/60 flex flex-col items-center justify-center p-4 text-center">
                      <span className="font-mono text-[10px] bg-[#93000a] text-[#ffdad6] px-2.5 py-1 rounded font-bold uppercase">
                        Speed Anomaly Triggered
                      </span>
                      <span className="text-xs font-bold text-[#dfe2ee] mt-1">
                        Airport Expressway KM 14.8
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[10px] text-[#bccac0] pt-3">
                    <span>Session: #DISP-0931</span>
                    <span className="text-red-400 font-bold">GPS Locked</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BLOCKED */}
          {activeTab === 'blocked' && (
            <div className="bg-[#181c24] rounded-2xl p-6 lg:p-8 border border-[#93000a]/50 shadow-xl bg-red-950/10">
              <div className="flex flex-col lg:flex-row items-start justify-between gap-8">
                <div className="flex flex-col gap-4 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 bg-[#93000a] text-[#ffdad6] font-mono text-[10px] font-bold uppercase px-3 py-1 rounded-full">
                      <span className="material-symbols-outlined text-xs">gpp_bad</span>
                      Account Blocked • Governance Lockout
                    </span>
                    <span className="text-[10px] font-mono text-[#bccac0]">
                      Case: #SEC-ESC-49102
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-xl text-[#dfe2ee]">
                    Security Escalation: Identity Mismatch &amp; Dispatch Lockout
                  </h3>
                  <p className="text-xs sm:text-sm text-[#bccac0] leading-relaxed">
                    Your account has been placed into permanent security isolation following three
                    successive biometric verification failures during trip startup at Terminal 3.
                  </p>

                  <div className="bg-[#0a0e16] p-4 rounded-xl border border-[#262a33] flex flex-col gap-2">
                    <span className="text-[10px] font-mono text-[#68dba9] uppercase font-bold">
                      Arbitration &amp; Governance Hearing Protocol
                    </span>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[#bccac0]">
                      <span>Formal review overseen by Independent Chauffeur Tribunal</span>
                      <span className="font-mono text-[#dfe2ee]">
                        Filing Deadline: 7 Business Days
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <button
                      type="button"
                      onClick={() => alert('Arbitration Appeal submitted to Governance Desk.')}
                      className="bg-[#93000a] hover:bg-[#690005] text-[#ffdad6] font-mono text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-xl shadow transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">gavel</span>
                      Submit Arbitration Appeal
                    </button>
                    <button
                      type="button"
                      onClick={() => alert('Opening policy disclosure document...')}
                      className="bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] font-mono text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition-colors border border-[#3d4a42]"
                    >
                      Review Policy Disclosure
                    </button>
                  </div>
                </div>

                <div className="w-full lg:w-80 flex flex-col items-center text-center bg-[#0a0e16] p-6 rounded-xl border border-red-900/40 shrink-0">
                  <div className="w-16 h-16 rounded-full bg-[#93000a]/20 flex items-center justify-center text-red-400 mb-3 border border-red-500/30">
                    <span
                      className="material-symbols-outlined text-3xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      lock
                    </span>
                  </div>
                  <span className="font-display font-bold text-sm text-[#dfe2ee]">
                    Terminal Access Revoked
                  </span>
                  <span className="text-[10px] font-mono text-[#bccac0] mt-1">
                    Biometric Signature Blocked on Node #NDLS-4
                  </span>
                  <div className="w-full bg-[#262a33] h-px my-3"></div>
                  <span className="text-[10px] font-mono text-red-400 font-bold">
                    Tier-4 Sovereign Compliance Mandate
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RECOVERY */}
          {activeTab === 'recovery' && (
            <div className="bg-[#181c24] rounded-2xl p-6 lg:p-8 border border-[#262a33] shadow-xl max-w-4xl mx-auto w-full">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-[#68dba9] font-mono text-xs font-bold uppercase">
                    <span className="material-symbols-outlined text-sm">key</span>
                    <span>Self-Service Recovery Rail</span>
                  </div>
                  <h3 className="font-display font-bold text-xl text-[#dfe2ee]">
                    Chauffeur Credential Reset &amp; Hardware 2FA Sync
                  </h3>
                  <p className="text-xs text-[#bccac0]">
                    Elevate terminal credential security with quantum-resistant password standards
                    and instant multi-device session pruning.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left */}
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="passInput"
                        className="text-[10px] font-mono text-[#bccac0] uppercase"
                      >
                        New Terminal Passphrase
                      </label>
                      <div className="relative flex items-center">
                        <input
                          id="passInput"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => handlePasswordChange(e.target.value)}
                          className="w-full bg-[#0a0e16] text-[#dfe2ee] font-mono text-sm px-4 py-2.5 rounded-lg border border-[#262a33] focus:outline-none focus:border-[#68dba9]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 text-[#bccac0]"
                        >
                          <span className="material-symbols-outlined text-sm">
                            {showPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono text-[10px]">
                        <span className="text-[#bccac0]">Entropy Rating:</span>
                        <span className="text-[#68dba9] font-bold">{strengthText}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full bg-[#0a0e16] rounded-full overflow-hidden">
                        <div className="bg-[#68dba9] h-full"></div>
                        <div className="bg-[#68dba9] h-full"></div>
                        <div className="bg-[#68dba9] h-full"></div>
                        <div className="bg-[#68dba9] h-full"></div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 text-[10px] font-mono text-[#bccac0]">
                      <span className="text-[#68dba9]">✓ At least 12 characters</span>
                      <span className="text-[#68dba9]">✓ Capital letters &amp; numeric digits</span>
                      <span className="text-[#68dba9]">✓ Cryptographic symbol characters</span>
                    </div>
                  </div>

                  {/* Right */}
                  <div className="flex flex-col gap-4 bg-[#0a0e16] p-4 rounded-xl border border-[#262a33]">
                    <span className="text-[10px] font-mono text-[#bccac0] uppercase font-bold">
                      Biometric SMS &amp; Email OTP Sync
                    </span>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs text-[#dfe2ee]">6-Digit Hardware OTP Code</span>
                      <div className="grid grid-cols-6 gap-2">
                        {['7', '3', '9', '1', '8', '4'].map((d, i) => (
                          <input
                            key={i}
                            type="text"
                            defaultValue={d}
                            className="w-full text-center bg-[#181c24] text-[#dfe2ee] font-mono text-sm py-2 rounded-lg border border-[#3d4a42]"
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#bccac0] mt-1">
                        <span>Dispatched to +91 ••••• ••942</span>
                        <button type="button" className="text-[#68dba9] hover:underline">
                          Resend in 32s
                        </button>
                      </div>
                    </div>

                    <label className="flex items-start gap-2 cursor-pointer pt-2 border-t border-[#262a33]">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="mt-0.5 accent-[#68dba9] w-4 h-4 rounded"
                      />
                      <span className="text-xs text-[#dfe2ee]">
                        <strong>Terminate all active sessions</strong> across mobile terminals and
                        dispatch consoles.
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#262a33]">
                  <span className="text-[10px] font-mono text-[#bccac0]">
                    256-Bit Hardware Token Handshake Verified
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('suspended')}
                      className="px-4 py-2 bg-[#262a33] text-[#dfe2ee] font-mono text-xs rounded-lg hover:bg-[#353942]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => alert('Credentials updated successfully!')}
                      className="px-6 py-2 bg-[#68dba9] text-[#003825] font-mono text-xs font-bold uppercase tracking-wider rounded-lg shadow hover:bg-[#85f8c4]"
                    >
                      Update Credentials &amp; Re-Authenticate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

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

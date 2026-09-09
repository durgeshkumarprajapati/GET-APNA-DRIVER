'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DriverOnboardingPage() {
  const router = useRouter();

  // License Form State
  const [dlNumber, setDlNumber] = useState('DL-04201800921');
  const [rtoAuthority, setRtoAuthority] = useState('Delhi RTO (DL-04 Janakpuri Transport Dep)');
  const [expiryDate, setExpiryDate] = useState('2029-11-14');
  const [badgeNumber, setBadgeNumber] = useState('BDG-7822-DEL');

  // Endorsements State
  const [lmvTr, setLmvTr] = useState(true);
  const [transVip, setTransVip] = useState(true);
  const [hmvHgmv, setHmvHgmv] = useState(false);

  // DigiLocker & Verification State
  const [digiLockerTriggered, setDigiLockerTriggered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState(3);

  const handleDigiLockerVerify = () => {
    setDigiLockerTriggered(true);
    setTimeout(() => {
      setDigiLockerTriggered(false);
      alert('DigiLocker Aadhaar & Address Certificate verified successfully!');
    }, 1500);
  };

  const handleContinueNextStep = async () => {
    setSubmitting(true);
    try {
      // Trigger submission endpoint
      await fetch('/api/driver/onboarding/submit', { method: 'POST' });
    } catch {
      // Fallback
    } finally {
      setSubmitting(false);
      setActiveStep(4);
      router.push('/driver');
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
            <span className="px-3 py-1.5 uppercase tracking-wider bg-[#262a33] text-[#dfe2ee] font-semibold rounded-lg shadow-[0_0_12px_rgba(5,150,105,0.25)]">
              Driver KYC Wizard
            </span>
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
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover ring-1 ring-[#68dba9]/40"
                src="https://lh3.googleusercontent.com/aida/AEtjO1WxTO3NWRJYA6Ib8PoLewFtFM192nboytw0dzwqWk0TIlG-EKLuweHK3XEBiNQPnRKauOOKRhAitZ0MSszwg63MMJtw0CZH0PQuLqh2eFIwV8e0k116pkMkpiHFZjv6K7_YcBF4yrXC9ju4097kjEeBXeIHsRM6FJqVKl32MXq3hJit4vg6qpYolsOCW13MleiFjFXW7na0Il8qSvKmcsODjxcQAHKnbfL_TtjEDmBexYKDZrzUvLjYLyQ"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="pt-20 pb-16 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8">
        {/* Top Header & Progress Stepper Tracker */}
        <div className="bg-[#181c24] p-6 sm:p-8 rounded-2xl border border-[#262a33] shadow-xl flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <span className="bg-[#00311f] text-[#68dba9] text-[10px] font-mono font-bold px-2.5 py-0.5 rounded flex items-center gap-1.5 uppercase tracking-wider border border-[#25a475]/30">
                  <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-pulse"></span>
                  KYC PROTOCOL v4.8 • ACTIVE SESSION
                </span>
                <span className="text-xs font-mono text-[#bccac0]">UID: APNA-DL-98421-IN</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#dfe2ee] mt-1">
                DRIVER PARTNER ONBOARDING &amp; GOVERNMENT CREDENTIAL INGESTION
              </h1>
              <p className="text-xs sm:text-sm text-[#bccac0] max-w-3xl">
                Complete mandatory statutory verification to unlock the Tier-1 VIP dispatch queue.
                Validated credentials interface directly with MoRTH Sarathi and UIDAI digital
                pipelines.
              </p>
            </div>

            <div className="bg-[#0a0e16] p-3 px-4 rounded-xl border border-[#262a33] flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-lg bg-[#262a33] flex items-center justify-center text-[#68dba9]">
                <span className="material-symbols-outlined text-lg">shield_person</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[10px] font-mono text-[#bccac0] uppercase">
                  PROFILE STATE
                </span>
                <span className="font-display font-bold text-xs text-[#68dba9]">
                  Tier-1 VIP Pending
                </span>
              </div>
            </div>
          </div>

          {/* 6 Step Progress Stepper */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 pt-2">
            {/* Step 1 */}
            <div className="bg-[#0a0e16] p-3 rounded-xl border border-[#262a33] flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#00311f] text-[#68dba9] flex items-center justify-center font-mono font-bold text-xs shrink-0">
                ✓
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-mono text-[#bccac0]">01 • IDENTITY</span>
                <span className="text-xs font-bold text-[#dfe2ee] truncate">Personal Profile</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-[#0a0e16] p-3 rounded-xl border border-[#262a33] flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#00311f] text-[#68dba9] flex items-center justify-center font-mono font-bold text-xs shrink-0">
                ✓
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-mono text-[#bccac0]">02 • EXPERIENCE</span>
                <span className="text-xs font-bold text-[#dfe2ee] truncate">Driving Portfolio</span>
              </div>
            </div>

            {/* Step 3 (Active) */}
            <div className="bg-[#262a33] p-3 rounded-xl border border-[#68dba9] shadow-[0_0_12px_rgba(104,219,169,0.3)] flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#68dba9] text-[#003825] flex items-center justify-center font-mono font-bold text-xs shrink-0">
                3
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-mono text-[#68dba9] font-bold">● ACTIVE STEP</span>
                <span className="text-xs font-bold text-[#dfe2ee] truncate">
                  Commercial License
                </span>
              </div>
            </div>

            {/* Step 4 */}
            <div
              className={`bg-[#0a0e16] p-3 rounded-xl border border-[#262a33] flex items-center gap-2.5 ${activeStep > 3 ? 'opacity-100' : 'opacity-60'}`}
            >
              <div className="w-7 h-7 rounded-lg bg-[#181c24] text-[#bccac0] flex items-center justify-center font-mono font-bold text-xs shrink-0">
                4
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-mono text-[#bccac0]">04 • UIDAI</span>
                <span className="text-xs font-bold text-[#dfe2ee] truncate">Aadhaar Biometric</span>
              </div>
            </div>

            {/* Step 5 */}
            <div className="bg-[#0a0e16] p-3 rounded-xl border border-[#262a33] flex items-center gap-2.5 opacity-60">
              <div className="w-7 h-7 rounded-lg bg-[#181c24] text-[#bccac0] flex items-center justify-center font-mono font-bold text-xs shrink-0">
                5
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-mono text-[#bccac0]">05 • SECURITY</span>
                <span className="text-xs font-bold text-[#dfe2ee] truncate">Police Clearance</span>
              </div>
            </div>

            {/* Step 6 */}
            <div className="bg-[#0a0e16] p-3 rounded-xl border border-[#262a33] flex items-center gap-2.5 opacity-60">
              <div className="w-7 h-7 rounded-lg bg-[#181c24] text-[#bccac0] flex items-center justify-center font-mono font-bold text-xs shrink-0">
                6
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-mono text-[#bccac0]">06 • INGESTION</span>
                <span className="text-xs font-bold text-[#dfe2ee] truncate">Final Review</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dual-Panel Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Government License Matrix & Dual Document Upload (7 cols) */}
          <div className="lg:col-span-7 bg-[#181c24] p-6 sm:p-8 rounded-2xl border border-[#262a33] shadow-xl flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-[#262a33] pb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#68dba9] animate-pulse"></span>
                <h3 className="font-display font-bold text-base text-[#dfe2ee]">
                  Sarathi RTO Direct Handshake
                </h3>
                <span className="text-[10px] font-mono text-[#bccac0]">• Active Socket</span>
              </div>
              <span className="text-[10px] font-mono text-[#68dba9] bg-[#00311f] px-2 py-0.5 rounded font-bold">
                LATENCY 42MS
              </span>
            </div>

            {/* Government License Matrix */}
            <div className="flex flex-col gap-4 bg-[#0a0e16] p-5 rounded-xl border border-[#262a33]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#dfe2ee]">
                  <span className="material-symbols-outlined text-[#68dba9] text-base">badge</span>
                  <span>GOVERNMENT LICENSE MATRIX</span>
                </div>
                <span className="text-[10px] font-mono bg-[#262a33] text-[#bccac0] px-2 py-0.5 rounded">
                  FORM 7 COMPLIANT
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="dlNumber"
                    className="text-[10px] font-mono text-[#bccac0] uppercase"
                  >
                    Driving License Number
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="dlNumber"
                      type="text"
                      value={dlNumber}
                      onChange={(e) => setDlNumber(e.target.value)}
                      className="w-full bg-[#181c24] text-[#dfe2ee] font-mono text-sm px-3 py-2 rounded-lg border border-[#262a33] focus:outline-none focus:border-[#68dba9]"
                    />
                    <span className="material-symbols-outlined absolute right-3 text-[#68dba9] text-base">
                      check_circle
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-[#68dba9] mt-0.5">
                    ✓ Verified against MoRTH Central Registry
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="rtoAuthority"
                    className="text-[10px] font-mono text-[#bccac0] uppercase"
                  >
                    Issuing Authority (RTO)
                  </label>
                  <select
                    id="rtoAuthority"
                    value={rtoAuthority}
                    onChange={(e) => setRtoAuthority(e.target.value)}
                    className="w-full bg-[#181c24] text-[#dfe2ee] font-mono text-xs px-3 py-2.5 rounded-lg border border-[#262a33] focus:outline-none focus:border-[#68dba9]"
                  >
                    <option value="Delhi RTO (DL-04 Janakpuri Transport Dep)">
                      Delhi RTO (DL-04 Janakpuri Transport Dep)
                    </option>
                    <option value="HR-26 Gurugram Commercial RTO">
                      HR-26 Gurugram Commercial RTO
                    </option>
                    <option value="UP-16 Noida Regional Transport Office">
                      UP-16 Noida Regional Transport Office
                    </option>
                    <option value="MH-02 Mumbai West RTO">MH-02 Mumbai West RTO</option>
                  </select>
                  <span className="text-[9px] font-mono text-[#bccac0] mt-0.5">
                    Zone 1 Executive Mobility Approved
                  </span>
                </div>
              </div>

              {/* License Endorsements */}
              <div className="flex flex-col gap-1.5 pt-2">
                <span className="text-[10px] font-mono text-[#bccac0] uppercase">
                  License Classification Endorsements
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-[#181c24] border border-[#262a33] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lmvTr}
                      onChange={(e) => setLmvTr(e.target.checked)}
                      className="w-4 h-4 accent-[#68dba9] cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-mono font-bold text-[#dfe2ee]">LMV-TR</span>
                      <span className="text-[9px] text-[#bccac0]">Light Motor Commercial</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-[#181c24] border border-[#262a33] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={transVip}
                      onChange={(e) => setTransVip(e.target.checked)}
                      className="w-4 h-4 accent-[#68dba9] cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-mono font-bold text-[#dfe2ee]">TRANS VIP</span>
                      <span className="text-[9px] text-[#bccac0]">Commercial Transport</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-[#181c24] border border-[#262a33] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hmvHgmv}
                      onChange={(e) => setHmvHgmv(e.target.checked)}
                      className="w-4 h-4 accent-[#68dba9] cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-mono font-bold text-[#dfe2ee]">HMV / HGMV</span>
                      <span className="text-[9px] text-[#bccac0]">Heavy Passenger Coach</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Expiry & Badge Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="expiryDate"
                    className="text-[10px] font-mono text-[#bccac0] uppercase"
                  >
                    Commercial Validity Expiry
                  </label>
                  <input
                    id="expiryDate"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-[#181c24] text-[#dfe2ee] font-mono text-xs px-3 py-2 rounded-lg border border-[#262a33] focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="badgeNumber"
                    className="text-[10px] font-mono text-[#bccac0] uppercase"
                  >
                    Commercial Driver Badge Number
                  </label>
                  <input
                    id="badgeNumber"
                    type="text"
                    value={badgeNumber}
                    onChange={(e) => setBadgeNumber(e.target.value)}
                    className="w-full bg-[#181c24] text-[#dfe2ee] font-mono text-xs px-3 py-2 rounded-lg border border-[#262a33] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* High-Fidelity Document Dual Ingestion */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#bccac0] uppercase font-bold">
                  HIGH-FIDELITY DOCUMENT DUAL INGESTION
                </span>
                <span className="text-[10px] font-mono text-[#bccac0]">
                  JPG, PNG, PDF up to 10MB
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Front Scan Box */}
                <div className="bg-[#0a0e16] p-4 rounded-xl border border-[#262a33] flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#68dba9] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">id_card</span> Front Scan
                      Active
                    </span>
                    <span className="bg-[#00311f] text-[#68dba9] px-2 py-0.5 rounded font-bold text-[10px]">
                      OCR MATCH 99.2%
                    </span>
                  </div>

                  <div className="relative w-full h-36 rounded-lg overflow-hidden border border-[#262a33] bg-[#181c24]">
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAKNCqq2PM1oa59sRcaSonA1k4gRzmzr3mkjHrNB9UnYqG3folXJkF5zUuK5QDt6sx4n48Exa1ZlvjknD7PMLvbMg6MYEiYWPZcnPVX9lRCKwat-njkKU5C_T-RPP6QEfa7dCTz3dBzErijFPrTA4S_4zMDBE6ayEKSj5p_cHc4_47vRwEqu0xfVOkj8ijp8024iYjaDaUfsr22TMJYhTsiABJNT3b4s6Q9VCW_37QLDAsHno9oSR7h_g"
                      alt="Front Driving License Scan"
                      className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute bottom-2 left-2 bg-[#0a0e16]/90 px-2 py-1 rounded text-[9px] font-mono text-[#dfe2ee] border border-[#262a33]">
                      VIKRAM_SINGH_DL_FRONT.png (2.4 MB)
                    </div>
                  </div>

                  <div className="space-y-1 text-[10px] font-mono text-[#bccac0] bg-[#181c24] p-2.5 rounded border border-[#262a33]">
                    <div className="flex justify-between">
                      <span>Parsed Full Name:</span>
                      <strong className="text-[#dfe2ee]">VIKRAMADITYA SINGH</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Chip Signature:</span>
                      <strong className="text-[#68dba9]">CRYPT_HASH_VALID</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => alert('Uploading new front DL image scan...')}
                    className="w-full py-1.5 bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] font-mono text-xs rounded-lg transition-colors"
                  >
                    ↻ Replace Front Image
                  </button>
                </div>

                {/* Back Scan Box */}
                <div className="bg-[#0a0e16] p-4 rounded-xl border border-[#262a33] flex flex-col gap-3 justify-between">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#bccac0] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">id_card</span> Back Side
                      of License
                    </span>
                    <span className="bg-[#262a33] text-[#bccac0] px-2 py-0.5 rounded text-[10px]">
                      AWAITING INPUT
                    </span>
                  </div>

                  <div className="w-full h-36 rounded-lg border-2 border-dashed border-[#3d4a42] bg-[#181c24]/50 flex flex-col items-center justify-center gap-2 p-4 text-center cursor-pointer hover:border-[#68dba9] transition-colors">
                    <div className="w-10 h-10 rounded-full bg-[#262a33] flex items-center justify-center text-[#68dba9]">
                      <span className="material-symbols-outlined text-xl">cloud_upload</span>
                    </div>
                    <span className="text-xs font-bold text-[#dfe2ee]">
                      Drag and drop Back of DL
                    </span>
                    <span className="text-[10px] font-mono text-[#bccac0]">
                      Ensure QR barcode and emergency blood group markers are legible without glare
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => alert('Webcam scanner initiated.')}
                    className="w-full py-1.5 bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] font-mono text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">photo_camera</span>
                    Or Capture with Webcam
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Match Verification Badge */}
            <div className="bg-[#0a0e16] p-4 rounded-xl border border-[#25a475]/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#00311f] text-[#68dba9] font-mono font-bold text-sm flex items-center justify-center border border-[#25a475]">
                  99%
                </div>
                <div>
                  <h5 className="font-display font-bold text-xs text-[#dfe2ee]">
                    Algorithmic Match Verified
                  </h5>
                  <p className="text-[10px] text-[#bccac0]">
                    Facial biometric on driving record matches Step 1 Driver Selfie with zero flag
                    anomalies.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-[#68dba9] bg-[#00311f] px-2.5 py-1 rounded font-bold border border-[#25a475]/50">
                ✓ Instant Ingestion Ready
              </span>
            </div>
          </div>

          {/* Right Column: DigiLocker, Compliance Checklist & Sovereign Vault (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Step 4 Fast-Track Box: UIDAI DigiLocker Gateway */}
            <div className="bg-[#181c24] p-6 rounded-2xl border border-[#262a33] shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#68dba9] text-xl">
                    fingerprint
                  </span>
                  <div>
                    <span className="text-[9px] font-mono text-[#68dba9] font-bold uppercase block">
                      STEP 4 FAST-TRACK
                    </span>
                    <h4 className="font-display font-bold text-sm text-[#dfe2ee]">
                      UIDAI DigiLocker Gateway
                    </h4>
                  </div>
                </div>
                <span className="text-[9px] font-mono bg-[#0053db] text-[#cdd7ff] px-2 py-0.5 rounded font-bold">
                  Govt Sandbox
                </span>
              </div>

              <p className="text-xs text-[#bccac0] leading-relaxed">
                Connect your Aadhaar-linked mobile device to pull digitally authenticated Driver
                &amp; Address certificates directly from DigiLocker Cloud in 5 seconds.
              </p>

              <div className="bg-[#0a0e16] p-3 rounded-xl border border-[#262a33] space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-[#bccac0]">Aadhaar Linked Mobile:</span>
                  <strong className="text-[#dfe2ee]">+91 ••••• ••902</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#bccac0]">DigiLocker Consent Status:</span>
                  <strong className="text-[#68dba9]">Authorized Session</strong>
                </div>
              </div>

              <button
                type="button"
                disabled={digiLockerTriggered}
                onClick={handleDigiLockerVerify}
                className="w-full py-2.5 bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 border border-[#3d4a42]"
              >
                <span className="material-symbols-outlined text-sm">lock</span>
                {digiLockerTriggered ? 'Triggering OTP...' : 'Trigger Instant OTP Verification'}
              </button>
            </div>

            {/* Compliance Checklist */}
            <div className="bg-[#181c24] p-6 rounded-2xl border border-[#262a33] shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h4 className="font-display font-bold text-sm text-[#dfe2ee]">
                  COMPLIANCE CHECKLIST
                </h4>
                <span className="text-xs font-mono text-[#68dba9] font-bold">2/4 Cleared</span>
              </div>

              <div className="space-y-3 text-xs font-mono">
                {/* Item 1 */}
                <div className="bg-[#0a0e16] p-3 rounded-xl border border-[#262a33] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#68dba9] text-base">
                      check_circle
                    </span>
                    <div>
                      <span className="font-bold text-[#dfe2ee] block">Commercial DL Validity</span>
                      <span className="text-[10px] text-[#bccac0]">
                        Current Delhi RTO commercial endorsement valid till Nov 2029
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#68dba9] font-bold">PASSED</span>
                </div>

                {/* Item 2 */}
                <div className="bg-[#0a0e16] p-3 rounded-xl border border-[#262a33] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#68dba9] text-base">
                      check_circle
                    </span>
                    <div>
                      <span className="font-bold text-[#dfe2ee] block">Min. 3 Years Verified</span>
                      <span className="text-[10px] text-[#bccac0]">
                        Exceeds the 36-month minimum professional requirement
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#68dba9] font-bold">6.4 YRS EXP</span>
                </div>

                {/* Item 3 */}
                <div className="bg-[#0a0e16] p-3 rounded-xl border border-[#262a33] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#bccac0] text-base">
                      more_horiz
                    </span>
                    <div>
                      <span className="font-bold text-[#dfe2ee] block">
                        Criminal Record Clearance
                      </span>
                      <span className="text-[10px] text-[#bccac0]">
                        Automated lookup via Police Special Cell criminal database
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#bccac0] font-bold">NEXT STEP</span>
                </div>

                {/* Item 4 */}
                <div className="bg-[#0a0e16] p-3 rounded-xl border border-[#262a33] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#bccac0] text-base">
                      more_horiz
                    </span>
                    <div>
                      <span className="font-bold text-[#dfe2ee] block">
                        Medical &amp; Eye Fitness Cert
                      </span>
                      <span className="text-[10px] text-[#bccac0]">
                        Affiliated clinical center certificate or Form 1A upload
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#bccac0] font-bold">SCHEDULED</span>
                </div>
              </div>

              {/* Cryptographic Sovereign Vault Box */}
              <div className="bg-[#0a0e16] p-4 rounded-xl border border-[#3d4a42]/40 flex items-start gap-3">
                <span className="material-symbols-outlined text-[#68dba9] text-lg shrink-0">
                  encrypted
                </span>
                <div className="space-y-0.5">
                  <h5 className="font-display font-bold text-xs text-[#dfe2ee]">
                    CRYPTOGRAPHIC SOVEREIGN VAULT
                  </h5>
                  <p className="text-[10px] text-[#bccac0] leading-relaxed">
                    All uploaded documents receive a deterministic SHA-256 tamper-proof watermark:
                    &quot;LICENSED SOLELY FOR GET APNA DRIVER ONBOARDING&quot; to eliminate identity
                    duplication risks.
                  </p>
                </div>
              </div>
            </div>

            {/* Target Clearance Level Box */}
            <div className="bg-[#0a0e16] p-4 rounded-2xl border border-[#262a33] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8F6F_G60tL85i0VbLoYsZUe6_uzL7l6D-KtuIDLdlpqFxIYqY57HHbCF2tOxTlAMnnWiRKb3ELkhl-HDYA4v13dBO5sJZ_RTQdWz7JrVlYllgBI_eR10dlPO9jvwG3jQ6ZZO32JZPyH0PvqlvLtX9cUGfjbmWvSptC7KXokWZxjOtfCFssMpPoDGgyIfphTpiqVUJmEVCTrZGy6ym6bc8mteVmqPhNEoB_57KxFtN9hFR_p-WcM7APg"
                  alt="Luxury vehicle preview"
                  className="w-12 h-12 rounded-lg object-cover border border-[#262a33]"
                />
                <div>
                  <span className="text-[9px] font-mono text-[#68dba9] font-bold uppercase block">
                    TARGET CLEARANCE: LEVEL 1
                  </span>
                  <h5 className="font-display font-bold text-sm text-[#dfe2ee]">
                    Diplomatic &amp; C-Suite Tier
                  </h5>
                  <span className="text-[10px] font-mono text-[#bccac0]">
                    Expected Base Payout: ₹48,000 - ₹72,000 / mo + Gratuities
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={handleContinueNextStep}
                className="w-full py-3.5 px-6 bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(104,219,169,0.25)] flex items-center justify-center gap-2"
              >
                <span>{submitting ? 'Processing...' : 'Continue to Police Verification'}</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="py-2.5 px-4 bg-[#181c24] hover:bg-[#262a33] text-[#dfe2ee] font-mono text-xs rounded-xl transition-colors text-center border border-[#262a33]"
                >
                  &larr; Previous
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/driver')}
                  className="py-2.5 px-4 bg-[#181c24] hover:bg-[#262a33] text-[#dfe2ee] font-mono text-xs rounded-xl transition-colors text-center border border-[#262a33]"
                >
                  Save Draft &amp; Exit
                </button>
              </div>
            </div>
          </div>
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

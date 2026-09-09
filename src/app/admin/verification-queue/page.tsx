'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';

export default function VerificationQueuePage() {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'OCR' | 'APPROVED' | 'FRAUD' | 'EXPIRED'>(
    'PENDING',
  );
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isInverted, setIsInverted] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  return (
    <AdminLayout activePath="verification-queue">
      <div className="flex flex-col w-full gap-6">
        {/* Toast Notification Banner */}
        {notificationMsg && (
          <div className="fixed top-20 right-8 z-50 bg-[#25a475] text-[#00311f] px-4 py-3 rounded-lg shadow-2xl font-semibold text-sm flex items-center gap-2 border border-[#68dba9]">
            <span className="material-symbols-outlined">check_circle</span>
            <span>{notificationMsg}</span>
          </div>
        )}

        {/* TOP SYSTEM HEADER STRIP */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0a0e16] p-4 rounded-xl border border-[#262a33]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#68dba9] animate-pulse" />
              <span className="font-mono text-xs text-[#68dba9] font-bold">
                KYC ORCHESTRATION ENGINE • v4.19_PROD
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] tracking-tight mt-1">
              Driver Credential Ingestion &amp; Governance
            </h1>
          </div>

          <div className="flex items-center gap-3 flex-wrap font-mono text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-[#181c24] border border-[#262a33] flex items-center gap-2 text-[#bccac0]">
              <span className="w-2 h-2 rounded-full bg-[#68dba9]" />
              <span>MORTH SARATHI:</span>
              <span className="text-[#68dba9] font-bold">99.9%</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#181c24] border border-[#262a33] flex items-center gap-2 text-[#bccac0]">
              <span className="w-2 h-2 rounded-full bg-[#68dba9]" />
              <span>UIDAI DIGILOCKER:</span>
              <span className="text-[#68dba9] font-bold">18ms</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#181c24] border border-[#262a33] flex items-center gap-2 text-[#bccac0]">
              <span className="w-2 h-2 rounded-full bg-[#68dba9]" />
              <span>NCR POLICE CCTNS:</span>
              <span className="text-[#68dba9] font-bold">AUTH</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#181c24] border border-[#262a33] flex items-center gap-2 text-[#bccac0]">
              <span className="w-2 h-2 rounded-full bg-[#68dba9]" />
              <span>ICICI ESCORT:</span>
              <span className="text-[#68dba9] font-bold">ACTIVE</span>
            </div>
          </div>
        </div>

        {/* METRIC TABS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`p-3 rounded-xl border transition-all text-left flex items-center justify-between ${
              activeTab === 'PENDING'
                ? 'bg-[#25a475] text-[#00311f] border-[#68dba9] font-bold shadow-lg'
                : 'bg-[#0a0e16] text-[#bccac0] border-[#262a33] hover:bg-[#181c24]'
            }`}
          >
            <span>PENDING REVIEW</span>
            <span className="text-lg font-bold">08</span>
          </button>

          <button
            onClick={() => setActiveTab('OCR')}
            className={`p-3 rounded-xl border transition-all text-left flex items-center justify-between ${
              activeTab === 'OCR'
                ? 'bg-[#25a475] text-[#00311f] border-[#68dba9] font-bold shadow-lg'
                : 'bg-[#0a0e16] text-[#bccac0] border-[#262a33] hover:bg-[#181c24]'
            }`}
          >
            <span>ACTIVE OCR</span>
            <span className="text-lg font-bold">14</span>
          </button>

          <button
            onClick={() => setActiveTab('APPROVED')}
            className={`p-3 rounded-xl border transition-all text-left flex items-center justify-between ${
              activeTab === 'APPROVED'
                ? 'bg-[#25a475] text-[#00311f] border-[#68dba9] font-bold shadow-lg'
                : 'bg-[#0a0e16] text-[#bccac0] border-[#262a33] hover:bg-[#181c24]'
            }`}
          >
            <span>APPROVED TODAY</span>
            <span className="text-lg font-bold">42</span>
          </button>

          <button
            onClick={() => setActiveTab('FRAUD')}
            className={`p-3 rounded-xl border transition-all text-left flex items-center justify-between ${
              activeTab === 'FRAUD'
                ? 'bg-[#93000a] text-[#ffdad6] border-[#ffb4ab] font-bold shadow-lg'
                : 'bg-[#0a0e16] text-[#ffb4ab] border-[#93000a]/50 hover:bg-[#181c24]'
            }`}
          >
            <span>FRAUD ALERTS</span>
            <span className="text-lg font-bold">03</span>
          </button>

          <button
            onClick={() => setActiveTab('EXPIRED')}
            className={`p-3 rounded-xl border transition-all text-left flex items-center justify-between ${
              activeTab === 'EXPIRED'
                ? 'bg-[#25a475] text-[#00311f] border-[#68dba9] font-bold shadow-lg'
                : 'bg-[#0a0e16] text-[#bccac0] border-[#262a33] hover:bg-[#181c24]'
            }`}
          >
            <span>EXPIRED DOCS</span>
            <span className="text-lg font-bold">19</span>
          </button>
        </div>

        {/* MAIN SPLIT VIEWPORT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Applicant Dossier & Statutory Checklist (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Applicant Profile Dossier Card */}
            <div className="bg-[#0a0e16] rounded-xl p-5 border border-[#262a33] shadow-xl flex flex-col gap-4">
              <div className="flex items-start justify-between border-b border-[#262a33] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-[#25a475]/20 border-2 border-[#68dba9] flex items-center justify-center font-bold text-xl text-[#68dba9] font-['Space_Grotesk']">
                    MS
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                        Manpreet Singh
                      </h2>
                      <span className="px-2 py-0.5 rounded bg-[#25a475]/20 text-[#68dba9] font-mono text-[9px] font-bold border border-[#25a475]">
                        VIP CLASS
                      </span>
                    </div>
                    <div className="text-xs font-mono text-[#87948b] mt-0.5">
                      APPLICANT_ID: DL-88421-VIP
                    </div>
                    <div className="text-xs font-mono text-[#b4c5ff] mt-1">
                      Tier Clearance: Mercedes S-Class &amp; BMW 7-Series Certified
                    </div>
                  </div>
                </div>
              </div>

              {/* SLA Countdown Timer Box */}
              <div className="bg-[#181c24] p-3 rounded-xl border border-[#262a33] flex items-center justify-between">
                <span className="text-xs font-mono text-[#87948b]">SLA EXPIRES IN:</span>
                <span className="text-2xl font-bold font-mono text-[#68dba9] tracking-widest animate-pulse">
                  00:14:32
                </span>
              </div>

              {/* Driver Stats */}
              <div className="grid grid-cols-3 gap-2 font-mono text-center">
                <div className="bg-[#181c24] p-2.5 rounded-lg border border-[#262a33]">
                  <div className="text-[9px] text-[#87948b]">DRIVING EXP</div>
                  <div className="text-base font-bold text-[#dfe2ee]">8.4 YRS</div>
                </div>
                <div className="bg-[#181c24] p-2.5 rounded-lg border border-[#262a33]">
                  <div className="text-[9px] text-[#87948b]">SAFETY INDEX</div>
                  <div className="text-base font-bold text-[#68dba9]">99.8%</div>
                </div>
                <div className="bg-[#181c24] p-2.5 rounded-lg border border-[#262a33]">
                  <div className="text-[9px] text-[#87948b]">INCIDENTS</div>
                  <div className="text-base font-bold text-[#dfe2ee]">00</div>
                </div>
              </div>
            </div>

            {/* Statutory Compliance Checklist Card */}
            <div className="bg-[#0a0e16] rounded-xl p-5 border border-[#262a33] shadow-xl flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#68dba9] text-[20px]">
                    fact_check
                  </span>
                  <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    Statutory Compliance Check
                  </h3>
                </div>
                <span className="bg-[#25a475]/20 text-[#68dba9] font-mono text-[10px] px-2 py-0.5 rounded font-bold border border-[#25a475]">
                  5/5 VALIDATED
                </span>
              </div>

              <div className="flex flex-col gap-2 font-mono text-xs">
                {/* Step 1 */}
                <div className="bg-[#181c24] p-3 rounded-lg border border-[#262a33] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#68dba9] text-[18px]">
                      fingerprint
                    </span>
                    <div>
                      <div className="text-[#dfe2ee] font-bold">
                        UIDAI DigiLocker Biometric e-KYC
                      </div>
                      <div className="text-[10px] text-[#87948b]">Masked: XXXX-XXXX-9142</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#25a475]/20 text-[#68dba9] text-[10px] font-bold">
                    100% CONFIRMED
                  </span>
                </div>

                {/* Step 2 */}
                <div className="bg-[#181c24] p-3 rounded-lg border border-[#262a33] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#68dba9] text-[18px]">
                      badge
                    </span>
                    <div>
                      <div className="text-[#dfe2ee] font-bold">
                        MoRTH Commercial License (LMV-TR)
                      </div>
                      <div className="text-[10px] text-[#87948b]">
                        DL-042021009182 • Exp: 18-NOV-2029
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#25a475]/20 text-[#68dba9] text-[10px] font-bold">
                    SARATHI MATCH
                  </span>
                </div>

                {/* Step 3 */}
                <div className="bg-[#181c24] p-3 rounded-lg border border-[#262a33] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#68dba9] text-[18px]">
                      local_police
                    </span>
                    <div>
                      <div className="text-[#dfe2ee] font-bold">
                        Police Clearance Certificate (PCC)
                      </div>
                      <div className="text-[10px] text-[#87948b]">
                        Connaught Place Secretariat #PCC-881
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#25a475]/20 text-[#68dba9] text-[10px] font-bold">
                    NO CRIMINAL REC
                  </span>
                </div>

                {/* Step 4 */}
                <div className="bg-[#181c24] p-3 rounded-lg border border-[#262a33] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#68dba9] text-[18px]">
                      medical_services
                    </span>
                    <div>
                      <div className="text-[#dfe2ee] font-bold">
                        Breathalyzer &amp; Medical Fitness (Form 1A)
                      </div>
                      <div className="text-[10px] text-[#87948b]">
                        Blood Group: O+ • Visual Acuity 6/6 Clear
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#25a475]/20 text-[#68dba9] text-[10px] font-bold">
                    SUBMITTED &amp; SIGNED
                  </span>
                </div>

                {/* Step 5 */}
                <div className="bg-[#181c24] p-3 rounded-lg border border-[#262a33] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#68dba9] text-[18px]">
                      sports_score
                    </span>
                    <div>
                      <div className="text-[#dfe2ee] font-bold">
                        VIP Automatic Transmission Track Test
                      </div>
                      <div className="text-[10px] text-[#87948b]">
                        Evaluator: Master Trainer V. Verma (NCR Track 2)
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#25a475]/20 text-[#68dba9] text-[10px] font-bold">
                    9.8 / 10 DISTINCTION
                  </span>
                </div>
              </div>
            </div>

            {/* Up Next Pipeline Strip */}
            <div className="bg-[#0a0e16] p-3 rounded-xl border border-[#262a33] flex items-center justify-between font-mono text-xs">
              <span className="text-[#87948b]">UP NEXT IN PIPELINE:</span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#181c24] text-[#dfe2ee] border border-[#262a33]">
                  Amit K. Yadav (DL-09923)
                </span>
                <span className="px-2 py-0.5 rounded bg-[#181c24] text-[#dfe2ee] border border-[#262a33]">
                  Rohit Sharma (DL-44612)
                </span>
              </div>
            </div>

            {/* ACTION BUTTONS ROW */}
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                <button
                  onClick={() => showNotification('Re-upload request sent to candidate SMS')}
                  className="bg-[#181c24] hover:bg-[#262a33] text-[#dfe2ee] p-2.5 rounded-lg border border-[#262a33] transition-colors"
                >
                  Request Re-upload
                </button>
                <button
                  onClick={() => showNotification('Escalated to Senior Auditor Level 4')}
                  className="bg-[#181c24] hover:bg-[#262a33] text-[#b4c5ff] p-2.5 rounded-lg border border-[#262a33] transition-colors"
                >
                  Escalate to Senior
                </button>
                <button
                  onClick={() => showNotification('Applicant Rejected & Suspended')}
                  className="bg-[#93000a]/30 hover:bg-[#93000a] text-[#ffdad6] p-2.5 rounded-lg border border-[#93000a] transition-colors font-bold"
                >
                  Reject &amp; Suspend
                </button>
              </div>

              <button
                onClick={() => showNotification('Applicant Approved! Dispatch Tier-1 Activated.')}
                className="w-full bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] font-bold text-sm py-3 px-4 rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all font-['Space_Grotesk']"
              >
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                Approve &amp; Activate Dispatch Tier-1
              </button>

              <div className="flex items-center justify-between pt-2 border-t border-[#262a33] font-mono text-xs">
                <button
                  onClick={() => showNotification('Batch Approval Executed for 6 Candidates')}
                  className="bg-[#181c24] hover:bg-[#262a33] text-[#68dba9] px-3 py-1.5 rounded-lg border border-[#262a33] font-bold"
                >
                  BATCH APPROVE 6 VERIFIED CANDIDATES
                </button>
                <button
                  onClick={() => showNotification('Audit CSV exported to downloads')}
                  className="text-[#87948b] hover:text-[#dfe2ee] underline"
                >
                  Export Audit CSV
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Document Verification Viewport & Facial Cross-Match (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* MoRTH Commercial License Inspection Viewport */}
            <div className="bg-[#0a0e16] rounded-xl p-5 border border-[#262a33] shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#68dba9] text-[20px]">
                    article
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                      MoRTH Form 6 Commercial Driver License
                    </h3>
                    <span className="text-[10px] font-mono text-[#87948b]">
                      SARATHI-REGISTRY-HASH: 8f2b604e3c99a...
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <button
                    onClick={() => setZoomLevel((z) => (z === 100 ? 150 : 100))}
                    className="px-2.5 py-1 rounded bg-[#181c24] border border-[#262a33] text-[#dfe2ee]"
                  >
                    Zoom {zoomLevel}%
                  </button>
                  <button
                    onClick={() => setIsInverted(!isInverted)}
                    className="px-2.5 py-1 rounded bg-[#181c24] border border-[#262a33] text-[#dfe2ee]"
                  >
                    {isInverted ? 'Normal' : 'Invert Layer'}
                  </button>
                </div>
              </div>

              {/* Document Display Box with OCR Overlays */}
              <div
                className={`relative w-full h-80 rounded-xl bg-[#181c24] border border-[#262a33] overflow-hidden flex items-center justify-center p-4 transition-all ${
                  isInverted ? 'invert grayscale' : ''
                }`}
              >
                {/* Visual License Graphic Card */}
                <div className="relative w-full max-w-lg h-full bg-[#1c2028] rounded-xl border border-[#3d4a42] p-4 flex flex-col justify-between shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between border-b border-[#262a33] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[#68dba9]" />
                      <span className="font-mono text-xs font-bold text-[#dfe2ee]">
                        INDIAN UNION DRIVING LICENSE (COMMERCIAL)
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-[#68dba9] bg-[#25a475]/20 px-2 py-0.5 rounded font-bold border border-[#25a475]">
                      SHA-256 CHECKSUM PASSED
                    </span>
                  </div>

                  {/* License Content Body with Highlight Bounding Boxes */}
                  <div className="grid grid-cols-12 gap-3 my-2 items-center">
                    <div className="col-span-4 bg-[#0a0e16] h-28 rounded-lg border border-[#68dba9] p-1 flex items-center justify-center relative overflow-hidden">
                      <div className="w-full h-full bg-[#25a475]/20 flex flex-col items-center justify-center text-[#68dba9]">
                        <span className="material-symbols-outlined text-4xl">person</span>
                        <span className="text-[9px] font-mono">PORTRAIT OK</span>
                      </div>
                      <span className="absolute top-1 left-1 bg-[#68dba9] text-[#00311f] font-mono text-[8px] font-bold px-1 rounded">
                        CONF: 99.8%
                      </span>
                    </div>

                    <div className="col-span-8 flex flex-col gap-1.5 font-mono text-xs">
                      <div className="p-1.5 rounded bg-[#0a0e16] border border-[#68dba9]/60">
                        <span className="text-[9px] text-[#87948b] block">NAME:</span>
                        <span className="text-[#dfe2ee] font-bold">MANPREET SINGH</span>
                      </div>
                      <div className="p-1.5 rounded bg-[#0a0e16] border border-[#68dba9]/60">
                        <span className="text-[9px] text-[#87948b] block">DOB / CLASS:</span>
                        <span className="text-[#dfe2ee] font-bold">14/06/1988 • CAT: LMV-TR</span>
                      </div>
                      <div className="p-1.5 rounded bg-[#0a0e16] border border-[#68dba9]/60">
                        <span className="text-[9px] text-[#87948b] block">
                          PSV BADGE AUTHORIZED:
                        </span>
                        <span className="text-[#68dba9] font-bold">
                          DL-TR-4401 (HEAVY CHAUFFEUR)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between font-mono text-[10px] text-[#87948b] border-t border-[#262a33] pt-2">
                    <span>ISSUE: 18-NOV-2009</span>
                    <span className="text-[#68dba9] font-bold">VALIDITY OK EXP: 18-NOV-2029</span>
                  </div>
                </div>
              </div>

              {/* Verification Metrics Footer */}
              <div className="grid grid-cols-3 gap-3 font-mono text-xs">
                <div className="bg-[#181c24] p-3 rounded-lg border border-[#262a33]">
                  <div className="text-[9px] text-[#87948b]">EDGE TAMPER ANALYSIS</div>
                  <div className="text-sm font-bold text-[#68dba9] mt-0.5">CLEAR</div>
                  <div className="text-[10px] text-[#87948b] mt-1 leading-tight">
                    No digital clone, splicing, or artifacting detected along card perimeters.
                  </div>
                </div>

                <div className="bg-[#181c24] p-3 rounded-lg border border-[#262a33]">
                  <div className="text-[9px] text-[#87948b]">FONT KERNING CHECK</div>
                  <div className="text-sm font-bold text-[#68dba9] mt-0.5">OFFICIAL STD</div>
                  <div className="text-[10px] text-[#87948b] mt-1 leading-tight">
                    Type metrics conform precisely with MoRTH Government Press specification.
                  </div>
                </div>

                <div className="bg-[#181c24] p-3 rounded-lg border border-[#262a33]">
                  <div className="text-[9px] text-[#87948b]">STATE REGISTRY SYNC</div>
                  <div className="text-sm font-bold text-[#68dba9] mt-0.5">DELHI RTO 04</div>
                  <div className="text-[10px] text-[#87948b] mt-1 leading-tight">
                    Real-time Sarathi database matches vehicle classes and endorsement date.
                  </div>
                </div>
              </div>
            </div>

            {/* Biometric Facial Cross-Match Card */}
            <div className="bg-[#0a0e16] rounded-xl p-5 border border-[#262a33] shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#68dba9] text-[20px]">
                    face_5
                  </span>
                  <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    Biometric Facial Cross-Match (Liveness v/s Gov Scan)
                  </h3>
                </div>
                <span className="text-lg font-bold font-mono text-[#68dba9]">
                  CONFIDENCE: 99.4%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Frame A */}
                <div className="bg-[#181c24] p-3 rounded-xl border border-[#262a33] flex flex-col gap-2">
                  <div className="text-[10px] font-mono font-bold text-[#87948b]">
                    FRAME A: TELEMETRIC LIVE SELFIE (GEO-TAGGED NCR)
                  </div>
                  <div className="w-full h-44 rounded-lg bg-[#0a0e16] border border-[#68dba9] p-2 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="w-24 h-24 rounded-full bg-[#25a475]/20 border-2 border-[#68dba9] flex items-center justify-center text-[#68dba9]">
                      <span className="material-symbols-outlined text-5xl">person</span>
                    </div>
                    <span className="absolute bottom-2 left-2 right-2 text-center bg-[#25a475]/90 text-[#00311f] font-mono text-[9px] font-bold py-1 rounded">
                      3D Liveness Confirmed (Blink + Head Turn)
                    </span>
                  </div>
                </div>

                {/* Frame B */}
                <div className="bg-[#181c24] p-3 rounded-xl border border-[#262a33] flex flex-col gap-2">
                  <div className="text-[10px] font-mono font-bold text-[#87948b]">
                    FRAME B: EXTRACTED GOVT CARD PORTRAIT
                  </div>
                  <div className="w-full h-44 rounded-lg bg-[#0a0e16] border border-[#68dba9] p-2 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="w-24 h-24 rounded-full bg-[#0053db]/20 border-2 border-[#b4c5ff] flex items-center justify-center text-[#b4c5ff]">
                      <span className="material-symbols-outlined text-5xl">account_box</span>
                    </div>
                    <span className="absolute bottom-2 left-2 right-2 text-center bg-[#0053db]/90 text-[#dfe2ee] font-mono text-[9px] font-bold py-1 rounded">
                      128 Landmark Points Mapped &amp; Reconciled
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

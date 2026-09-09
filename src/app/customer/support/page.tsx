'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { CustomerLayout } from '@/components/customer-layout';

export default function CustomerSupportPage() {
  const [activeCategory, setActiveCategory] = useState<string>('Billing & Toll Dispute');
  const [selectedItinerary, setSelectedItinerary] = useState<string>('BK-9482');
  const [grievanceText, setGrievanceText] = useState<string>('');
  const [attachments, setAttachments] = useState<string[]>([
    'fastag_sms_1348.png',
    'nhai_invoice_pdf',
  ]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Escrow countdown timer (seconds)
  const [timerSeconds, setTimerSeconds] = useState<number>(522); // 8m 42s initial

  useEffect(() => {
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m < 10 ? '0' : ''}${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSubmitEscalation = () => {
    if (!grievanceText.trim()) {
      showToast('Please detail your grievance narrative before submitting.');
      return;
    }
    showToast(
      `Concierge escalation ticket submitted for #${selectedItinerary}. SLA Response ETA ≤ 90s.`,
    );
    setGrievanceText('');
  };

  const removeAttachment = (fileName: string) => {
    setAttachments((prev) => prev.filter((item) => item !== fileName));
    showToast(`Removed attachment: ${fileName}`);
  };

  const categories = [
    { label: 'Billing & Toll Dispute', icon: 'toll' },
    { label: 'Chauffeur Protocol', icon: 'badge' },
    { label: 'Luggage & Lost Property', icon: 'luggage' },
    { label: 'Vehicle & Air Purifier', icon: 'air' },
    { label: 'Airport Gate Sync', icon: 'flight_takeoff' },
  ];

  return (
    <CustomerLayout activePath="customer-support">
      <div className="flex flex-col w-full gap-6 max-w-[1440px] mx-auto">
        {/* Toast Alert Banner */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#25a475] text-[#00311f] font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-[#68dba9]">
            <span className="material-symbols-outlined text-xl">check_circle</span>
            <span className="text-sm font-['Space_Grotesk']">{toastMessage}</span>
          </div>
        )}

        {/* Ambient Glow Effects */}
        <div className="relative w-full overflow-hidden">
          <div className="absolute -top-32 left-1/4 w-96 h-96 bg-[#68dba9]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-80 right-10 w-80 h-80 bg-[#0053db]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col gap-6">
            {/* Breadcrumbs & Tactical Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#262a33] text-[#dfe2ee] border border-[#3d4a42]">
                  <span className="material-symbols-outlined text-base text-[#68dba9]">
                    security
                  </span>
                  <span className="font-mono text-xs tracking-wider uppercase text-[#68dba9]">
                    SOC NODE // NCR-CENTRAL-01
                  </span>
                </div>
                <span className="text-[#3d4a42] font-mono text-xs">/</span>
                <span className="font-mono text-xs text-[#bccac0] uppercase tracking-wider">
                  Executive Concierge &amp; Arbitration Hub
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#181c24] border border-[#262a33]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#68dba9] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#68dba9]"></span>
                  </span>
                  <span className="font-mono text-xs text-[#dfe2ee]">
                    ARBITRATION ENGINE: ACTIVE
                  </span>
                </div>
                <div className="font-mono text-xs text-[#87948b]">
                  SLA GUARANTEE: <span className="text-[#68dba9] font-semibold">≤ 90s</span>
                </div>
              </div>
            </div>

            {/* KPI Matrix Strip (Bento High-Density Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Metric 1: Concierge Officers */}
              <div className="relative p-5 rounded-xl bg-[#181c24] border border-[#262a33] shadow-md overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#68dba9]/5 rounded-bl-full pointer-events-none" />
                <div className="flex items-start justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#87948b] font-['Space_Grotesk']">
                    Priority Dispatch
                  </span>
                  <span className="material-symbols-outlined text-[#68dba9] text-xl">
                    headset_mic
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-[#dfe2ee] tracking-tight font-['Space_Grotesk']">
                      04
                    </span>
                    <span className="font-mono text-xs text-[#68dba9] font-semibold">
                      Officers Online
                    </span>
                  </div>
                  <p className="text-xs text-[#bccac0] mt-1 leading-relaxed">
                    Delhi Tier-1 Chauffeur Security Desk with guaranteed 90s telemetric response.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-[#262a33] flex items-center justify-between text-xs font-mono text-[#bccac0]">
                  <span>Avg Ack: 38s</span>
                  <span className="text-[#68dba9] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#68dba9] inline-block" />
                    100% On-Duty
                  </span>
                </div>
              </div>

              {/* Metric 2: Open Disputes */}
              <div className="relative p-5 rounded-xl bg-[#181c24] border border-[#262a33] shadow-md flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#87948b] font-['Space_Grotesk']">
                    Under Arbitration
                  </span>
                  <span className="material-symbols-outlined text-[#ffb4ab] text-xl">
                    pending_actions
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-[#dfe2ee] tracking-tight font-['Space_Grotesk']">
                      01
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#93000a] text-[#ffdad6] font-['Space_Grotesk']">
                      In Review
                    </span>
                  </div>
                  <p className="text-xs text-[#bccac0] mt-1">
                    #TK-8821 · NH-48 Express Toll Re-check.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-[#262a33] flex items-center justify-between text-xs font-mono text-[#bccac0]">
                  <span>Escrow Hold: ₹120.00</span>
                  <span className="text-[#4edea3]">Resolving Now</span>
                </div>
              </div>

              {/* Metric 3: Resolution Performance */}
              <div className="relative p-5 rounded-xl bg-[#181c24] border border-[#262a33] shadow-md flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#87948b] font-['Space_Grotesk']">
                    30-Day Resolution
                  </span>
                  <span className="material-symbols-outlined text-[#4edea3] text-xl">task_alt</span>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-[#dfe2ee] tracking-tight font-['Space_Grotesk']">
                      24
                    </span>
                    <span className="font-mono text-xs text-[#4edea3] font-semibold">
                      Cases Closed
                    </span>
                  </div>
                  <p className="text-xs text-[#bccac0] mt-1 leading-relaxed">
                    Zero unresolved discrepancies across 412 luxury itineraries.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-[#262a33] flex items-center justify-between text-xs font-mono text-[#bccac0]">
                  <span>CSAT Index</span>
                  <span className="text-[#68dba9] font-semibold">100.0% Rating</span>
                </div>
              </div>

              {/* Metric 4: Direct Fast Response Channels */}
              <div className="relative p-5 rounded-xl bg-[#262a33] border border-[#3d4a42] shadow-md flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#68dba9] font-['Space_Grotesk']">
                    Priority Comm Rails
                  </span>
                  <span className="material-symbols-outlined text-[#68dba9] text-xl">bolt</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <a
                    href="tel:+911140992400"
                    className="p-2 rounded-lg bg-[#0a0e16] hover:bg-[#1c2028] border border-[#262a33] transition-colors flex items-center gap-2 text-[#dfe2ee]"
                  >
                    <span className="material-symbols-outlined text-[#68dba9] text-lg">call</span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold uppercase truncate font-['Space_Grotesk']">
                        VIP Hotline
                      </span>
                      <span className="font-mono text-[10px] text-[#87948b] truncate">
                        +91 11 4099
                      </span>
                    </div>
                  </a>
                  <button
                    type="button"
                    onClick={() => showToast('Connecting to Encrypted PTT Audio Bridge...')}
                    className="p-2 rounded-lg bg-[#0a0e16] hover:bg-[#1c2028] border border-[#262a33] transition-colors flex items-center gap-2 text-[#dfe2ee] text-left"
                  >
                    <span className="material-symbols-outlined text-[#b4c5ff] text-lg">mic</span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold uppercase truncate font-['Space_Grotesk']">
                        Audio Bridge
                      </span>
                      <span className="font-mono text-[10px] text-[#87948b] truncate">
                        Encrypted PTT
                      </span>
                    </div>
                  </button>
                  <a
                    href="https://wa.me"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[#0a0e16] hover:bg-[#1c2028] border border-[#262a33] transition-colors flex items-center gap-2 text-[#dfe2ee]"
                  >
                    <span className="material-symbols-outlined text-[#4edea3] text-lg">chat</span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold uppercase truncate font-['Space_Grotesk']">
                        WhatsApp VIP
                      </span>
                      <span className="font-mono text-[10px] text-[#87948b] truncate">
                        Concierge Bot
                      </span>
                    </div>
                  </a>
                  <button
                    type="button"
                    onClick={() => showToast('SOS Emergency Desk notified (Immediate Priority)')}
                    className="p-2 rounded-lg bg-[#0a0e16] hover:bg-[#1c2028] border border-[#262a33] transition-colors flex items-center gap-2 text-[#dfe2ee] text-left"
                  >
                    <span className="material-symbols-outlined text-[#ffb4ab] text-lg">
                      e911_emergency
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold uppercase truncate font-['Space_Grotesk']">
                        SOS Triage
                      </span>
                      <span className="font-mono text-[10px] text-[#87948b] truncate">
                        Instant SOC
                      </span>
                    </div>
                  </button>
                </div>
                <div className="mt-2 text-right">
                  <span className="font-mono text-[10px] text-[#87948b] uppercase tracking-wider">
                    AES-256 Telemetry Encryption
                  </span>
                </div>
              </div>
            </div>

            {/* Main Operational Workspace: Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Live Active Ticket & Telemetry Audit (7 Columns) */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                {/* Active Ticket Card Container */}
                <div className="p-6 rounded-xl bg-[#181c24] border border-[#262a33] shadow-xl relative overflow-hidden flex flex-col gap-4">
                  <div className="absolute -top-16 -right-16 w-44 h-44 bg-[#ffb4ab]/5 rounded-full blur-2xl pointer-events-none" />

                  {/* Card Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#262a33] pb-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-[#93000a] text-[#ffdad6] font-mono text-[10px] font-bold uppercase tracking-wider">
                          Escalated to SOC Lead
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#31353e] text-[#68dba9] font-mono text-[10px] uppercase">
                          Priority // Tier-1
                        </span>
                        <span className="font-mono text-xs text-[#87948b]">
                          Created: Today 14:20 IST
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-2">
                        Ticket #TK-8821: Route Toll Discrepancy
                      </h2>
                      <span className="font-mono text-xs text-[#bccac0]">
                        Linked Itinerary: #BK-9482 (IGIA Terminal 3 → Golf Links, New Delhi)
                      </span>
                    </div>

                    {/* Live Auto-Escrow Refund Timer */}
                    <div className="p-3 rounded-lg bg-[#1c2028] border border-[#262a33] flex flex-col items-end">
                      <span className="text-[10px] font-bold uppercase text-[#87948b] font-['Space_Grotesk']">
                        Auto-Refund Escrow Release
                      </span>
                      <div className="flex items-center gap-1.5 text-[#68dba9] text-base font-bold">
                        <span className="material-symbols-outlined text-lg animate-pulse">
                          timer
                        </span>
                        <span className="font-mono">{formatTimer(timerSeconds)}</span>
                      </div>
                      <span className="font-mono text-[10px] text-[#bccac0]">
                        Automatic reversal if unverified
                      </span>
                    </div>
                  </div>

                  {/* Incident Overview Box */}
                  <div className="p-4 rounded-lg bg-[#1c2028] border border-[#262a33] flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#ffb4ab] text-lg">
                          receipt_long
                        </span>
                        <span className="text-sm font-semibold text-[#dfe2ee]">
                          FASTag NH-48 Double Surcharge Query
                        </span>
                      </div>
                      <span className="font-mono text-xl font-bold text-[#68dba9]">₹120.00</span>
                    </div>
                    <p className="text-xs text-[#bccac0] leading-relaxed">
                      Chauffeur Rajiv Verma passed the Kherki Daula RFID toll plaza at 13:48 IST.
                      Two consecutive debits of ₹120 each were logged within 4 seconds on the
                      onboard FASTag ledger. Passenger telematics indicate only one boom-barrier
                      passage.
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-1 font-mono text-xs text-[#87948b] border-t border-[#262a33]/60">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">sensors</span>
                        Toll Gate Sensor ID: NH48-KD-L04
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">directions_car</span>
                        Mercedes E220d (DL 01 AA 9021)
                      </span>
                    </div>
                  </div>

                  {/* Timeline / Telemetry Audit Stepper */}
                  <div className="py-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#87948b] block mb-4 font-['Space_Grotesk']">
                      Telemetric Audit Trail &amp; Verification Pipeline
                    </span>
                    <div className="relative space-y-5 pl-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#31353e]">
                      {/* Step 1: Grievance Ingested */}
                      <div className="relative flex items-start gap-3">
                        <div className="w-4 h-4 rounded-full bg-[#68dba9] flex items-center justify-center -ml-[25px] ring-4 ring-[#181c24]">
                          <span className="material-symbols-outlined text-[#003825] text-[10px] font-bold">
                            done
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-[#dfe2ee]">
                              Grievance Ingested via VIP App
                            </span>
                            <span className="font-mono text-xs text-[#87948b]">14:20:12 IST</span>
                          </div>
                          <p className="text-xs text-[#bccac0] mt-0.5">
                            Passenger flagged duplicated toll entry. Automated dispute ID #TK-8821
                            assigned.
                          </p>
                        </div>
                      </div>

                      {/* Step 2: Sensor Cross-Referencing */}
                      <div className="relative flex items-start gap-3">
                        <div className="w-4 h-4 rounded-full bg-[#68dba9] flex items-center justify-center -ml-[25px] ring-4 ring-[#181c24]">
                          <span className="material-symbols-outlined text-[#003825] text-[10px] font-bold">
                            done
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-[#dfe2ee]">
                              Telematics &amp; IHMCL FASTag Grid Cross-Referenced
                            </span>
                            <span className="font-mono text-xs text-[#87948b]">14:21:40 IST</span>
                          </div>
                          <p className="text-xs text-[#bccac0] mt-0.5">
                            GPS speed matched with toll lane passage at 26 km/h. Bank transaction
                            IDs: TXN_8819283 and TXN_8819284 confirmed duplicate.
                          </p>
                        </div>
                      </div>

                      {/* Step 3: Chauffeur Statement */}
                      <div className="relative flex items-start gap-3">
                        <div className="w-4 h-4 rounded-full bg-[#68dba9] flex items-center justify-center -ml-[25px] ring-4 ring-[#181c24]">
                          <span className="material-symbols-outlined text-[#003825] text-[10px] font-bold">
                            done
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-[#dfe2ee]">
                              Chauffeur Telemetry Statement Appended
                            </span>
                            <span className="font-mono text-xs text-[#87948b]">14:23:05 IST</span>
                          </div>
                          <div className="p-3 rounded-lg bg-[#1c2028] border border-[#262a33] mt-1.5 flex items-center gap-3">
                            <Image
                              alt="Chauffeur Rajiv Verma"
                              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAK-az3O6BksX1X2PAOTUDvgDywfh_hjrxa3yRYMVFbACrbombInG459uW_utcYDS3dZqIPsNO3okGZBMOHU_MgvivMOWYkwqoFp-8xx4Dq3Bpzhd5lbwKwHl1kfgpB7Y7TcRAa_ZGMTtEhcUJKqfO2W1G9acYqQ4Uloius44pZf37uPiqDiBD3a_mk6Sz4bnGsO4d0oTlsQOWApNIOagQMkzsQwNRAwLxn-ekEjX3TjOZgm-lkGYruDg"
                              width={32}
                              height={32}
                              unoptimized
                              className="w-8 h-8 rounded-full object-cover border border-[#3d4a42]"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="font-mono text-xs text-[#dfe2ee] font-semibold block truncate">
                                Rajiv Verma (Badge #CH-880)
                              </span>
                              <span className="text-xs text-[#bccac0] italic">
                                &ldquo;Single barrier raise confirmed at Lane 4. Sensor beeps
                                sounded twice in rapid succession.&rdquo;
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 4: Pending Automated Reversal */}
                      <div className="relative flex items-start gap-3">
                        <div className="w-4 h-4 rounded-full bg-[#4edea3] flex items-center justify-center -ml-[25px] ring-4 ring-[#181c24] animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-[#0a0e16]" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-[#4edea3]">
                              Awaiting Automated Reversal Release
                            </span>
                            <span className="font-mono text-xs text-[#4edea3] font-semibold">
                              T-MINUS 08M
                            </span>
                          </div>
                          <p className="text-xs text-[#bccac0] mt-0.5">
                            Escrow refund authorization queued. ₹120.00 will immediately credit to
                            corporate wallet if NHAI ping confirms overbilling.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Arbitration Actions Strip */}
                  <div className="pt-3 border-t border-[#262a33] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => showToast('Direct chat opened with Senior Concierge Lead')}
                        className="px-4 py-2 rounded-lg bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-bold text-xs flex items-center gap-2 transition-colors font-['Space_Grotesk']"
                      >
                        <span className="material-symbols-outlined text-base">chat</span>
                        <span>Chat with Assigned Lead</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => showToast('Dispute proof PDF generated & downloaded')}
                        className="px-4 py-2 rounded-lg bg-[#1c2028] hover:bg-[#262a33] border border-[#262a33] text-[#dfe2ee] text-xs font-mono transition-colors flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-base">download</span>
                        <span>Export Dispute Proof (PDF)</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => showToast('Claim withdrawal request submitted')}
                      className="px-3 py-1.5 rounded-lg text-[#87948b] hover:text-[#ffb4ab] transition-colors text-xs font-mono flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                      <span>Withdraw Claim</span>
                    </button>
                  </div>
                </div>

                {/* Live Officer Spotlight Card */}
                <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Image
                        alt="Ananya Sen"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDrLkjbw3E_rmwP6PP_HV4-MDf18q-p-qM1kLHf7D1Uo4QRNXDZnrOPC3jsd1YAxw-t0fTcBospRNfoQWAAmOqBiy_Y3N9GLKHZSBgylLN5vjTxTcA0_xB9L1uXUaQDmdQ4w9lK1l31wOE4vauHOMSDNi_dwxIvJgsfTCLyrT9c6w_TK__joyZvLbZVmzOkqu7JGPrIp5uCowC94fV2FdCKXrU1uXW34MVDPvOjLMqyHqScceDPy0sKOg"
                        width={48}
                        height={48}
                        unoptimized
                        className="w-12 h-12 rounded-full object-cover border border-[#3d4a42]"
                      />
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#68dba9] ring-2 ring-[#181c24]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#dfe2ee]">Ananya Sen</span>
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#1c2028] text-[#68dba9] font-['Space_Grotesk']">
                          Senior Concierge Officer
                        </span>
                      </div>
                      <p className="text-xs text-[#bccac0]">
                        Monitoring your active arbitration queue • Direct terminal line ready
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        showToast('Initiating encrypted voice call with Officer Ananya...')
                      }
                      className="p-2 rounded-lg bg-[#1c2028] hover:bg-[#262a33] border border-[#262a33] text-[#dfe2ee] transition-colors"
                      title="Instant Encrypted Voice Call"
                    >
                      <span className="material-symbols-outlined text-xl">phone_in_talk</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => showToast('Direct priority messaging stream active')}
                      className="p-2 rounded-lg bg-[#1c2028] hover:bg-[#262a33] border border-[#262a33] text-[#dfe2ee] transition-colors"
                      title="Direct Priority Messaging"
                    >
                      <span className="material-symbols-outlined text-xl">forum</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Rapid Grievance Filing Console (5 Columns) */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                {/* Rapid Ticket Creation Panel */}
                <div className="p-6 rounded-xl bg-[#181c24] border border-[#262a33] shadow-xl flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
                    <div>
                      <h3 className="text-base font-semibold text-[#dfe2ee] font-['Space_Grotesk']">
                        Rapid Grievance &amp; Concierge Dispatch
                      </h3>
                      <span className="font-mono text-xs text-[#87948b]">
                        Tier-1 priority response within 90 seconds
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-[#68dba9] text-2xl">
                      support_agent
                    </span>
                  </div>

                  {/* Category Selector Tabs */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#87948b] font-['Space_Grotesk']">
                      Incident Category
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {categories.map((cat) => (
                        <button
                          key={cat.label}
                          type="button"
                          onClick={() => setActiveCategory(cat.label)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border ${
                            activeCategory === cat.label
                              ? 'bg-[#68dba9] text-[#003825] border-[#68dba9] font-bold shadow-sm'
                              : 'bg-[#1c2028] text-[#bccac0] hover:text-[#dfe2ee] border-[#262a33]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-base">{cat.icon}</span>
                          <span>{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Linked Trip Selector */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="trip-select"
                      className="text-[10px] font-bold uppercase tracking-wider text-[#87948b] font-['Space_Grotesk']"
                    >
                      Link Completed or Active Itinerary
                    </label>
                    <div className="relative">
                      <select
                        id="trip-select"
                        value={selectedItinerary}
                        onChange={(e) => setSelectedItinerary(e.target.value)}
                        className="w-full bg-[#0a0e16] border border-[#262a33] text-[#dfe2ee] text-xs px-3.5 py-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#68dba9] appearance-none cursor-pointer"
                      >
                        <option value="BK-9482">
                          #BK-9482 — IGIA Terminal 3 to Golf Links (Active Dispute)
                        </option>
                        <option value="BK-9411">
                          #BK-9411 — Vasant Vihar to DLF CyberHub Executive Gate
                        </option>
                        <option value="BK-9390">
                          #BK-9390 — Noida Sec 128 to Aerocity Hospitality District
                        </option>
                        <option value="BK-9310">
                          #BK-9310 — Chanakyapuri Diplomatic Enclave to Taj Mahal Hotel
                        </option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#87948b] pointer-events-none text-lg">
                        expand_more
                      </span>
                    </div>
                  </div>

                  {/* Detailed Grievance Input */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="grievance-text"
                        className="text-[10px] font-bold uppercase tracking-wider text-[#87948b] font-['Space_Grotesk']"
                      >
                        Grievance Narrative &amp; Telemetry Context
                      </label>
                      <span className="font-mono text-[10px] text-[#bccac0]">
                        Live OCR &amp; Log Parsing Enabled
                      </span>
                    </div>
                    <textarea
                      id="grievance-text"
                      rows={4}
                      value={grievanceText}
                      onChange={(e) => setGrievanceText(e.target.value)}
                      placeholder="Detail the discrepancy, route deviation, unverified surcharge, or chauffeur SOP mismatch. Our neural triage engine indexes this into the NCR fleet record immediately..."
                      className="w-full bg-[#0a0e16] border border-[#262a33] text-[#dfe2ee] text-xs p-3.5 rounded-lg placeholder:text-[#87948b] focus:outline-none focus:ring-1 focus:ring-[#68dba9] resize-none"
                    />
                  </div>

                  {/* Attachment & Proof Dropzone */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#87948b] font-['Space_Grotesk']">
                      Telemetry Artifacts (FASTag SMS, Receipts, Dashcam)
                    </label>
                    <div
                      onClick={() => showToast('Artifact file chooser triggered')}
                      className="p-4 rounded-lg bg-[#0a0e16] border border-[#262a33] border-dashed flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#1c2028] transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#1c2028] flex items-center justify-center text-[#68dba9] mb-2 group-hover:scale-105 transition-transform border border-[#262a33]">
                        <span className="material-symbols-outlined text-xl">cloud_upload</span>
                      </div>
                      <span className="text-xs text-[#dfe2ee] font-medium">
                        Click to upload or drag receipts / photo proof
                      </span>
                      <span className="font-mono text-[10px] text-[#87948b] mt-1">
                        PDF, JPG, PNG up to 25MB • Automated Hash Timestamping
                      </span>
                    </div>
                  </div>

                  {/* Telemetry Evidence Previews */}
                  {attachments.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {attachments.map((file) => (
                        <div
                          key={file}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1c2028] border border-[#262a33] text-[#dfe2ee] font-mono text-[10px]"
                        >
                          <span className="material-symbols-outlined text-sm text-[#68dba9]">
                            attach_file
                          </span>
                          <span className="truncate max-w-[120px]">{file}</span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(file)}
                            className="text-[#87948b] hover:text-[#ffb4ab] ml-1 font-bold"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Submit CTA Button */}
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={handleSubmitEscalation}
                      className="w-full py-3 px-4 rounded-lg bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] font-['Space_Grotesk']"
                    >
                      <span className="material-symbols-outlined text-lg">send_time_extension</span>
                      <span>Submit Concierge Escalation</span>
                    </button>
                    <div className="flex items-center justify-between font-mono text-[10px] text-[#87948b] mt-2 px-1">
                      <span>Encrypted Telemetry Rail</span>
                      <span>SLA Dispatch: Instant Triage</span>
                    </div>
                  </div>
                </div>

                {/* Secondary Quick Help Strip */}
                <div className="p-4 rounded-xl bg-[#262a33] border border-[#3d4a42] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#b4c5ff] text-2xl">
                      airplane_ticket
                    </span>
                    <div>
                      <span className="text-xs font-medium text-[#dfe2ee] block leading-tight">
                        Flight Landed Early or Delayed?
                      </span>
                      <span className="text-xs text-[#bccac0]">
                        Chauffeurs auto-adjust pickup windows based on DGCA radar telemetry.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => showToast('IGIA Radar feed synced with flight manifest')}
                    className="px-3 py-1.5 rounded bg-[#0a0e16] hover:bg-[#1c2028] text-[#dfe2ee] font-bold uppercase text-[10px] tracking-wider whitespace-nowrap transition-colors border border-[#262a33] font-['Space_Grotesk']"
                  >
                    Sync Gate
                  </button>
                </div>
              </div>
            </div>

            {/* Knowledge Vault & Executive Self-Service Concierge */}
            <div className="pt-6 space-y-4 border-t border-[#262a33]">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-[10px] uppercase text-[#68dba9] tracking-widest mb-1 font-['Space_Grotesk']">
                    <span className="material-symbols-outlined text-base">library_books</span>
                    Executive Protocol Vault
                  </div>
                  <h2 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    Self-Service Governance &amp; Operating Standards
                  </h2>
                </div>
                <div className="relative w-full sm:w-72">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#87948b] text-base">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search protocol rules, GST codes..."
                    className="w-full bg-[#181c24] border border-[#262a33] text-[#dfe2ee] text-xs pl-9 pr-3.5 py-2 rounded-lg placeholder:text-[#87948b] focus:outline-none focus:ring-1 focus:ring-[#68dba9]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Protocol 1 */}
                <div
                  onClick={() => showToast('Opened SOP: Airport T3 Chauffeur Meeting Protocol')}
                  className="p-5 rounded-xl bg-[#181c24] border border-[#262a33] hover:bg-[#1c2028] transition-colors flex flex-col justify-between group cursor-pointer shadow-sm"
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-[#262a33] border border-[#3d4a42] flex items-center justify-center text-[#68dba9] mb-3 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-xl">flight_takeoff</span>
                    </div>
                    <h4 className="text-sm font-semibold text-[#dfe2ee] group-hover:text-[#68dba9] transition-colors font-['Space_Grotesk']">
                      Airport T3 Chauffeur Meeting Protocol &amp; Gate Tracking
                    </h4>
                    <p className="text-xs text-[#bccac0] mt-2 leading-relaxed">
                      How our operations hub links with IGIA Delhi radar feeds, designated VIP
                      Pillar 4 meeting points, luggage escort assist, and complimentary 45-min gate
                      holds.
                    </p>
                  </div>
                  <div className="mt-4 pt-2 border-t border-[#262a33] flex items-center justify-between font-mono text-xs text-[#68dba9]">
                    <span>Read SOP →</span>
                    <span className="text-[#87948b]">REV 4.2</span>
                  </div>
                </div>

                {/* Protocol 2 */}
                <div
                  onClick={() => showToast('Opened Rules: FASTag & Border Highway Audit')}
                  className="p-5 rounded-xl bg-[#181c24] border border-[#262a33] hover:bg-[#1c2028] transition-colors flex flex-col justify-between group cursor-pointer shadow-sm"
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-[#262a33] border border-[#3d4a42] flex items-center justify-center text-[#b4c5ff] mb-3 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-xl">toll</span>
                    </div>
                    <h4 className="text-sm font-semibold text-[#dfe2ee] group-hover:text-[#b4c5ff] transition-colors font-['Space_Grotesk']">
                      FASTag &amp; Border Highway Automated Audit Rules
                    </h4>
                    <p className="text-xs text-[#bccac0] mt-2 leading-relaxed">
                      Specifications on municipal MCD commercial entry charges, NH-48 / Yamuna
                      Expressway sensor arbitration, and instantaneous zero-friction refund
                      guarantees.
                    </p>
                  </div>
                  <div className="mt-4 pt-2 border-t border-[#262a33] flex items-center justify-between font-mono text-xs text-[#b4c5ff]">
                    <span>Inspect Rules →</span>
                    <span className="text-[#87948b]">IHMCL-COMPLIANT</span>
                  </div>
                </div>

                {/* Protocol 3 */}
                <div
                  onClick={() => showToast('Opened SOP: Lost & Found Escort Delivery')}
                  className="p-5 rounded-xl bg-[#181c24] border border-[#262a33] hover:bg-[#1c2028] transition-colors flex flex-col justify-between group cursor-pointer shadow-sm"
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-[#262a33] border border-[#3d4a42] flex items-center justify-center text-[#4edea3] mb-3 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-xl">verified_user</span>
                    </div>
                    <h4 className="text-sm font-semibold text-[#dfe2ee] group-hover:text-[#4edea3] transition-colors font-['Space_Grotesk']">
                      Lost &amp; Found Chauffeur Escort Delivery Guarantee
                    </h4>
                    <p className="text-xs text-[#bccac0] mt-2 leading-relaxed">
                      Zero-tolerance tamper protocol: Cabin sweep checklist post-ride, immediate
                      vault tagging, and direct return dispatch to your residence or corporate board
                      room within 180 mins.
                    </p>
                  </div>
                  <div className="mt-4 pt-2 border-t border-[#262a33] flex items-center justify-between font-mono text-xs text-[#4edea3]">
                    <span>View Chain of Custody →</span>
                    <span className="text-[#87948b]">100% SECURE</span>
                  </div>
                </div>

                {/* Protocol 4 */}
                <div
                  onClick={() => showToast('Opened SOP: GST Invoicing & Reconciliation')}
                  className="p-5 rounded-xl bg-[#181c24] border border-[#262a33] hover:bg-[#1c2028] transition-colors flex flex-col justify-between group cursor-pointer shadow-sm"
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-[#262a33] border border-[#3d4a42] flex items-center justify-center text-[#85f8c4] mb-3 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-xl">account_balance</span>
                    </div>
                    <h4 className="text-sm font-semibold text-[#dfe2ee] group-hover:text-[#85f8c4] transition-colors font-['Space_Grotesk']">
                      GST Invoicing &amp; Corporate Ledger Reconciliation
                    </h4>
                    <p className="text-xs text-[#bccac0] mt-2 leading-relaxed">
                      Automated ITC-compliant monthly tax invoices, split billing by executive cost
                      center, and direct SAP / Concur ERP data pipeline integration rules.
                    </p>
                  </div>
                  <div className="mt-4 pt-2 border-t border-[#262a33] flex items-center justify-between font-mono text-xs text-[#85f8c4]">
                    <span>Enterprise Guide →</span>
                    <span className="text-[#87948b]">GSTN READY</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust, Security Compliance & SOC Custody Footer */}
            <div className="pt-4 pb-2">
              <div className="p-5 rounded-xl bg-[#0a0e16] border border-[#262a33] flex flex-col md:flex-row items-center justify-between gap-4 text-[#bccac0] shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#181c24] border border-[#262a33] flex items-center justify-center text-[#68dba9]">
                    <span className="material-symbols-outlined text-xl">shield</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[#dfe2ee]">
                      Apna Driver Security Operations Center (Delhi NCR SOC)
                    </span>
                    <span className="text-xs text-[#87948b]">
                      Level 5, Horizon Tower, DLF Cyber City, Sector 24, Gurugram, Haryana 122002
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-[#87948b]">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[#68dba9] text-base">lock</span>
                    ISO/IEC 27001 Certified
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[#68dba9] text-base">
                      verified
                    </span>
                    Govt-Verified Chauffeurs
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[#68dba9] text-base">call</span>
                    24/7 Priority Desk: +91 11 4099 2400
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}

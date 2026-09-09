'use client';

import { useState, useEffect } from 'react';
import { DriverLayout } from '@/components/driver-layout';

export default function DriverIncomingBookingsPage() {
  const [secondsLeft, setSecondsLeft] = useState(24);
  const [accepted, setAccepted] = useState(false);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    if (accepted || declined || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [accepted, declined, secondsLeft]);

  const handleAccept = () => {
    setAccepted(true);
    alert('MISSION ACCEPTED! Opening live navigation cockpit...');
  };

  const handleDecline = () => {
    setDeclined(true);
    alert('Request declined. Radar search resuming...');
  };

  return (
    <DriverLayout activePath="incoming-bookings">
      <div className="flex flex-col w-full px-6 py-6 gap-6">
        {/* HEADER BAR */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-[#181c24] border border-[#262a33]">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-ping" />
              <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-widest font-['Space_Grotesk']">
                RADAR FEED // REAL-TIME DISPATCH ENGINE
              </span>
              <span className="text-[#87948b]">•</span>
              <span className="font-mono text-[10px] text-[#bccac0]">
                CHANNEL 04: VIP PRIVILEGED
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded bg-[#68dba9] text-[#003825] font-bold text-xs uppercase font-['Space_Grotesk']">
                PRIORITY VIP RADAR MATCH
              </span>
              <span className="font-mono text-xs text-[#bccac0]">REQUEST_ID: APNA-DISP-7729</span>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="p-2.5 rounded-lg bg-[#0a0e16] border border-[#262a33] flex items-center gap-2">
              <span className="text-[#68dba9] font-bold">MATCH CONFIDENCE:</span>
              <strong className="text-[#dfe2ee]">99.4% (Precision Tier)</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-[#0a0e16] border border-[#262a33] flex items-center gap-2">
              <span className="text-[#b4c5ff] font-bold">EXCLUSIVE WINDOW:</span>
              <strong className="text-[#dfe2ee]">45s Lockout</strong>
            </div>
          </div>
        </section>

        {/* MAIN ORDER BOX: DISPATCH CARD (LEFT) & SETTLEMENT GUARANTEE (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Chauffeur Exclusive Dispatch Order (7 cols) */}
          <section className="lg:col-span-7 flex flex-col p-6 rounded-xl bg-[#181c24] border border-[#262a33] shadow-xl gap-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk']">
                  CHAUFFEUR EXCLUSIVE DISPATCH
                </span>
                <h2 className="text-2xl font-bold text-[#dfe2ee] mt-0.5 font-['Space_Grotesk']">
                  Immediate Pickup Requested
                </h2>
                <p className="text-xs text-[#bccac0] mt-0.5">
                  Private owner Cayenne Ti-Hybrid deployment. High-security gate pass
                  pre-authorized.
                </p>
              </div>

              {/* Circular Countdown Timer */}
              <div className="w-16 h-16 rounded-full bg-[#0a0e16] border-2 border-[#68dba9] flex flex-col items-center justify-center shrink-0 shadow-lg">
                <span className="text-xl font-bold text-[#68dba9] font-['Space_Grotesk'] leading-none">
                  {secondsLeft}
                </span>
                <span className="text-[9px] font-mono text-[#87948b] uppercase">SECS</span>
              </div>
            </div>

            {/* Passenger Profile */}
            <div className="p-4 rounded-xl bg-[#0a0e16] border border-[#262a33] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#25a475]/20 border border-[#68dba9] flex items-center justify-center font-bold text-[#68dba9] font-['Space_Grotesk'] text-sm">
                  VR
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                      Dr. Vikramaditya Rao
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-[#0053db]/20 text-[#b4c5ff] text-[9px] font-bold uppercase font-['Space_Grotesk']">
                      VIP TIER 1
                    </span>
                  </div>
                  <p className="text-xs text-[#bccac0]">Executive Director, Max Healthcare</p>
                  <div className="flex items-center gap-2 font-mono text-[10px] text-[#87948b] mt-0.5">
                    <span className="text-[#68dba9] font-bold">4.99 ★</span>
                    <span>• 42 platform missions</span>
                    <span>• 0 cancellations</span>
                  </div>
                </div>
              </div>

              <div className="text-right font-mono text-xs">
                <span className="text-[10px] text-[#87948b] block uppercase">CLIENT RATING</span>
                <strong className="text-[#68dba9] text-sm">100% On-Time Boarding</strong>
              </div>
            </div>

            {/* Pickup & Destination Itinerary */}
            <div className="p-4 rounded-xl bg-[#0a0e16] border border-[#262a33] flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <span className="w-3 h-3 rounded-full bg-[#68dba9] mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                      PICKUP LOCATION
                    </span>
                    <span className="font-mono text-[10px] text-[#68dba9] font-bold">
                      2.1 km away • ETA 6 mins
                    </span>
                  </div>
                  <strong className="text-sm text-[#dfe2ee] font-['Space_Grotesk'] block mt-0.5">
                    Golf Links Private Residence, Gate 3
                  </strong>
                  <span className="font-mono text-xs text-[#bccac0]">
                    Bungalow 42-A, Golf Links Outer Ring Road, New Delhi
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 border-t border-[#262a33] pt-3">
                <span className="w-3 h-3 rounded-full bg-[#b4c5ff] mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                      DESTINATION ANCHOR
                    </span>
                    <span className="font-mono text-[10px] text-[#b4c5ff] font-bold">
                      14.8 km total
                    </span>
                  </div>
                  <strong className="text-sm text-[#dfe2ee] font-['Space_Grotesk'] block mt-0.5">
                    Aerocity Worldmark Tower B, Executive Portico
                  </strong>
                  <span className="font-mono text-xs text-[#bccac0]">
                    Northern Access Road, Asset Area 11, New Delhi Airport Zone
                  </span>
                </div>
              </div>
            </div>

            {/* Vehicle & Directives Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-[#0a0e16] border border-[#262a33] flex flex-col gap-1">
                <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                  VEHICLE UNDER CARE
                </span>
                <strong className="text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                  Porsche Cayenne E-Hybrid
                </strong>
                <span className="font-mono text-xs text-[#68dba9]">
                  Client Owned • Tiptronic Auto
                </span>
                <span className="font-mono text-[10px] text-[#87948b]">Reg: DL 01 CX 0098</span>
              </div>

              <div className="p-3 rounded-lg bg-[#0a0e16] border border-[#262a33] flex flex-col gap-1 font-mono text-[10px] text-[#bccac0]">
                <span className="font-bold text-[#68dba9] font-['Space_Grotesk'] uppercase text-[9px]">
                  CHAUFFEUR PROTOCOL DIRECTIVES
                </span>
                <div>• Strict Non-Smoker Chauffeur Mandatory</div>
                <div>• VIP Luggage &amp; Diplomatic Bag Handling</div>
                <div>• Fluent English &amp; Corporate Etiquette</div>
              </div>
            </div>

            {/* Accept / Decline CTA Buttons */}
            {accepted ? (
              <div className="p-4 rounded-xl bg-[#25a475]/20 border border-[#68dba9] text-center font-mono text-xs text-[#68dba9] font-bold">
                MISSION ACCEPTED! REDIRECTING TO LIVE NAV COCKPIT...
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAccept}
                  className="flex-1 py-4 rounded-xl bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-bold text-sm flex items-center justify-center gap-2 shadow-xl font-['Space_Grotesk'] transition-all"
                >
                  <span className="material-symbols-outlined text-xl">check_circle</span>
                  <span>ACCEPT MISSION ({secondsLeft}s)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDecline}
                  className="px-6 py-4 rounded-xl bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] font-bold text-xs font-['Space_Grotesk'] transition-all border border-[#3d4a42]"
                >
                  Decline Request
                </button>
              </div>
            )}
          </section>

          {/* RIGHT: Financial Ledger & Vector Radar (5 cols) */}
          <aside className="lg:col-span-5 flex flex-col gap-4">
            {/* Financial Ledger Settlement Guarantee Card */}
            <div className="p-5 rounded-xl bg-[#181c24] border border-[#262a33] shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                  SETTLEMENT GUARANTEE
                </span>
                <span className="px-2 py-0.5 rounded bg-[#25a475]/20 text-[#68dba9] font-mono text-[9px] font-bold uppercase">
                  INSTANT WALLET
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#87948b] uppercase block font-['Space_Grotesk']">
                  NET CHAUFFEUR GUARANTEED PAYOUT
                </span>
                <div className="text-3xl font-bold text-[#68dba9] font-['Space_Grotesk'] mt-1">
                  ₹868.00
                </div>
                <span className="font-mono text-[10px] text-[#bccac0]">
                  DIRECT TRANSFER Post PIN Verification
                </span>
              </div>

              <div className="space-y-1.5 font-mono text-xs text-[#bccac0] border-t border-[#262a33] pt-3">
                <div className="flex justify-between">
                  <span>Estimated Gross Base Fare (14.8 km)</span>
                  <span className="text-[#dfe2ee]">₹850.00</span>
                </div>
                <div className="flex justify-between text-[#ffb4ab]">
                  <span>Platform Commission (12% VIP Tier Chauffeur)</span>
                  <span>-₹102.00</span>
                </div>
                <div className="flex justify-between text-[#68dba9]">
                  <span>Aerocity Monsoon Corridor Surcharge (+1.3x)</span>
                  <span>+₹120.00</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0a0e16] border border-[#262a33] font-mono text-[10px] text-[#68dba9] flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">verified</span>
                <span>
                  APNA Driver Reserve Guarantee: Fare credited directly to HDFC Chauffeur Ledger
                  upon customer 4-digit drop PIN verification. No escrow hold.
                </span>
              </div>
            </div>

            {/* Corridor Vector Radar */}
            <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col gap-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                  CORRIDOR VECTOR RADAR
                </span>
                <span className="px-2 py-0.5 rounded bg-[#25a475]/20 text-[#68dba9] font-mono text-[9px] font-bold uppercase">
                  CLEAR FLOW
                </span>
              </div>

              <strong className="text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                NH-48 &amp; Sardar Patel Marg
              </strong>

              <div className="relative w-full h-32 rounded-lg overflow-hidden bg-[#0a0e16] border border-[#262a33] flex items-center justify-center p-2">
                <div className="text-center font-mono text-[10px] text-[#68dba9]">
                  <div>Driver Vector: 082° ENE</div>
                  <div className="text-xs font-bold text-[#dfe2ee] mt-1 font-['Space_Grotesk']">
                    CORRIDOR FLOW: 48 km/h
                  </div>
                  <div className="text-[#87948b] mt-1">
                    Fastest Ingress: Via Subramaniam Bharti Marg (6 Mins)
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono text-[9px] text-[#bccac0]">
                <div className="p-2 rounded bg-[#0a0e16] border border-[#262a33] text-center">
                  <span className="text-[#87948b] block">TOLL PLAZA</span>
                  <strong className="text-[#68dba9]">0m Delay</strong>
                </div>

                <div className="p-2 rounded bg-[#0a0e16] border border-[#262a33] text-center">
                  <span className="text-[#87948b] block">WEATHER</span>
                  <strong className="text-[#dfe2ee]">Monsoon Drizzle</strong>
                </div>

                <div className="p-2 rounded bg-[#0a0e16] border border-[#262a33] text-center">
                  <span className="text-[#87948b] block">AEROCITY INGRESS</span>
                  <strong className="text-[#68dba9]">Gate 2 Open</strong>
                </div>
              </div>
            </div>

            {/* Shift Stats Footer */}
            <div className="grid grid-cols-4 gap-2 font-mono text-[9px]">
              <div className="p-2 rounded bg-[#181c24] border border-[#262a33] text-center">
                <span className="text-[#87948b] block uppercase">SHIFT NET</span>
                <strong className="text-[#dfe2ee] text-xs font-['Space_Grotesk']">₹4,920</strong>
              </div>
              <div className="p-2 rounded bg-[#181c24] border border-[#262a33] text-center">
                <span className="text-[#87948b] block uppercase">ACCEPTANCE</span>
                <strong className="text-[#68dba9] text-xs font-['Space_Grotesk']">98.2%</strong>
              </div>
              <div className="p-2 rounded bg-[#181c24] border border-[#262a33] text-center">
                <span className="text-[#87948b] block uppercase">PROXIMITY</span>
                <strong className="text-[#dfe2ee] text-xs font-['Space_Grotesk']">2.1 km</strong>
              </div>
              <div className="p-2 rounded bg-[#181c24] border border-[#262a33] text-center">
                <span className="text-[#87948b] block uppercase">FLEET RANK</span>
                <strong className="text-[#4edea3] text-xs font-['Space_Grotesk']">Elite VIP</strong>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </DriverLayout>
  );
}

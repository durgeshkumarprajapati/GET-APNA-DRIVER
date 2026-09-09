'use client';

import { useState, useEffect } from 'react';
import { CustomerLayout } from '@/components/customer-layout';

export default function CustomerActiveTrackingPage() {
  const [activeMapTab, setActiveMapTab] = useState<'tracker' | 'corridor' | 'traffic'>('tracker');
  const [telematicsShared, setTelematicsShared] = useState(false);
  const [countdown, setCountdown] = useState(161); // 2:41 timer
  const [sosArmed, setSosArmed] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <CustomerLayout>
      <div className="flex flex-col w-full gap-6">
        {/* HEADER STATUS STRIP */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-[#181c24] border border-[#262a33]">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#262a33] text-[#68dba9] font-bold">
                REF #BK-9482
              </span>
              <span className="text-[10px] font-bold uppercase text-[#b4c5ff] tracking-wider px-2 py-0.5 rounded bg-[#0053db]/20 border border-[#0053db]/40 font-['Space_Grotesk']">
                TIER-1 ESCORTED CHAUFFEUR
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#68dba9] animate-ping" />
              <h1 className="text-2xl sm:text-3xl font-bold text-[#68dba9] tracking-tight font-['Space_Grotesk'] uppercase">
                DRIVER ARRIVING IN 4 MINS
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 p-3 rounded-lg bg-[#0a0e16] border border-[#262a33] font-mono text-xs text-[#bccac0]">
            <div className="flex items-center gap-2 text-[#dfe2ee]">
              <span className="w-2 h-2 rounded-full bg-[#68dba9]" />
              <span>Vasant Vihar C-4...</span>
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
              <span>IGI Airport T3 VIP Ter...</span>
            </div>
            <span className="text-[#87948b]">• 9.4 km (22m)</span>
            <div className="flex items-center gap-2 border-l border-[#262a33] pl-3">
              <span className="text-[#68dba9] font-bold">CAN-BUS SYNCED</span>
              <span>• 18ms LATENCY</span>
              <span className="text-[#dfe2ee] font-bold">38 KM/H</span>
            </div>
          </div>
        </section>

        {/* MAIN HUD CONTENT: RADAR MAP (LEFT) & CHAUFFEUR STREAM (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: MAP CANVAS & TELEMETRY GAUGES (7 Cols) */}
          <section className="lg:col-span-7 flex flex-col gap-4">
            {/* Interactive Navigation Map Container */}
            <div className="relative w-full h-[520px] rounded-2xl overflow-hidden bg-[#0a0e16] border border-[#262a33] shadow-2xl flex flex-col justify-between p-4">
              {/* Map Canvas Background Grid */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
                <path
                  d="M0,130 H1000 M0,260 H1000 M0,390 H1000"
                  stroke="#31353e"
                  strokeDasharray="4 8"
                />
                <path
                  d="M200,0 V600 M400,0 V600 M600,0 V600"
                  stroke="#31353e"
                  strokeDasharray="4 8"
                />
                {/* Route Path Polyline */}
                <path
                  d="M 120 420 Q 240 380, 360 280 T 580 160"
                  fill="none"
                  stroke="#68dba9"
                  strokeWidth="4"
                  strokeDasharray="8 4"
                  className="animate-pulse"
                />
              </svg>

              {/* Top Controls Bar */}
              <div className="relative z-10 flex items-center justify-between bg-[#181c24]/90 backdrop-blur-md p-2 rounded-xl border border-[#262a33]">
                <div className="flex items-center gap-1 bg-[#0a0e16] p-1 rounded-lg border border-[#262a33]">
                  <button
                    type="button"
                    onClick={() => setActiveMapTab('tracker')}
                    className={`px-3 py-1 rounded text-xs font-bold font-['Space_Grotesk'] uppercase transition-all ${
                      activeMapTab === 'tracker'
                        ? 'bg-[#25a475] text-[#00311f]'
                        : 'text-[#bccac0] hover:text-[#dfe2ee]'
                    }`}
                  >
                    NAV TRACKER
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMapTab('corridor')}
                    className={`px-3 py-1 rounded text-xs font-bold font-['Space_Grotesk'] uppercase transition-all ${
                      activeMapTab === 'corridor'
                        ? 'bg-[#25a475] text-[#00311f]'
                        : 'text-[#bccac0] hover:text-[#dfe2ee]'
                    }`}
                  >
                    GREEN CORRIDOR
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMapTab('traffic')}
                    className={`px-3 py-1 rounded text-xs font-bold font-['Space_Grotesk'] uppercase transition-all ${
                      activeMapTab === 'traffic'
                        ? 'bg-[#25a475] text-[#00311f]'
                        : 'text-[#bccac0] hover:text-[#dfe2ee]'
                    }`}
                  >
                    TRAFFIC HUD
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    title="Center Map"
                    className="p-1.5 rounded-lg bg-[#262a33] text-[#dfe2ee] hover:bg-[#31353e]"
                  >
                    <span className="material-symbols-outlined text-base">my_location</span>
                  </button>
                  <button
                    type="button"
                    title="Compass Mode"
                    className="p-1.5 rounded-lg bg-[#262a33] text-[#dfe2ee] hover:bg-[#31353e]"
                  >
                    <span className="material-symbols-outlined text-base">explore</span>
                  </button>
                </div>
              </div>

              {/* Waypoint Overlay Callouts */}
              <div className="absolute left-[20%] top-[72%] z-20 flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-[#68dba9] shadow-[0_0_12px_#68dba9] ring-4 ring-[#68dba9]/20" />
                <span className="mt-1 bg-[#0a0e16]/90 px-2 py-0.5 rounded text-[9px] font-mono text-[#bccac0] border border-[#262a33]">
                  VASANT VIHAR D-BLOCK
                </span>
              </div>

              <div className="absolute left-[45%] top-[45%] z-30 flex flex-col items-center">
                <div className="relative">
                  <span className="absolute w-8 h-8 rounded-full bg-[#68dba9]/30 animate-ping -translate-x-1/2 -translate-y-1/2" />
                  <div className="w-7 h-7 rounded-full bg-[#25a475] text-[#00311f] flex items-center justify-center font-bold shadow-xl border-2 border-[#68dba9]">
                    <span className="material-symbols-outlined text-sm">directions_car</span>
                  </div>
                </div>
                <div className="mt-1 bg-[#181c24]/90 px-2.5 py-1 rounded shadow-lg text-center border border-[#68dba9]">
                  <span className="text-[10px] font-bold text-[#68dba9] block uppercase font-['Space_Grotesk']">
                    Rajesh Kumar (Chauffeur)
                  </span>
                  <span className="font-mono text-[9px] text-[#dfe2ee]">RTR Marg Underpass</span>
                </div>
              </div>

              <div className="absolute left-[75%] top-[25%] z-20 flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-[#b4c5ff] shadow-[0_0_12px_#b4c5ff] ring-4 ring-[#b4c5ff]/20" />
                <span className="mt-1 bg-[#0a0e16]/90 px-2 py-0.5 rounded text-[9px] font-mono text-[#bccac0] border border-[#262a33]">
                  IGI TERMINAL 3 VIP GATE
                </span>
              </div>

              {/* Status Banner */}
              <div className="relative z-10 self-center bg-[#0a0e16]/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-[#262a33] text-center">
                <span className="font-mono text-xs text-[#dfe2ee]">
                  <span className="w-2 h-2 rounded-full bg-[#68dba9] inline-block mr-2 animate-ping" />
                  Chauffeur en route via RTR Marg Flyover • No congestions reported
                </span>
              </div>

              {/* Live Telemetry Gauges Strip */}
              <div className="relative z-10 grid grid-cols-3 gap-3 bg-[#181c24]/95 backdrop-blur-xl p-3.5 rounded-xl border border-[#262a33]">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk']">
                    CRUISE VELOCITY
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                      38
                    </span>
                    <span className="font-mono text-[10px] text-[#bccac0]">km/h</span>
                  </div>
                  <span className="font-mono text-[9px] text-[#87948b] mt-0.5">
                    Speed Limit: 50 km/h
                  </span>
                </div>

                <div className="flex flex-col border-x border-[#262a33] px-3">
                  <span className="text-[9px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk']">
                    CORRIDOR STATUS
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-[#68dba9] text-sm">
                      check_circle
                    </span>
                    <span className="text-sm font-bold text-[#68dba9] uppercase font-['Space_Grotesk']">
                      OPTIMAL
                    </span>
                  </div>
                  <span className="font-mono text-[9px] text-[#bccac0] mt-0.5">
                    Smooth Flow • 0 Slowdowns
                  </span>
                </div>

                <div className="flex flex-col pl-3">
                  <span className="text-[9px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk']">
                    ETA ACCURACY
                  </span>
                  <span className="text-xl font-bold text-[#dfe2ee] mt-0.5 font-['Space_Grotesk']">
                    99.2%
                  </span>
                  <span className="font-mono text-[9px] text-[#bccac0] mt-0.5">
                    Real-Time Vector Sync
                  </span>
                </div>
              </div>
            </div>

            {/* CTA Buttons below Map */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setTelematicsShared(true);
                  alert('Telematics tracking link copied to clipboard & sent to trusted contacts!');
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all font-['Space_Grotesk']"
              >
                <span className="material-symbols-outlined text-base">share</span>
                <span>{telematicsShared ? 'TELEMATICS SHARED ✓' : 'SHARE TELEMATICS'}</span>
              </button>
              <button
                type="button"
                onClick={() => alert('Opening direct secure comms channel with chauffeur...')}
                className="p-3 rounded-xl bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] border border-[#3d4a42]"
              >
                <span className="material-symbols-outlined text-lg">chat</span>
              </button>
            </div>

            {/* Sub Cards Bar */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-[#181c24] border border-[#262a33]">
                <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                  TARGET HANDOVER
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="material-symbols-outlined text-[#68dba9] text-base">
                    schedule
                  </span>
                  <span className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    10:28 AM
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#181c24] border border-[#262a33]">
                <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                  AIRPORT FLIGHT SYNC
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="material-symbols-outlined text-[#b4c5ff] text-base">flight</span>
                  <span className="text-xs font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    AI-102 (On Schedule)
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#181c24] border border-[#262a33]">
                <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                  CHAUFFEUR BREATHALYZER
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="material-symbols-outlined text-[#68dba9] text-base">
                    verified_user
                  </span>
                  <span className="text-xs font-bold text-[#68dba9] font-['Space_Grotesk']">
                    0.00% (Passed 09:40)
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT: CHAUFFEUR PROFILE & MISSION STREAM (5 Cols) */}
          <aside className="lg:col-span-5 flex flex-col gap-4">
            {/* Driver Dossier Card */}
            <div className="p-5 rounded-xl bg-[#181c24] border border-[#262a33] shadow-sm flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-xl bg-[#25a475]/20 border-2 border-[#68dba9] flex items-center justify-center text-xl font-bold text-[#68dba9]">
                    RK
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#68dba9] text-[#003825] rounded-full flex items-center justify-center shadow">
                    <span className="material-symbols-outlined text-[12px]">check</span>
                  </span>
                </div>

                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-[#dfe2ee] font-['Space_Grotesk']">
                      Rajesh Kumar
                    </h3>
                    <div className="flex items-center gap-1 font-mono text-xs text-amber-400">
                      <span className="material-symbols-outlined text-xs">star</span>
                      <span className="font-bold">4.98</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#0053db]/20 text-[#b4c5ff] uppercase font-['Space_Grotesk']">
                      VIP PILOT
                    </span>
                    <span className="font-mono text-[10px] text-[#bccac0]">
                      1,420 Completed Missions
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-[#68dba9] mt-1 font-bold">
                    DELHI POLICE SPECIAL CELL VERIFIED
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0a0e16] border border-[#262a33] flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[#dfe2ee]">
                  <span className="material-symbols-outlined text-[#68dba9] text-base">
                    directions_car
                  </span>
                  <div>
                    <span className="font-bold block font-['Space_Grotesk']">
                      BMW 530d M-Sport (Sedan)
                    </span>
                    <span className="font-mono text-[10px] text-[#87948b]">
                      Client Vehicle Designation
                    </span>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-[#dfe2ee] px-2 py-1 bg-[#262a33] rounded">
                  DL-01-AB-1290
                </span>
              </div>

              {/* Secure Handover PIN Display */}
              <div className="p-4 rounded-xl bg-[#0a0e16] border border-[#262a33] text-center flex flex-col gap-1">
                <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk']">
                  SECURE HANDOVER PIN
                </span>
                <div className="flex items-center justify-center gap-2 my-1">
                  {'7842'.split('').map((num, i) => (
                    <span
                      key={i}
                      className="w-10 h-12 rounded-lg bg-[#25a475]/20 border border-[#68dba9] text-[#68dba9] font-bold text-2xl flex items-center justify-center font-['Space_Grotesk'] shadow-inner"
                    >
                      {num}
                    </span>
                  ))}
                </div>
                <p className="font-mono text-[9px] text-[#bccac0]">
                  Relay verbally upon chauffeur walkaround inspection
                </p>
              </div>

              {/* Mission Progress Stream */}
              <div className="flex flex-col gap-3 pt-2">
                <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk']">
                  MISSION PROGRESS STREAM
                </span>

                <div className="relative pl-6 space-y-4 text-xs border-l-2 border-[#262a33]">
                  {/* Step 1 */}
                  <div className="relative">
                    <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-[#25a475] text-[#00311f] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[10px]">check</span>
                    </span>
                    <div className="flex items-center justify-between">
                      <strong className="text-[#dfe2ee] font-['Space_Grotesk']">
                        Booking Logged &amp; Authenticated
                      </strong>
                      <span className="font-mono text-[10px] text-[#87948b]">10:15 AM</span>
                    </div>
                    <p className="text-[11px] text-[#bccac0]">
                      Vasant Vihar dispatch clearance validated
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="relative">
                    <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-[#25a475] text-[#00311f] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[10px]">check</span>
                    </span>
                    <div className="flex items-center justify-between">
                      <strong className="text-[#dfe2ee] font-['Space_Grotesk']">
                        Chauffeur Assigned
                      </strong>
                      <span className="font-mono text-[10px] text-[#87948b]">10:16 AM</span>
                    </div>
                    <p className="text-[11px] text-[#bccac0]">
                      Rajesh Kumar locked via proximity hub
                    </p>
                  </div>

                  {/* Step 3 (Active) */}
                  <div className="relative bg-[#25a475]/10 p-2.5 rounded-lg border border-[#25a475]/30">
                    <span className="absolute -left-[31px] top-2.5 w-4 h-4 rounded-full bg-[#68dba9] text-[#003825] flex items-center justify-center animate-ping" />
                    <div className="flex items-center justify-between">
                      <strong className="text-[#68dba9] font-['Space_Grotesk']">
                        Chauffeur Arriving
                      </strong>
                      <span className="font-mono text-[10px] text-[#68dba9]">10:24 AM (4m)</span>
                    </div>
                    <p className="text-[11px] text-[#dfe2ee]">
                      Vehicle positioning: RTR Marg underpass
                    </p>
                  </div>

                  {/* Step 4 */}
                  <div className="relative opacity-60">
                    <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-[#262a33] text-[#87948b] flex items-center justify-center text-[9px] font-mono">
                      4
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-[#dfe2ee] font-['Space_Grotesk']">
                        Pre-Flight 360° Walkaround &amp; Odometer Sync
                      </span>
                      <span className="font-mono text-[10px] text-[#87948b]">Stage 4</span>
                    </div>
                    <p className="text-[11px] text-[#bccac0]">
                      Digital scratch scan &amp; fuel-gauge telemetry capture
                    </p>
                  </div>

                  {/* Step 5 */}
                  <div className="relative opacity-60">
                    <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-[#262a33] text-[#87948b] flex items-center justify-center text-[9px] font-mono">
                      5
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-[#dfe2ee] font-['Space_Grotesk']">
                        VIP Transit: IGI Airport Terminal 3
                      </span>
                      <span className="font-mono text-[10px] text-[#87948b]">Stage 5</span>
                    </div>
                    <p className="text-[11px] text-[#bccac0]">
                      Real-time CAN-BUS speed governance activated
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Armed Red SOS Button */}
            <div className="p-4 rounded-xl bg-[#93000a]/20 border border-[#93000a]/50 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setSosArmed(!sosArmed);
                  alert(
                    sosArmed
                      ? 'SOS Standby Disarmed'
                      : 'EMERGENCY ARMED SOS ACTIVATED! Delhi Police & Armed SOC Notified.',
                  );
                }}
                className="w-full py-4 rounded-xl bg-[#93000a] hover:bg-[#b3000f] text-[#ffdad6] font-bold text-sm flex items-center justify-center gap-3 shadow-lg font-['Space_Grotesk'] transition-all"
              >
                <span className="material-symbols-outlined text-xl">emergency</span>
                <span>{sosArmed ? 'SOS ACTIVE - CLICK TO CANCEL' : 'EMERGENCY ARMED SOS'}</span>
                <span className="px-2 py-0.5 rounded bg-[#690005] text-[10px]">
                  POLICE + ESCORT
                </span>
              </button>

              <div className="flex items-center justify-between font-mono text-[11px] text-[#ffb4ab]">
                <button
                  type="button"
                  onClick={() => alert('Mission abort requested.')}
                  className="hover:underline text-[#ffb4ab]"
                >
                  Abort Mission
                </button>
                <span>Free Cancel Grace: {formatTimer(countdown)}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </CustomerLayout>
  );
}

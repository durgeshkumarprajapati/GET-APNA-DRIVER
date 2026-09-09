'use client';

import { useState } from 'react';
import { DriverLayout } from '@/components/driver-layout';

export default function DriverActiveMissionPage() {
  const [tripCompleted, setTripCompleted] = useState(false);

  const handleCompleteTrip = () => {
    setTripCompleted(true);
    alert('Trip #BK-9482 marked COMPLETED! ₹868.00 credited directly to your IMPS wallet balance.');
  };

  return (
    <DriverLayout activePath="active-mission-navigation">
      <div className="flex flex-col w-full px-6 py-6 gap-6">
        {/* MISSION STATUS BAR */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-[#181c24] border border-[#262a33]">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#25a475] text-[#00311f] font-mono text-[10px] font-bold">
                EN ROUTE
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                MISSION #BK-9482 IN PROGRESS
              </h1>
              <span className="text-xs text-[#87948b]">•</span>
              <span className="text-[10px] font-bold text-[#4edea3] uppercase tracking-wider font-['Space_Grotesk']">
                TIER-1 VIP ESCORT
              </span>
            </div>
            <p className="font-mono text-xs text-[#bccac0]">
              Protocols Enforced: High-Discretion • CAN-BUS Audit Active
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#0a0e16] px-3 py-1.5 rounded-lg border border-[#262a33]">
              <span className="material-symbols-outlined text-[#68dba9] text-base">lock</span>
              <span className="font-mono text-xs text-[#dfe2ee]">CLIENT ENCRYPTED VOIP</span>
              <span className="font-mono text-xs text-[#68dba9] font-bold">00:04:12</span>
            </div>

            <button
              type="button"
              onClick={() =>
                alert('Escalating crisis protocol to Security Operations Center (SOC)...')
              }
              className="px-4 py-2 rounded-lg bg-[#93000a] hover:bg-[#b3000f] text-[#ffdad6] font-bold text-xs font-['Space_Grotesk'] shadow transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">emergency</span>
              <span>CRISIS SOC DISPATCH</span>
            </button>
          </div>
        </section>

        {/* 6-STAGE MISSION PROCESS CHECKLIST */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-xl bg-[#25a475]/10 border border-[#25a475]/40 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-[#68dba9] font-['Space_Grotesk']">
                1. BOOKING ACCEPTED
              </span>
              <span className="material-symbols-outlined text-[#68dba9] text-sm">check_circle</span>
            </div>
            <span className="font-mono text-xs text-[#dfe2ee]">10:15 AM • LOGGED</span>
          </div>

          <div className="p-3 rounded-xl bg-[#25a475]/10 border border-[#25a475]/40 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-[#68dba9] font-['Space_Grotesk']">
                2. ARRIVED PICKUP
              </span>
              <span className="material-symbols-outlined text-[#68dba9] text-sm">check_circle</span>
            </div>
            <span className="font-mono text-xs text-[#dfe2ee]">10:24 AM • GOLFLINKS</span>
          </div>

          <div className="p-3 rounded-xl bg-[#25a475]/10 border border-[#25a475]/40 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-[#68dba9] font-['Space_Grotesk']">
                3. 360° WALKAROUND
              </span>
              <span className="material-symbols-outlined text-[#68dba9] text-sm">photo_camera</span>
            </div>
            <span className="font-mono text-xs text-[#dfe2ee]">10:28 AM • 4 PICS</span>
          </div>

          <div className="p-3 rounded-xl bg-[#25a475]/10 border border-[#25a475]/40 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-[#68dba9] font-['Space_Grotesk']">
                4. PIN VERIFIED
              </span>
              <span className="material-symbols-outlined text-[#68dba9] text-sm">
                verified_user
              </span>
            </div>
            <span className="font-mono text-xs text-[#dfe2ee]">OTP [7842] AUTH</span>
          </div>

          <div className="p-3 rounded-xl bg-[#25a475] text-[#00311f] font-bold flex flex-col gap-1 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase font-['Space_Grotesk']">
                5. EN ROUTE ACTIVE
              </span>
              <span className="w-2 h-2 rounded-full bg-[#00311f] animate-ping" />
            </div>
            <span className="font-mono text-xs">AEROCITY WORLDMARK</span>
          </div>

          <div className="p-3 rounded-xl bg-[#1c2028] border border-[#262a33] opacity-60 flex flex-col gap-1">
            <div className="flex items-center justify-between text-[#87948b]">
              <span className="text-[9px] font-bold uppercase font-['Space_Grotesk']">
                6. DEBARK &amp; SETTL
              </span>
              <span className="material-symbols-outlined text-sm">hourglass_empty</span>
            </div>
            <span className="font-mono text-xs text-[#87948b]">STANDBY</span>
          </div>
        </div>

        {/* MAIN HUD: NAVIGATION (LEFT) & DOSSIER + TELEMETRICS (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: NAVIGATION MANEUVER BANNER & MAP VIEWPORT (7 cols) */}
          <section className="lg:col-span-7 flex flex-col gap-4">
            {/* Maneuver Banner */}
            <div className="p-4 rounded-xl bg-[#25a475] text-[#00311f] flex items-center gap-4 shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-[#00311f] text-[#68dba9] flex items-center justify-center font-bold shrink-0">
                <span className="material-symbols-outlined text-2xl">turn_right</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider font-['Space_Grotesk']">
                  NEXT MANEUVER IN 350 METERS • RTR FLYOVER CORRIDOR
                </div>
                <h2 className="text-lg font-bold truncate font-['Space_Grotesk']">
                  Take the ramp onto Rao Tula Ram Marg Flyover
                </h2>
                <p className="text-xs opacity-90">
                  Keep right past Signal 04. Follow green-wave speed profile (45-48 km/h).
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  title="Audio Instructions"
                  className="p-2 rounded-lg bg-[#00311f]/30 hover:bg-[#00311f]/50 text-[#68dba9]"
                >
                  <span className="material-symbols-outlined text-lg">volume_up</span>
                </button>
                <button
                  type="button"
                  title="Recalculate Route"
                  className="p-2 rounded-lg bg-[#00311f]/30 hover:bg-[#00311f]/50 text-[#68dba9]"
                >
                  <span className="material-symbols-outlined text-lg">sync</span>
                </button>
              </div>
            </div>

            {/* Navigation Map Canvas */}
            <div className="relative w-full h-[420px] rounded-2xl overflow-hidden bg-[#0a0e16] border border-[#262a33] shadow-2xl flex flex-col justify-between p-4">
              {/* Map Canvas Background Grid */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                <path
                  d="M0,100 H1000 M0,200 H1000 M0,300 H1000"
                  stroke="#31353e"
                  strokeDasharray="4 8"
                />
                <path
                  d="M200,0 V500 M400,0 V500 M600,0 V500"
                  stroke="#31353e"
                  strokeDasharray="4 8"
                />
                <path
                  d="M 100 350 Q 250 220, 500 150"
                  fill="none"
                  stroke="#68dba9"
                  strokeWidth="5"
                  className="animate-pulse"
                />
              </svg>

              {/* Map Header Overlay Badges */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2 bg-[#181c24]/90 backdrop-blur-md px-3 py-1 rounded-lg border border-[#262a33] font-mono text-xs">
                  <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-ping" />
                  <span className="text-[#68dba9] font-bold">GREEN WAVE LOCK</span>
                  <span className="text-[#87948b]">• NEXT 3 SIGNALS SYNCHRONIZED</span>
                  <span className="text-[#dfe2ee] font-bold">+42s MARGIN</span>
                </div>

                <div className="bg-[#181c24]/90 backdrop-blur-md px-3 py-1 rounded-lg border border-[#262a33] font-mono text-xs text-[#bccac0]">
                  BEARING <strong className="text-[#dfe2ee]">214° SSW</strong>
                </div>
              </div>

              {/* Car Position Marker */}
              <div className="absolute left-[48%] top-[38%] z-30 flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-[#25a475] text-[#00311f] flex items-center justify-center font-bold shadow-2xl border-2 border-[#68dba9]">
                  <span className="material-symbols-outlined text-lg">navigation</span>
                </div>
                <span className="mt-1 bg-[#181c24]/90 px-2 py-0.5 rounded text-[9px] font-mono text-[#68dba9] border border-[#68dba9] font-bold">
                  BMW 530d • ACTIVE PING
                </span>
              </div>

              {/* Telemetry Bar Overlay at Bottom of Map */}
              <div className="relative z-10 grid grid-cols-4 gap-2 bg-[#181c24]/95 backdrop-blur-xl p-3 rounded-xl border border-[#262a33] font-mono text-xs">
                <div>
                  <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] block">
                    VELOCITY
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                      44
                    </span>
                    <span className="text-[10px] text-[#bccac0]">KM/H</span>
                  </div>
                </div>

                <div className="border-l border-[#262a33] pl-2">
                  <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] block">
                    ETA
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-bold text-[#68dba9] font-['Space_Grotesk']">
                      14
                    </span>
                    <span className="text-[10px] text-[#bccac0]">MINS</span>
                  </div>
                </div>

                <div className="border-l border-[#262a33] pl-2">
                  <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] block">
                    DISTANCE
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                      6.8
                    </span>
                    <span className="text-[10px] text-[#bccac0]">KM</span>
                  </div>
                </div>

                <div className="border-l border-[#262a33] pl-2">
                  <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] block">
                    ROUTE DENSITY
                  </span>
                  <div className="text-xs font-bold text-[#68dba9] mt-1 font-['Space_Grotesk'] uppercase">
                    OPTIMAL
                  </div>
                </div>
              </div>
            </div>

            {/* Route Bar */}
            <div className="p-3 rounded-xl bg-[#181c24] border border-[#262a33] flex items-center justify-between text-xs">
              <div className="flex items-center gap-3 font-mono">
                <span className="text-[#87948b]">ORIGIN:</span>
                <strong className="text-[#dfe2ee]">Vasant Vihar Embassy Enclave...</strong>
                <span className="material-symbols-outlined text-[#68dba9] text-base">east</span>
                <span className="text-[#87948b]">TERMINAL DESTINATION:</span>
                <strong className="text-[#dfe2ee]">Worldmark 1, Aerocity Hospita...</strong>
              </div>
              <button
                type="button"
                onClick={() => alert('Route turn-by-turn details preview...')}
                className="px-3 py-1 rounded bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] font-mono text-[10px]"
              >
                Route Details
              </button>
            </div>
          </section>

          {/* RIGHT: PASSENGER DOSSIER, FLEET TELEMETRICS & SETTLEMENT DESK (5 cols) */}
          <aside className="lg:col-span-5 flex flex-col gap-4">
            {/* PASSENGER DOSSIER */}
            <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col gap-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                  PASSENGER DOSSIER
                </span>
                <span className="px-2 py-0.5 rounded bg-[#25a475]/20 text-[#68dba9] font-mono text-[9px] font-bold uppercase">
                  VERIFIED VIP (BOARD LEVEL)
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#25a475]/20 border border-[#68dba9] flex items-center justify-center font-bold text-[#68dba9] font-['Space_Grotesk'] text-sm">
                  VR
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                    Dr. Vikramaditya Rao
                  </h3>
                  <p className="text-xs text-[#bccac0]">Managing Partner, Apex Capital India</p>
                  <span className="font-mono text-[10px] text-[#68dba9]">
                    4.99 ★ (184 VIP Missions)
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0a0e16] border border-[#262a33] space-y-1 font-mono text-[10px] text-[#bccac0]">
                <div className="font-bold text-[#dfe2ee]">PROTOCOL PREFERENCES:</div>
                <div>• Cabin Temp: 20.5°C</div>
                <div>• Silent Commute Mode • Languages: English / Hindi</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => alert('Dialing masked passenger phone...')}
                  className="py-2 rounded-lg bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] font-mono text-xs flex items-center justify-center gap-1 border border-[#3d4a42]"
                >
                  <span className="material-symbols-outlined text-sm text-[#68dba9]">call</span>
                  <span>+91 11-4099-XXXX</span>
                </button>
                <button
                  type="button"
                  onClick={() => alert('Silent panic beacon dispatched to dispatch desk.')}
                  className="py-2 rounded-lg bg-[#93000a]/30 hover:bg-[#93000a]/50 text-[#ffb4ab] font-mono text-xs flex items-center justify-center gap-1 border border-[#93000a]/50 font-bold"
                >
                  <span className="material-symbols-outlined text-sm">warning</span>
                  <span>SILENT PANIC</span>
                </button>
              </div>
            </div>

            {/* CLIENT FLEET TELEMETRICS */}
            <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col gap-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                  CLIENT FLEET TELEMETRICS
                </span>
                <span className="font-mono text-[9px] text-[#68dba9] font-bold">
                  CAN-BUS SYNCED
                </span>
              </div>

              <div className="flex items-center justify-between font-mono text-xs">
                <div>
                  <strong className="text-[#dfe2ee] block">BMW 530d M-Sport</strong>
                  <span className="text-[10px] text-[#87948b]">
                    Carbon Black Metallic • DL-01-AB-1290
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#87948b] block uppercase">ODOMETER IN</span>
                  <strong className="text-[#dfe2ee]">42,819.4 KM</strong>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[10px]">
                <div className="p-2 rounded bg-[#0a0e16] border border-[#262a33]">
                  <span className="text-[#87948b] block uppercase">SMOOTHNESS</span>
                  <strong className="text-base text-[#68dba9] font-['Space_Grotesk']">100%</strong>
                  <span className="text-[#87948b] block">0 Hard Brakes</span>
                </div>

                <div className="p-2 rounded bg-[#0a0e16] border border-[#262a33]">
                  <span className="text-[#87948b] block uppercase">FUEL RESERVE</span>
                  <strong className="text-base text-[#dfe2ee] font-['Space_Grotesk']">78%</strong>
                  <span className="text-[#87948b] block">Range 560 KM</span>
                </div>

                <div className="p-2 rounded bg-[#0a0e16] border border-[#262a33]">
                  <span className="text-[#87948b] block uppercase">TIRE PRESSURE</span>
                  <strong className="text-base text-[#dfe2ee] font-['Space_Grotesk']">
                    34 PSI
                  </strong>
                  <span className="text-[#68dba9] block">All Quad Equal</span>
                </div>
              </div>
            </div>

            {/* MISSION SETTLEMENT DESK */}
            <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col gap-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                  MISSION SETTLEMENT DESK
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#0a0e16] border border-[#262a33] font-mono text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#68dba9]" />
                  <span>Auto-Tagged Fastag / Toll</span>
                </div>
                <strong className="text-[#68dba9]">+ ₹120.00</strong>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => alert('Add parking/valet expense receipt...')}
                  className="py-2 rounded bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] font-mono text-[10px]"
                >
                  + Add Parking / Valet Slip
                </button>
                <button
                  type="button"
                  onClick={() => alert('Reporting anomaly to dispatch console...')}
                  className="py-2 rounded bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] font-mono text-[10px]"
                >
                  Report Anomaly
                </button>
              </div>

              {/* Complete Trip Action Button */}
              {tripCompleted ? (
                <div className="p-4 rounded-xl bg-[#25a475]/20 border border-[#68dba9] text-center font-mono text-xs text-[#68dba9] font-bold">
                  TRIP COMPLETED! ₹868.00 CREDITED TO YOUR IMPS WALLET.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleCompleteTrip}
                  className="w-full py-4 rounded-xl bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-bold text-sm flex flex-col items-center justify-center gap-0.5 shadow-xl font-['Space_Grotesk'] transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                    <span>COMPLETE TRIP &amp; TRIGGER SETTLEMENT</span>
                  </div>
                  <span className="text-[9px] font-mono font-normal opacity-90">
                    Dual-Confirmation Guard Active • Requires Destination Geofence Handshake
                  </span>
                </button>
              )}
            </div>
          </aside>
        </div>
      </div>
    </DriverLayout>
  );
}

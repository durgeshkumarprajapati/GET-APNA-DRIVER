'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DriverLayout } from '@/components/driver-layout';

export default function DriverCockpitPage() {
  const [driverDutyState, setDriverDutyState] = useState<'online' | 'busy' | 'pause' | 'offline'>(
    'online',
  );

  const queuedDelegations = [
    {
      id: 'del_1',
      time: 'TODAY • 21:30',
      minFare: 'Min ₹2,100',
      route: 'Chanakyapuri Embassy Row → Taj Mahal Hotel Mansingh',
      client: 'Diplomatic Attache',
      vehicle: 'BMW 7 Series',
    },
    {
      id: 'del_2',
      time: 'TOMORROW • 08:00',
      minFare: 'Min ₹3,450',
      route: 'The Leela Palace Delhi → Noida Expressway Tech Zone',
      client: 'FinTech Board Director',
      vehicle: 'Audi A6 Limousine',
    },
    {
      id: 'del_3',
      time: 'TOMORROW • 14:15',
      minFare: 'Min ₹1,600',
      route: 'Golf Links, New Delhi → Golf Course Road, Gurgaon',
      client: 'Private Family Office',
      vehicle: 'Mercedes E-Class',
    },
  ];

  return (
    <DriverLayout activePath="radar-and-duty-shift">
      <div className="flex flex-col w-full">
        <div className="px-6 py-6 space-y-6">
          {/* Top Operational Hero Bar & Duty Switch Console */}
          <div className="relative bg-[#181c24] rounded-xl shadow-xl p-6 overflow-hidden border border-[#262a33]">
            <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-[#68dba9]/5 blur-3xl pointer-events-none" />
            <div className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full bg-[#0053db]/10 blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
              {/* Chauffeur Identity Strip */}
              <div className="flex flex-wrap md:flex-nowrap items-center gap-6 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-xl bg-[#25a475]/20 border-2 border-[#68dba9] flex items-center justify-center text-2xl font-bold text-[#68dba9] shadow-md font-['Space_Grotesk']">
                    VS
                  </div>
                  <span className="absolute -bottom-1 -right-1 bg-[#68dba9] text-[#003825] text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm font-['Space_Grotesk']">
                    T1-ELITE
                  </span>
                </div>

                <div className="flex flex-col space-y-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xl font-bold text-[#dfe2ee] tracking-tight font-['Space_Grotesk']">
                      Vikram Singh
                    </span>
                    <span className="px-2.5 py-0.5 rounded bg-[#1c2028] text-[#4edea3] text-[10px] font-bold tracking-widest uppercase flex items-center gap-1 border border-[#262a33]">
                      <span className="material-symbols-outlined text-xs">verified</span>
                      Govt Verified Chauffeur
                    </span>
                    <span className="font-mono text-xs text-[#87948b]">LIC: DL-04201800921</span>
                  </div>

                  <div className="flex items-center gap-4 text-[#bccac0] flex-wrap font-mono text-xs">
                    <div className="flex items-center gap-1 text-[#68dba9] font-bold">
                      <span className="material-symbols-outlined text-sm text-amber-400">star</span>
                      <span className="text-sm font-bold text-[#dfe2ee]">4.98</span>
                      <span className="text-[#87948b] font-normal">(520 reviews)</span>
                    </div>
                    <span className="text-[#3d4a42]">•</span>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-[#87948b]">
                        history
                      </span>
                      <span className="text-[#dfe2ee] font-bold">1,420</span> Completed Missions
                    </div>
                    <span className="text-[#3d4a42]">•</span>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-[#68dba9]">
                        timer
                      </span>
                      <span className="font-bold text-[#68dba9]">SHIFT 05h 14m</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Target Progress & Multi-State Beacon Trigger */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-6">
                {/* Shift Financial Fuel Bar */}
                <div className="bg-[#1c2028] p-3 rounded-xl flex flex-col justify-center min-w-[210px] space-y-1.5 shadow-inner border border-[#262a33]">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                      Daily Shift Goal
                    </span>
                    <span className="font-bold text-[#68dba9]">78%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#31353e] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#68dba9] transition-all duration-700 ease-out"
                      style={{ width: '78%' }}
                    />
                  </div>
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-[#dfe2ee] font-bold">₹3,150</span>
                    <span className="text-[#87948b]">TARGET ₹4,000</span>
                  </div>
                </div>

                {/* Tactical Availability Switcher Selector */}
                <div className="bg-[#0a0e16] p-1 rounded-xl flex items-center gap-1 shadow-md border border-[#262a33]">
                  <button
                    type="button"
                    onClick={() => setDriverDutyState('online')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-['Space_Grotesk'] transition-all ${
                      driverDutyState === 'online'
                        ? 'bg-[#68dba9] text-[#003825]'
                        : 'text-[#bccac0] hover:text-[#dfe2ee]'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#003825] animate-ping" />
                    <span>ONLINE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDriverDutyState('busy')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-['Space_Grotesk'] transition-all ${
                      driverDutyState === 'busy'
                        ? 'bg-[#dbe1ff] text-[#00174b]'
                        : 'text-[#bccac0] hover:text-[#dfe2ee]'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#00174b]" />
                    <span>BUSY</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDriverDutyState('pause')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-['Space_Grotesk'] transition-all ${
                      driverDutyState === 'pause'
                        ? 'bg-[#262a33] text-[#dfe2ee]'
                        : 'text-[#bccac0] hover:text-[#dfe2ee]'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#87948b]" />
                    <span>PAUSE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDriverDutyState('offline')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-['Space_Grotesk'] transition-all ${
                      driverDutyState === 'offline'
                        ? 'bg-[#93000a] text-[#ffdad6]'
                        : 'text-[#bccac0] hover:text-[#dfe2ee]'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#ffdad6]" />
                    <span>OFFLINE</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Rapid Telemetry 4-Metric Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#181c24] p-4 rounded-xl flex flex-col justify-between space-y-3 shadow-md border border-[#262a33]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk']">
                  Today&apos;s Net Realized
                </span>
                <span className="material-symbols-outlined text-[#68dba9] text-xl">payments</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  ₹3,150.00
                </div>
                <div className="flex items-center gap-1 mt-1 text-[#68dba9] font-mono text-xs">
                  <span className="material-symbols-outlined text-xs">trending_up</span>
                  <span>6 Missions Cleared</span>
                </div>
              </div>
            </div>

            <div className="bg-[#181c24] p-4 rounded-xl flex flex-col justify-between space-y-3 shadow-md border border-[#262a33]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk']">
                  Acceptance Index
                </span>
                <span className="material-symbols-outlined text-[#4edea3] text-xl">
                  check_circle
                </span>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  98.4%
                </div>
                <div className="flex items-center gap-1 mt-1 text-[#4edea3] font-mono text-xs">
                  <span>Top 1% Delhi NCR</span>
                </div>
              </div>
            </div>

            <div className="bg-[#181c24] p-4 rounded-xl flex flex-col justify-between space-y-3 shadow-md border border-[#262a33]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk']">
                  Avg Dispatch Latency
                </span>
                <span className="material-symbols-outlined text-[#b4c5ff] text-xl">flash_on</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  18 sec
                </div>
                <div className="flex items-center gap-1 mt-1 text-[#b4c5ff] font-mono text-xs">
                  <span className="material-symbols-outlined text-xs">speed</span>
                  <span>Optimal Cockpit Alert</span>
                </div>
              </div>
            </div>

            <div className="bg-[#181c24] p-4 rounded-xl flex flex-col justify-between space-y-3 shadow-md border border-[#262a33]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk']">
                  Duty Logged Today
                </span>
                <span className="material-symbols-outlined text-[#68dba9] text-xl">schedule</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  5.2 hrs
                </div>
                <div className="flex items-center gap-1 mt-1 text-[#87948b] font-mono text-xs">
                  <span>MAX ALLOWED: 10.0h</span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Flight Mission Alert Card (Hero Dispatch Mission) */}
          <div className="relative bg-[#31353e] rounded-xl p-6 shadow-xl overflow-hidden border border-[#3d4a42]">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#68dba9]" />
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#68dba9] text-[#003825] font-bold text-[10px] uppercase font-['Space_Grotesk'] tracking-wider">
                    ACTIVE IN-FLIGHT DISPATCH
                  </span>
                  <span className="font-mono text-xs font-bold text-[#68dba9]">#BK-9482</span>
                  <span className="text-[#87948b]">•</span>
                  <span className="text-[10px] font-bold uppercase text-[#4edea3] font-['Space_Grotesk']">
                    VIP Airport Transit
                  </span>
                  <span className="bg-[#0a0e16] px-2 py-0.5 rounded font-mono text-[10px] text-[#dfe2ee]">
                    Mercedes-Benz E-Class Auto
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#68dba9] text-xl">
                      trip_origin
                    </span>
                    <div>
                      <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] block">
                        Pickup Point
                      </span>
                      <div className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                        C-4/28 Vasant Vihar, Embassy Area
                      </div>
                    </div>
                  </div>

                  <span className="material-symbols-outlined text-[#87948b] hidden sm:block">
                    trending_flat
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#4edea3] text-xl">
                      location_on
                    </span>
                    <div>
                      <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] block">
                        VIP Final Drop
                      </span>
                      <div className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                        T3 IGI Airport - Presidential Gate 1
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-1 text-xs text-[#bccac0] flex-wrap font-mono">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-[#68dba9]">person</span>
                    <span className="text-[#dfe2ee] font-medium">Principal: Dr. Radhika Sen</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-[#4edea3]">
                      flight_takeoff
                    </span>
                    <span>Flight AI-102 Dept 19:40</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1 text-[#68dba9] font-bold font-['Space_Grotesk'] text-sm">
                    <span>EST. FARE: ₹1,850</span>
                  </div>
                </div>
              </div>

              {/* Tactical Mission Interaction Cluster */}
              <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 w-full lg:w-auto">
                <Link
                  href="/driver/active-mission-navigation"
                  className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-bold px-6 py-2.5 rounded-lg transition-colors shadow-md font-['Space_Grotesk'] text-xs"
                >
                  <span className="material-symbols-outlined text-base">near_me</span>
                  <span>Cockpit Nav</span>
                </Link>
                <button
                  type="button"
                  onClick={() => alert('Initiating direct encrypted call to Dr. Radhika Sen...')}
                  className="flex items-center justify-center gap-1.5 bg-[#1c2028] hover:bg-[#262a33] text-[#dfe2ee] font-mono text-xs px-4 py-2.5 rounded-lg transition-colors border border-[#262a33]"
                >
                  <span className="material-symbols-outlined text-base text-[#4edea3]">call</span>
                  <span className="hidden sm:inline">Direct Line</span>
                </button>
                <button
                  type="button"
                  onClick={() => alert('SOS Triggered from Driver Cockpit Terminal!')}
                  className="flex items-center justify-center gap-1.5 bg-[#93000a]/40 hover:bg-[#93000a] text-[#ffdad6] font-mono text-xs px-4 py-2.5 rounded-lg transition-colors border border-[#93000a]/60"
                >
                  <span className="material-symbols-outlined text-base">emergency</span>
                  <span className="hidden sm:inline font-bold">SOS Fail-Safe</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bento Core: Geofence Radar Card & Schedule Queues */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Cols: Geofence Map, Telemetry Radar & Corridor Surges */}
            <div className="lg:col-span-7 flex flex-col space-y-4">
              <div className="bg-[#181c24] rounded-xl p-4 shadow-md space-y-4 border border-[#262a33]">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#68dba9] text-2xl">radar</span>
                    <div>
                      <h2 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                        South Delhi Sector 4 Hub
                      </h2>
                      <div className="font-mono text-[10px] text-[#87948b]">
                        GEOFENCE ID: DEL-SECT4-DISPATCH
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-[#1c2028] px-2.5 py-1 rounded font-mono text-[10px] text-[#68dba9] font-bold border border-[#262a33]">
                      RADAR: 5.0 KM
                    </span>
                    <span className="bg-[#1c2028] px-2.5 py-1 rounded font-mono text-[10px] text-[#4edea3] border border-[#262a33]">
                      PING 14ms
                    </span>
                  </div>
                </div>

                {/* Dynamic Radar Map Canvas */}
                <div className="relative w-full h-72 rounded-xl overflow-hidden bg-[#0a0e16] border border-[#262a33] flex items-center justify-center p-4">
                  <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="60"
                      stroke="#68dba9"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                      fill="none"
                    />
                    <circle
                      cx="50%"
                      cy="50%"
                      r="120"
                      stroke="#68dba9"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      fill="none"
                    />
                    <circle
                      cx="50%"
                      cy="50%"
                      r="180"
                      stroke="#68dba9"
                      strokeWidth="1"
                      strokeDasharray="6 6"
                      fill="none"
                    />
                  </svg>
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-[#68dba9]/20 border-2 border-[#68dba9] flex items-center justify-center text-[#68dba9] animate-pulse">
                      <span className="material-symbols-outlined text-2xl">my_location</span>
                    </div>
                    <span className="mt-2 font-mono text-[10px] text-[#68dba9] bg-[#0a0e16]/90 px-3 py-1 rounded border border-[#262a33] font-bold">
                      ACTIVE RADAR SWEEP • SOUTH DELHI SECTOR 4
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 bg-[#0a0e16]/90 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-3 border border-[#262a33]">
                    <div className="flex items-center gap-1 text-[#68dba9] font-mono text-[10px]">
                      <span className="material-symbols-outlined text-xs">satellite_alt</span>
                      <span>Lock: 12 Sats</span>
                    </div>
                    <span className="text-[#87948b]">•</span>
                    <div className="flex items-center gap-1 text-[#4edea3] font-mono text-[10px]">
                      <span className="material-symbols-outlined text-xs">explore</span>
                      <span>Heading: 184° S</span>
                    </div>
                  </div>
                </div>

                {/* Dynamic Corridor Surge Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="bg-[#1c2028] p-3 rounded-lg flex items-center justify-between border border-[#262a33]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-[#25a475]/20 flex items-center justify-center text-[#68dba9] font-bold">
                        <span className="material-symbols-outlined text-base">flight</span>
                      </div>
                      <div>
                        <div className="font-bold text-xs text-[#dfe2ee] font-['Space_Grotesk']">
                          Aerocity Hub
                        </div>
                        <div className="font-mono text-[10px] text-[#87948b]">
                          Demand Multiplier
                        </div>
                      </div>
                    </div>
                    <span className="bg-[#25a475] text-[#00311f] font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                      +1.4x HIGH
                    </span>
                  </div>

                  <div className="bg-[#1c2028] p-3 rounded-lg flex items-center justify-between border border-[#262a33]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-[#0053db]/20 flex items-center justify-center text-[#b4c5ff] font-bold">
                        <span className="material-symbols-outlined text-base">domain</span>
                      </div>
                      <div>
                        <div className="font-bold text-xs text-[#dfe2ee] font-['Space_Grotesk']">
                          Cyber City DLF
                        </div>
                        <div className="font-mono text-[10px] text-[#87948b]">Executive Surge</div>
                      </div>
                    </div>
                    <span className="bg-[#0053db] text-[#cdd7ff] font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                      +1.25x SURGE
                    </span>
                  </div>
                </div>
              </div>

              {/* Weekly Incentive Tracker Visual Widget */}
              <div className="bg-[#181c24] rounded-xl p-4 shadow-md flex flex-col md:flex-row items-center justify-between gap-4 border border-[#262a33]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#1c2028] border border-[#262a33] flex items-center justify-center text-[#68dba9] shrink-0">
                    <span className="material-symbols-outlined text-2xl">military_tech</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-[#68dba9] uppercase font-['Space_Grotesk'] tracking-widest block">
                      Sprint Target: 25 Missions
                    </span>
                    <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                      Weekly Chauffeur Bonus: ₹1,500
                    </h3>
                    <p className="text-xs text-[#87948b]">
                      Complete 7 more runs before Sunday 23:59 to trigger payout directly to wallet.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end min-w-[140px] w-full md:w-auto">
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-xl font-bold text-[#68dba9] font-['Space_Grotesk']">
                      18
                    </span>
                    <span className="text-xs text-[#87948b]">/ 25 Completed</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#1c2028] mt-1 overflow-hidden">
                    <div className="h-full bg-[#68dba9] rounded-full" style={{ width: '72%' }} />
                  </div>
                  <span className="font-mono text-[10px] text-[#4edea3] mt-1 font-semibold">
                    72% Finished
                  </span>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Scheduled Delegations Queue & Quick Terminal Action Matrix */}
            <div className="lg:col-span-5 flex flex-col space-y-4">
              {/* Scheduled Upcoming Delegations List */}
              <div className="bg-[#181c24] rounded-xl p-4 shadow-md space-y-4 border border-[#262a33]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#68dba9] text-xl">
                      event_available
                    </span>
                    <span className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                      Reserved Delegations
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-[#87948b]">3 QUEUED</span>
                </div>

                <div className="flex flex-col gap-3">
                  {queuedDelegations.map((q) => (
                    <div
                      key={q.id}
                      className="bg-[#1c2028] p-3 rounded-xl space-y-1 hover:bg-[#262a33] transition-colors cursor-pointer border border-[#262a33]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="bg-[#25a475] text-[#00311f] font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                          {q.time}
                        </span>
                        <span className="font-mono text-xs text-[#68dba9] font-bold">
                          {q.minFare}
                        </span>
                      </div>
                      <div className="font-bold text-xs text-[#dfe2ee] font-['Space_Grotesk']">
                        {q.route}
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#87948b] font-mono">
                        <span>Client: {q.client}</span>
                        <span className="text-[#4edea3]">{q.vehicle}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Terminal Action Matrix */}
              <div className="bg-[#181c24] rounded-xl p-4 shadow-md space-y-3 border border-[#262a33]">
                <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk'] block">
                  Console Operations &amp; Audits
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/driver/wallet-and-payouts"
                    className="bg-[#1c2028] hover:bg-[#262a33] p-3 rounded-lg flex flex-col items-start space-y-1 text-left transition-colors border border-[#262a33]"
                  >
                    <span className="material-symbols-outlined text-xl text-[#68dba9]">
                      account_balance
                    </span>
                    <span className="font-bold text-xs text-[#dfe2ee] font-['Space_Grotesk']">
                      Instant Payout
                    </span>
                    <span className="font-mono text-[10px] text-[#87948b]">₹3,150 Ready</span>
                  </Link>

                  <Link
                    href="/driver"
                    className="bg-[#1c2028] hover:bg-[#262a33] p-3 rounded-lg flex flex-col items-start space-y-1 text-left transition-colors border border-[#262a33]"
                  >
                    <span className="material-symbols-outlined text-xl text-[#b4c5ff]">
                      explore
                    </span>
                    <span className="font-bold text-xs text-[#dfe2ee] font-['Space_Grotesk']">
                      Dispatch Radar
                    </span>
                    <span className="font-mono text-[10px] text-[#87948b]">Sector Heatmap</span>
                  </Link>

                  <Link
                    href="/driver/document-vault"
                    className="bg-[#1c2028] hover:bg-[#262a33] p-3 rounded-lg flex flex-col items-start space-y-1 text-left transition-colors border border-[#262a33]"
                  >
                    <span className="material-symbols-outlined text-xl text-[#4edea3]">
                      health_and_safety
                    </span>
                    <span className="font-bold text-xs text-[#dfe2ee] font-['Space_Grotesk']">
                      Docs Vault
                    </span>
                    <span className="font-mono text-[10px] text-[#4edea3] font-bold">
                      100% Valid (2029)
                    </span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => alert('Next scheduled vehicle inspection: 12 days')}
                    className="bg-[#1c2028] hover:bg-[#262a33] p-3 rounded-lg flex flex-col items-start space-y-1 text-left transition-colors border border-[#262a33]"
                  >
                    <span className="material-symbols-outlined text-xl text-[#ffb4ab]">
                      build_circle
                    </span>
                    <span className="font-bold text-xs text-[#dfe2ee] font-['Space_Grotesk']">
                      Car Inspection
                    </span>
                    <span className="font-mono text-[10px] text-[#87948b]">Next: in 12 days</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DriverLayout>
  );
}

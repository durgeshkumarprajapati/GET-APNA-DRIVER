'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CustomerLayout } from '@/components/customer-layout';

export default function CustomerDashboardPage() {
  const [activeTab, setActiveTab] = useState<'instant' | 'schedule'>('instant');
  const [pickupAddress, setPickupAddress] = useState('Vasant Vihar C-4/12, Poorvi Marg, New Delhi');
  const [dropAddress, setDropAddress] = useState('Terminal 3, IGI Airport Departure Gate 4');
  const [vehicleClass, setVehicleClass] = useState('Luxury Sedan / SUV (Automatic DSG / AT / EV)');
  const [assignmentType, setAssignmentType] = useState('One-Way Airport Drop (45 min est.)');
  const [durationMode, setDurationMode] = useState<'point' | 'rental4' | 'rental8' | 'outstation'>(
    'point',
  );

  return (
    <CustomerLayout activePath="customer-dashboard">
      <div className="flex flex-col w-full gap-6">
        {/* SECTION 1: Welcome & Telematics Tactical Status Strip */}
        <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 rounded-xl bg-[#181c24] shadow-sm relative overflow-hidden border border-[#262a33]">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#68dba9]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col gap-2 z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest text-[#68dba9] uppercase font-['Space_Grotesk']">
                Executive Operations Feed
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#68dba9] animate-ping" />
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#262a33] text-[#dfe2ee] text-[10px] font-bold uppercase font-['Space_Grotesk']">
                <span className="material-symbols-outlined text-xs text-[#68dba9]">
                  verified_user
                </span>
                <span>TIER-1 VIP CLIENT</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#262a33] text-[#bccac0] text-[10px] font-bold uppercase font-['Space_Grotesk']">
                <span className="material-symbols-outlined text-xs text-[#4edea3]">lock</span>
                <span>AADHAAR KYC VERIFIED</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] tracking-tight font-['Space_Grotesk']">
                Good evening, Vikramaditya
              </h1>
              <div className="flex items-center gap-1.5 text-[#bccac0] font-mono text-xs">
                <span className="material-symbols-outlined text-sm text-[#68dba9]">pin_drop</span>
                <span>Vasant Vihar, Block C, New Delhi</span>
                <button
                  type="button"
                  onClick={() => alert('GPS Telemetry Recalibrated')}
                  className="ml-1 text-[#68dba9] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xs">refresh</span>
                  <span>Recalibrate GPS</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Telemetry Tele-chips */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 z-10">
            <div className="flex flex-col p-3 rounded-lg bg-[#262a33]/80 border border-[#31353e]">
              <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                Grid Density
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  142
                </span>
                <span className="font-mono text-xs text-[#68dba9]">NCR Active</span>
              </div>
            </div>
            <div className="flex flex-col p-3 rounded-lg bg-[#262a33]/80 border border-[#31353e]">
              <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                Fast Response
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  4.2
                </span>
                <span className="font-mono text-xs text-[#bccac0]">min ETA</span>
              </div>
            </div>
            <div className="flex flex-col p-3 rounded-lg bg-[#262a33]/80 border border-[#31353e]">
              <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                Rate Guarantee
              </span>
              <div className="flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[#68dba9] text-base">verified</span>
                <span className="text-xs font-bold text-[#dfe2ee] uppercase font-['Space_Grotesk']">
                  ZERO SURGE
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2 & 3: Primary Tactical Booking Console & Active HUD in Two-Column Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT / MAIN: Primary Action Hero Dispatch Form (7 Cols) */}
          <section className="lg:col-span-7 flex flex-col p-6 rounded-xl bg-[#181c24] shadow-sm border border-[#262a33] relative">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-[#25a475] text-[#00311f] material-symbols-outlined text-xl">
                  commute
                </span>
                <div>
                  <h2 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    Where do you need a chauffeur?
                  </h2>
                  <p className="text-xs text-[#bccac0]">
                    Instant deployment across Delhi-NCR with precision billing
                  </p>
                </div>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-lg bg-[#0a0e16] my-4 border border-[#262a33]">
              <button
                type="button"
                onClick={() => setActiveTab('instant')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded text-xs transition-all font-['Space_Grotesk'] ${
                  activeTab === 'instant'
                    ? 'bg-[#262a33] text-[#dfe2ee] font-bold shadow-sm border border-[#3d4a42]'
                    : 'text-[#bccac0] hover:text-[#dfe2ee]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-pulse" />
                <span>Book Chauffeur Now (Instant)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('schedule')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded text-xs transition-all font-['Space_Grotesk'] ${
                  activeTab === 'schedule'
                    ? 'bg-[#262a33] text-[#dfe2ee] font-bold shadow-sm border border-[#3d4a42]'
                    : 'text-[#bccac0] hover:text-[#dfe2ee]'
                }`}
              >
                <span className="material-symbols-outlined text-base">calendar_today</span>
                <span>Schedule for Later</span>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Input: Pickup Location */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-[#87948b] uppercase tracking-wider flex items-center gap-1.5 font-['Space_Grotesk']">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#68dba9]" />
                    Pickup Address
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setPickupAddress('Vasant Vihar C-4/12, Poorvi Marg, New Delhi')
                      }
                      className="px-2 py-0.5 rounded bg-[#262a33] hover:bg-[#31353e] text-[#68dba9] font-mono text-[10px]"
                    >
                      Home
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPickupAddress('Aerocity HQ Tower B, Worldmark 1, New Delhi')
                      }
                      className="px-2 py-0.5 rounded bg-[#262a33] hover:bg-[#31353e] text-[#bccac0] font-mono text-[10px]"
                    >
                      Aerocity HQ
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickupAddress('Golf Links Road, Block 4, New Delhi')}
                      className="px-2 py-0.5 rounded bg-[#262a33] hover:bg-[#31353e] text-[#bccac0] font-mono text-[10px]"
                    >
                      Golf Links
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#0a0e16] text-[#dfe2ee] border border-[#262a33]">
                  <span className="material-symbols-outlined text-[#68dba9] text-lg">
                    my_location
                  </span>
                  <input
                    type="text"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    className="w-full bg-transparent focus:outline-none text-xs text-[#dfe2ee] placeholder:text-[#87948b]"
                    placeholder="Enter pickup coordinates or landmark"
                  />
                  <span className="material-symbols-outlined text-[#87948b] hover:text-[#dfe2ee] cursor-pointer text-base">
                    edit
                  </span>
                </div>
              </div>

              {/* Input: Drop Destination */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#87948b] uppercase tracking-wider flex items-center gap-1.5 font-['Space_Grotesk']">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#b4c5ff]" />
                  Drop Destination
                </label>
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#0a0e16] text-[#dfe2ee] border border-[#262a33]">
                  <span className="material-symbols-outlined text-[#b4c5ff] text-lg">
                    flight_takeoff
                  </span>
                  <input
                    type="text"
                    value={dropAddress}
                    onChange={(e) => setDropAddress(e.target.value)}
                    className="w-full bg-transparent focus:outline-none text-xs text-[#dfe2ee] placeholder:text-[#87948b]"
                    placeholder="Enter destination airport, office, or address"
                  />
                  <button
                    type="button"
                    onClick={() => setDropAddress('')}
                    className="text-[#87948b] hover:text-[#dfe2ee] material-symbols-outlined text-base"
                  >
                    close
                  </button>
                </div>
              </div>

              {/* Row: Vehicle Spec & Duration Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Transmission & Vehicle Type */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                    Your Vehicle Class
                  </label>
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#0a0e16] text-[#dfe2ee] border border-[#262a33]">
                    <span className="material-symbols-outlined text-[#68dba9] text-lg">
                      directions_car
                    </span>
                    <div className="flex flex-col min-w-0 flex-1">
                      <select
                        value={vehicleClass}
                        onChange={(e) => setVehicleClass(e.target.value)}
                        className="bg-transparent text-xs text-[#dfe2ee] font-medium focus:outline-none cursor-pointer"
                      >
                        <option className="bg-[#1c2028]">Luxury Sedan / SUV</option>
                        <option className="bg-[#1c2028]">Premium Sedan (City / Ciaz)</option>
                        <option className="bg-[#1c2028]">Hatchback / EV (Swift / Ioniq)</option>
                      </select>
                      <span className="font-mono text-[10px] text-[#bccac0]">
                        Automatic (DSG / AT / EV)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Service Duration Mode */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                    Assignment Type
                  </label>
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#0a0e16] text-[#dfe2ee] border border-[#262a33]">
                    <span className="material-symbols-outlined text-[#68dba9] text-lg">
                      schedule
                    </span>
                    <div className="flex flex-col min-w-0 flex-1">
                      <select
                        value={assignmentType}
                        onChange={(e) => setAssignmentType(e.target.value)}
                        className="bg-transparent text-xs text-[#dfe2ee] font-medium focus:outline-none cursor-pointer"
                      >
                        <option className="bg-[#1c2028]">One-Way Airport Drop</option>
                        <option className="bg-[#1c2028]">Hourly Rental (4h / 40km)</option>
                        <option className="bg-[#1c2028]">Hourly Rental (8h / 80km)</option>
                        <option className="bg-[#1c2028]">Outstation Intercity</option>
                      </select>
                      <span className="font-mono text-[10px] text-[#bccac0]">
                        45 min est. commute
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Duration Quick Selection Chips */}
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                <button
                  type="button"
                  onClick={() => setDurationMode('point')}
                  className={`px-3 py-1 rounded text-[10px] font-bold uppercase whitespace-nowrap font-['Space_Grotesk'] ${
                    durationMode === 'point'
                      ? 'bg-[#25a475] text-[#00311f]'
                      : 'bg-[#262a33] text-[#bccac0] hover:text-[#dfe2ee]'
                  }`}
                >
                  Point-to-Point
                </button>
                <button
                  type="button"
                  onClick={() => setDurationMode('rental4')}
                  className={`px-3 py-1 rounded text-[10px] font-bold uppercase whitespace-nowrap font-['Space_Grotesk'] ${
                    durationMode === 'rental4'
                      ? 'bg-[#25a475] text-[#00311f]'
                      : 'bg-[#262a33] text-[#bccac0] hover:text-[#dfe2ee]'
                  }`}
                >
                  Rental 4h (40 km)
                </button>
                <button
                  type="button"
                  onClick={() => setDurationMode('rental8')}
                  className={`px-3 py-1 rounded text-[10px] font-bold uppercase whitespace-nowrap font-['Space_Grotesk'] ${
                    durationMode === 'rental8'
                      ? 'bg-[#25a475] text-[#00311f]'
                      : 'bg-[#262a33] text-[#bccac0] hover:text-[#dfe2ee]'
                  }`}
                >
                  Rental 8h (80 km)
                </button>
                <button
                  type="button"
                  onClick={() => setDurationMode('outstation')}
                  className={`px-3 py-1 rounded text-[10px] font-bold uppercase whitespace-nowrap font-['Space_Grotesk'] ${
                    durationMode === 'outstation'
                      ? 'bg-[#25a475] text-[#00311f]'
                      : 'bg-[#262a33] text-[#bccac0] hover:text-[#dfe2ee]'
                  }`}
                >
                  Outstation Intercity
                </button>
              </div>

              {/* Estimate Banner and Primary Action */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-[#0a0e16] border border-[#262a33] mt-1">
                <div className="flex items-baseline gap-2 w-full sm:w-auto">
                  <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                    Est. Fare:
                  </span>
                  <span className="text-xl font-bold text-[#68dba9] font-['Space_Grotesk']">
                    ₹450 - ₹550
                  </span>
                  <span className="font-mono text-[10px] text-[#bccac0]">(No surge applied)</span>
                </div>
                <Link
                  href="/customer/find-driver"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all font-['Space_Grotesk']"
                >
                  <span className="material-symbols-outlined text-base">radar</span>
                  <span>Dispatch Verified Chauffeur</span>
                </Link>
              </div>
            </div>
          </section>

          {/* RIGHT: Active Trip Quick-HUD (5 Cols) */}
          <aside className="lg:col-span-5 flex flex-col gap-4">
            {/* Live Mission Card */}
            <div className="flex flex-col p-6 rounded-xl bg-[#181c24] shadow-sm border border-[#262a33] relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#68dba9] animate-ping" />
                  <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk']">
                    Live Active Mission
                  </span>
                </div>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#262a33] text-[#bccac0]">
                  #BK-9482
                </span>
              </div>

              {/* Chauffeur En Route Status Headline */}
              <div className="mt-4 flex items-baseline justify-between">
                <h3 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Chauffeur En Route
                </h3>
                <span className="text-lg font-bold text-[#68dba9] font-['Space_Grotesk']">
                  ETA 6 min
                </span>
              </div>
              <p className="font-mono text-[10px] text-[#bccac0]">
                Dispatched from Munirka Flyover Telematics Node
              </p>

              {/* Driver Profile Snapshot */}
              <div className="flex items-center gap-4 p-3 rounded-lg bg-[#0a0e16] border border-[#262a33] mt-4">
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-full bg-[#25a475]/20 border border-[#68dba9] flex items-center justify-center text-lg font-bold text-[#68dba9]">
                    RK
                  </div>
                  <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#68dba9] flex items-center justify-center text-[#003825]">
                    <span className="material-symbols-outlined text-[10px]">check</span>
                  </span>
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-[#dfe2ee] truncate font-['Space_Grotesk']">
                      Rajesh Kumar
                    </h4>
                    <div className="flex items-center gap-0.5 font-mono text-xs text-amber-400">
                      <span className="material-symbols-outlined text-xs">star</span>
                      <span>4.98</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[#bccac0] font-mono text-[10px]">
                    <span>1,420 Missions</span>
                    <span>•</span>
                    <span className="text-[#68dba9]">Police Verified</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#262a33] text-[#dfe2ee] font-['Space_Grotesk']">
                      Assigned: BMW 5-Series
                    </span>
                    <span className="font-mono text-[9px] text-[#87948b]">DL-01-AB-1290</span>
                  </div>
                </div>
              </div>

              {/* Encrypted Start Code & Masked Contact Bar */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-[#0a0e16] border border-[#262a33]">
                  <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                    Encrypted Ride OTP
                  </span>
                  <span className="text-xl font-bold text-[#68dba9] tracking-widest mt-1 font-['Space_Grotesk']">
                    7842
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => alert('Initiating direct masked call to chauffeur...')}
                  className="flex flex-col items-center justify-center p-3 rounded-lg bg-[#262a33] hover:bg-[#31353e] transition-all text-[#dfe2ee] border border-[#3d4a42]"
                >
                  <span className="material-symbols-outlined text-[#68dba9] text-xl">call</span>
                  <span className="text-[10px] font-bold uppercase mt-1 font-['Space_Grotesk']">
                    Direct Masked Call
                  </span>
                  <span className="font-mono text-[9px] text-[#87948b]">+91 11-4099-XXXX</span>
                </button>
              </div>

              {/* Map & SOS Dual CTA Strip */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Link
                  href="/customer/active-tracking"
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#31353e] hover:bg-[#353942] text-[#dfe2ee] font-bold text-xs transition-all font-['Space_Grotesk'] border border-[#3d4a42]"
                >
                  <span className="material-symbols-outlined text-base text-[#68dba9]">
                    near_me
                  </span>
                  <span>Live Radar Map</span>
                </Link>
                <Link
                  href="/customer/safety-sos"
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#93000a]/20 hover:bg-[#93000a]/40 text-[#ffb4ab] font-bold text-xs transition-all font-['Space_Grotesk'] border border-[#93000a]/50"
                >
                  <span className="material-symbols-outlined text-base">emergency</span>
                  <span>SOS Monitor</span>
                </Link>
              </div>
            </div>

            {/* Mini Telematics Health HUD */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#181c24] border border-[#262a33]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#68dba9]" />
                <span className="font-mono text-xs text-[#dfe2ee]">Vehicle Telemetry Link</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs text-[#bccac0]">
                <span>Speed: 38 km/h</span>
                <span>•</span>
                <span className="text-[#68dba9]">Direct Route Locked</span>
              </div>
            </div>
          </aside>
        </div>

        {/* SECTION 4: High-Velocity Quick Actions (4-Card Tactical Grid) */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk']">
                Fast Dispatch Vectors
              </span>
              <span className="text-[#87948b]">•</span>
              <span className="font-mono text-xs text-[#bccac0]">Dedicated Executive Class</span>
            </div>
            <Link
              href="/customer/find-driver"
              className="font-mono text-xs text-[#68dba9] hover:underline"
            >
              View Deployment Catalog
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Card 1: Find Chauffeur */}
            <Link
              href="/customer/find-driver"
              className="group flex flex-col justify-between p-5 rounded-xl bg-[#181c24] hover:bg-[#1c2028] transition-all border border-[#262a33] shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-lg bg-[#262a33] text-[#68dba9] group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-2xl">person_search</span>
                </div>
                <span className="font-mono text-xs text-[#68dba9] font-bold">INSTANT</span>
              </div>
              <div className="mt-6">
                <h3 className="text-base font-bold text-[#dfe2ee] group-hover:text-[#68dba9] transition-colors font-['Space_Grotesk']">
                  Find Chauffeur
                </h3>
                <p className="text-xs text-[#bccac0] mt-1">
                  Rapid radar scan matching closest certified pilots in &lt; 3 mins.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-[#68dba9] font-mono text-xs">
                <span>Scan nearby radius</span>
                <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </div>
            </Link>

            {/* Card 2: Schedule Trip */}
            <Link
              href="/customer/bookings"
              className="group flex flex-col justify-between p-5 rounded-xl bg-[#181c24] hover:bg-[#1c2028] transition-all border border-[#262a33] shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-lg bg-[#262a33] text-[#b4c5ff] group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-2xl">event_available</span>
                </div>
                <span className="font-mono text-xs text-[#b4c5ff] font-bold">RESERVED</span>
              </div>
              <div className="mt-6">
                <h3 className="text-base font-bold text-[#dfe2ee] group-hover:text-[#b4c5ff] transition-colors font-['Space_Grotesk']">
                  Schedule Trip
                </h3>
                <p className="text-xs text-[#bccac0] mt-1">
                  Pre-booked VIP transfers for early morning IGI flights and board meetings.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-[#b4c5ff] font-mono text-xs">
                <span>Set departure date</span>
                <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </div>
            </Link>

            {/* Card 3: Hourly Hire */}
            <Link
              href="/customer/find-driver"
              className="group flex flex-col justify-between p-5 rounded-xl bg-[#181c24] hover:bg-[#1c2028] transition-all border border-[#262a33] shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-lg bg-[#262a33] text-[#4edea3] group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-2xl">timelapse</span>
                </div>
                <span className="font-mono text-xs text-[#4edea3] font-bold">4H / 8H / 12H</span>
              </div>
              <div className="mt-6">
                <h3 className="text-base font-bold text-[#dfe2ee] group-hover:text-[#4edea3] transition-colors font-['Space_Grotesk']">
                  Hourly Delegation
                </h3>
                <p className="text-xs text-[#bccac0] mt-1">
                  Retain a dedicated driver for multiple embassy, office, and dining stops.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-[#4edea3] font-mono text-xs">
                <span>Configure package</span>
                <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </div>
            </Link>

            {/* Card 4: Outstation Chauffeur */}
            <Link
              href="/customer/find-driver"
              className="group flex flex-col justify-between p-5 rounded-xl bg-[#181c24] hover:bg-[#1c2028] transition-all border border-[#262a33] shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-lg bg-[#262a33] text-[#85f8c4] group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-2xl">signpost</span>
                </div>
                <span className="font-mono text-xs text-[#85f8c4] font-bold">HIGHWAY TIER</span>
              </div>
              <div className="mt-6">
                <h3 className="text-base font-bold text-[#dfe2ee] group-hover:text-[#85f8c4] transition-colors font-['Space_Grotesk']">
                  Outstation Trips
                </h3>
                <p className="text-xs text-[#bccac0] mt-1">
                  Expressway certified drivers for Jaipur, Agra, Chandigarh, &amp; hills.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-[#85f8c4] font-mono text-xs">
                <span>Intercity deployment</span>
                <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </div>
            </Link>
          </div>
        </section>

        {/* SECTION 5: Recommended & Favorite Drivers (Executive Roster) */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk']">
                Assigned Roster
              </span>
              <span className="text-[#87948b]">•</span>
              <h2 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                Your Preferred Elite Chauffeurs
              </h2>
            </div>
            <Link
              href="/customer/favorites"
              className="flex items-center gap-1 text-[#68dba9] hover:underline font-mono text-xs"
            >
              <span>Manage 6 Favorites</span>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Driver Card 1 */}
            <div className="flex flex-col justify-between p-5 rounded-xl bg-[#181c24] border border-[#262a33] shadow-sm hover:border-[#3d4a42] transition-all">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-[#25a475]/20 border border-[#68dba9] flex items-center justify-center text-sm font-bold text-[#68dba9] font-['Space_Grotesk']">
                        MS
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#68dba9] border-2 border-[#181c24]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                        Manpreet Singh
                      </h3>
                      <span className="font-mono text-[10px] text-[#87948b] block">
                        Verified 4.8 yrs • 2,190 trips
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#262a33] font-mono text-xs text-amber-400">
                    <span className="material-symbols-outlined text-xs">star</span>
                    <span>4.99</span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1">
                  <span className="px-2 py-0.5 rounded bg-[#262a33] text-[#bccac0] font-mono text-[10px]">
                    Mercedes-Benz S/E
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#262a33] text-[#bccac0] font-mono text-[10px]">
                    Audi A6/A8
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#262a33] text-[#bccac0] font-mono text-[10px]">
                    Automatic Pro
                  </span>
                </div>
                <div className="mt-4 p-2.5 rounded-lg bg-[#0a0e16] flex items-center justify-between border border-[#262a33]">
                  <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                    Hourly Rate
                  </span>
                  <span className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    ₹180<span className="text-xs font-normal text-[#bccac0]">/hr</span>
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-3 flex items-center justify-between border-t border-[#262a33]">
                <div className="flex items-center gap-1.5 text-[#68dba9] font-mono text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-[#68dba9]" />
                  <span>Available (3 km away)</span>
                </div>
                <button
                  type="button"
                  onClick={() => alert('Quick rebooking request sent for Manpreet Singh')}
                  className="px-3 py-1 rounded bg-[#262a33] hover:bg-[#68dba9] hover:text-[#003825] text-[#dfe2ee] text-[10px] font-bold uppercase transition-all font-['Space_Grotesk']"
                >
                  Quick Rebook
                </button>
              </div>
            </div>

            {/* Driver Card 2 */}
            <div className="flex flex-col justify-between p-5 rounded-xl bg-[#181c24] border border-[#262a33] shadow-sm hover:border-[#3d4a42] transition-all">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-[#25a475]/20 border border-[#68dba9] flex items-center justify-center text-sm font-bold text-[#68dba9] font-['Space_Grotesk']">
                        DJ
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#68dba9] border-2 border-[#181c24]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                        Devendra Joshi
                      </h3>
                      <span className="font-mono text-[10px] text-[#87948b] block">
                        Verified 3.5 yrs • 1,640 trips
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#262a33] font-mono text-xs text-amber-400">
                    <span className="material-symbols-outlined text-xs">star</span>
                    <span>4.96</span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1">
                  <span className="px-2 py-0.5 rounded bg-[#262a33] text-[#bccac0] font-mono text-[10px]">
                    Toyota Fortuner
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#262a33] text-[#bccac0] font-mono text-[10px]">
                    BMW 3/5 Series
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#262a33] text-[#bccac0] font-mono text-[10px]">
                    VIP Escort
                  </span>
                </div>
                <div className="mt-4 p-2.5 rounded-lg bg-[#0a0e16] flex items-center justify-between border border-[#262a33]">
                  <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                    Hourly Rate
                  </span>
                  <span className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    ₹160<span className="text-xs font-normal text-[#bccac0]">/hr</span>
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-3 flex items-center justify-between border-t border-[#262a33]">
                <div className="flex items-center gap-1.5 text-[#68dba9] font-mono text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-[#68dba9]" />
                  <span>Available (1.8 km away)</span>
                </div>
                <button
                  type="button"
                  onClick={() => alert('Quick rebooking request sent for Devendra Joshi')}
                  className="px-3 py-1 rounded bg-[#262a33] hover:bg-[#68dba9] hover:text-[#003825] text-[#dfe2ee] text-[10px] font-bold uppercase transition-all font-['Space_Grotesk']"
                >
                  Quick Rebook
                </button>
              </div>
            </div>

            {/* Driver Card 3 */}
            <div className="flex flex-col justify-between p-5 rounded-xl bg-[#181c24] border border-[#262a33] shadow-sm hover:border-[#3d4a42] transition-all">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-[#25a475]/20 border border-[#87948b] flex items-center justify-center text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                        SC
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#87948b] border-2 border-[#181c24]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                        Satish Chauhan
                      </h3>
                      <span className="font-mono text-[10px] text-[#87948b] block">
                        Verified 6.0 yrs • 3,420 trips
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#262a33] font-mono text-xs text-amber-400">
                    <span className="material-symbols-outlined text-xs">star</span>
                    <span>4.97</span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1">
                  <span className="px-2 py-0.5 rounded bg-[#262a33] text-[#bccac0] font-mono text-[10px]">
                    EV (BYD / Ioniq)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#262a33] text-[#bccac0] font-mono text-[10px]">
                    Jaguar / Land Rover
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#262a33] text-[#bccac0] font-mono text-[10px]">
                    Night Pilot
                  </span>
                </div>
                <div className="mt-4 p-2.5 rounded-lg bg-[#0a0e16] flex items-center justify-between border border-[#262a33]">
                  <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                    Hourly Rate
                  </span>
                  <span className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    ₹175<span className="text-xs font-normal text-[#bccac0]">/hr</span>
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-3 flex items-center justify-between border-t border-[#262a33]">
                <div className="flex items-center gap-1.5 text-[#bccac0] font-mono text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-[#87948b]" />
                  <span>On Mission (Free at 21:00)</span>
                </div>
                <button
                  type="button"
                  onClick={() => alert('Pre-reservation placed for Satish Chauhan')}
                  className="px-3 py-1 rounded bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] text-[10px] font-bold uppercase transition-all font-['Space_Grotesk']"
                >
                  Pre-Reserve
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: Active Offers & Executive Wallet Glance */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Active Offers Card (7 Cols) */}
          <div className="lg:col-span-7 p-6 rounded-xl bg-[#181c24] border border-[#262a33] shadow-sm flex flex-col justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-[#68dba9] text-[10px] font-bold uppercase font-['Space_Grotesk']">
                <span className="material-symbols-outlined text-base">redeem</span>
                <span>Corporate &amp; Loyalty Incentives</span>
              </div>
              <h3 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                Unlocked Privileges for March
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
              {/* Coupon 1 */}
              <div className="p-4 rounded-lg bg-[#0a0e16] border border-[#262a33] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#25a475] text-[#00311f] font-bold">
                      FIRSTDRIVE
                    </span>
                    <span className="text-[10px] font-bold text-[#68dba9] font-['Space_Grotesk']">
                      ₹100 SAVINGS
                    </span>
                  </div>
                  <p className="text-xs text-[#dfe2ee] mt-3">
                    Instant ₹100 auto-credit on next intercity or 8h rental.
                  </p>
                </div>
                <span className="font-mono text-[10px] text-[#87948b] mt-3 block">
                  Valid until March 31, 2025
                </span>
              </div>
              {/* Corporate GST Billing Status */}
              <div className="p-4 rounded-lg bg-[#0a0e16] border border-[#262a33] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#b4c5ff] uppercase font-['Space_Grotesk']">
                      GST Enterprise
                    </span>
                    <span className="material-symbols-outlined text-[#b4c5ff] text-base">
                      receipt_long
                    </span>
                  </div>
                  <p className="text-xs text-[#dfe2ee] mt-3">
                    Automated 18% Input Tax Credit sync to{' '}
                    <strong className="font-semibold">VIKRAM_HOLDINGS_LLP</strong>
                  </p>
                </div>
                <span className="font-mono text-[10px] text-[#68dba9] mt-3 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">check_circle</span>
                  <span>Active GSTIN Registered</span>
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-[#bccac0]">Explore 4 additional regional coupons</span>
              <Link
                href="/customer/offers"
                className="text-[#68dba9] hover:underline font-mono text-xs flex items-center gap-1"
              >
                <span>View All Offers</span>
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </Link>
            </div>
          </div>

          {/* Executive Wallet & Fast Balance (5 Cols) */}
          <div className="lg:col-span-5 p-6 rounded-xl bg-[#181c24] border border-[#262a33] shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-start justify-between z-10">
              <div>
                <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk']">
                  Enterprise Prepaid Rails
                </span>
                <h3 className="text-lg font-bold text-[#dfe2ee] mt-1 font-['Space_Grotesk']">
                  Primary Mobility Wallet
                </h3>
              </div>
              <div className="p-2 rounded bg-[#262a33] text-[#68dba9]">
                <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
              </div>
            </div>

            {/* Balance Telemetry Module */}
            <div className="my-4 p-4 rounded-lg bg-[#0a0e16] border border-[#262a33] z-10 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                  Usable Liquidity
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    ₹2,450.00
                  </span>
                  <span className="font-mono text-[10px] text-[#68dba9]">Auto-recharge ON</span>
                </div>
              </div>
              <Link
                href="/customer/wallet"
                className="px-4 py-2 rounded-lg bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-bold text-xs shadow-sm transition-all flex items-center gap-1 font-['Space_Grotesk']"
              >
                <span className="material-symbols-outlined text-base">add</span>
                <span>Add Funds</span>
              </Link>
            </div>

            {/* Quick Payment Method Snapshot */}
            <div className="flex items-center justify-between z-10 pt-1">
              <div className="flex items-center gap-1.5 font-mono text-xs text-[#bccac0]">
                <span className="material-symbols-outlined text-sm text-[#b4c5ff]">
                  credit_card
                </span>
                <span>HDFC Diners Black (•••• 8092)</span>
              </div>
              <span className="font-mono text-[10px] text-[#87948b]">Default Auto-Pay</span>
            </div>
          </div>
        </section>
      </div>
    </CustomerLayout>
  );
}

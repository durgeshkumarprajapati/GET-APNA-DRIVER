'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ControlStationLayout } from '@/components/control-station-layout';

export default function AdminLiveOpsConsolePage() {
  const [activeCityTab, setActiveCityTab] = useState<
    'delhi' | 'mumbai' | 'bengaluru' | 'hyderabad'
  >('delhi');
  const [searchQuery, setSearchQuery] = useState('');
  const [takeRate, setTakeRate] = useState(18.5);
  const [surgeActive, setSurgeActive] = useState(true);
  const [actionAlert, setActionAlert] = useState<string | null>(null);

  const showAlert = (msg: string) => {
    setActionAlert(msg);
    setTimeout(() => setActionAlert(null), 4000);
  };

  return (
    <ControlStationLayout activePersona="admin" activePath="admin-live-ops-map">
      <div className="w-full px-4 sm:px-6 py-6 flex flex-col gap-6 max-w-[1800px] mx-auto">
        {/* Banner Alert Toast */}
        {actionAlert && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#68dba9] text-[#003825] font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
            <span className="material-symbols-outlined text-[#003825]">check_circle</span>
            <span>{actionAlert}</span>
          </div>
        )}

        {/* Top Header & Ops Status Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#181c24] p-5 rounded-2xl border border-[#262a33] shadow-md">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <span className="bg-[#00311f] text-[#68dba9] text-[11px] font-mono font-bold px-2.5 py-1 rounded flex items-center gap-1.5 uppercase tracking-wider border border-[#25a475]/30">
                <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-pulse"></span>
                OPS TERMINAL v4.2 SF-B
              </span>
              <span className="text-xs font-mono text-[#bccac0]">SYN CSD: 14:02:18 IST</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-[#dfe2ee] tracking-tight mt-1">
              Live Operations &amp; Fleet Dispatch Control
            </h1>
            <p className="text-xs sm:text-sm text-[#bccac0]">
              Real-time telematics ingestion, regional surge algorithms, verified KYC queue &amp;
              settlement rails
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => showAlert('Operational audit log requested. Report generated.')}
              className="px-4 py-2 rounded-xl bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] text-xs font-mono font-semibold flex items-center gap-2 transition-colors border border-[#3d4a42]"
            >
              <span className="material-symbols-outlined text-sm">assessment</span>
              Audit Report
            </button>
            <button
              type="button"
              onClick={() =>
                showAlert('EMERGENCY LOCKDOWN PROTOCOL ARMED - Fleet notifications dispatched.')
              }
              className="px-4 py-2 rounded-xl bg-[#93000a] hover:bg-[#690005] text-[#ffdad6] text-xs font-mono font-bold flex items-center gap-2 transition-colors shadow-lg shadow-red-900/30"
            >
              <span className="material-symbols-outlined text-sm">emergency</span>
              Emergency Lockdown
            </button>
          </div>
        </div>

        {/* Top 5 KPI Metrics Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-col gap-1 shadow-sm">
            <div className="flex items-center justify-between text-[#bccac0]">
              <span className="text-[11px] font-mono uppercase tracking-wider">
                Gross Merchandise Value
              </span>
              <span className="material-symbols-outlined text-sm text-[#68dba9]">payments</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-display text-[#dfe2ee]">₹18.4M</span>
              <span className="text-xs font-mono text-[#68dba9] font-semibold">+14.2%</span>
            </div>
            <span className="text-[10px] font-mono text-[#bccac0]">vs last 24h cycle</span>
          </div>

          <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-col gap-1 shadow-sm">
            <div className="flex items-center justify-between text-[#bccac0]">
              <span className="text-[11px] font-mono uppercase tracking-wider">
                Net Take-Rate ({takeRate}%)
              </span>
              <span className="material-symbols-outlined text-sm text-[#68dba9]">pie_chart</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-display text-[#68dba9]">₹3.40M</span>
              <span className="text-xs font-mono text-[#68dba9] font-semibold">18.5%</span>
            </div>
            <span className="text-[10px] font-mono text-[#bccac0]">Avg margin per trip: ₹482</span>
          </div>

          <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-col gap-1 shadow-sm">
            <div className="flex items-center justify-between text-[#bccac0]">
              <span className="text-[11px] font-mono uppercase tracking-wider">
                Active Dispatch Grid
              </span>
              <span className="material-symbols-outlined text-sm text-[#68dba9]">alt_route</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-display text-[#dfe2ee]">142</span>
              <span className="text-xs font-mono text-[#68dba9] font-semibold">LIVE TRIPS</span>
            </div>
            <span className="text-[10px] font-mono text-[#bccac0]">Avg trip duration: 38 mins</span>
          </div>

          <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-col gap-1 shadow-sm">
            <div className="flex items-center justify-between text-[#bccac0]">
              <span className="text-[11px] font-mono uppercase tracking-wider">Online Drivers</span>
              <span className="material-symbols-outlined text-sm text-[#68dba9]">badge</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-display text-[#dfe2ee]">894</span>
              <span className="text-xs font-mono text-[#bccac0]">/ 920 Target</span>
            </div>
            <span className="text-[10px] font-mono text-[#68dba9] font-semibold">
              97.1% fleet utilization
            </span>
          </div>

          <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-col gap-1 shadow-sm">
            <div className="flex items-center justify-between text-[#bccac0]">
              <span className="text-[11px] font-mono uppercase tracking-wider">Customer NPS</span>
              <span className="material-symbols-outlined text-sm text-[#68dba9]">thumb_up</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-display text-[#dfe2ee]">86</span>
              <span className="text-xs font-mono text-[#68dba9] font-semibold">World-Class</span>
            </div>
            <span className="text-[10px] font-mono text-[#bccac0]">98.4% 5-star ratings</span>
          </div>
        </div>

        {/* Regional Clustering Map & Surge Panel */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left: Regional Map Telemetry Canvas (7 Cols) */}
          <div className="xl:col-span-7 bg-[#181c24] rounded-2xl border border-[#262a33] p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#68dba9] text-xl">hub</span>
                <h3 className="font-bold font-display text-lg text-[#dfe2ee]">
                  Regional Fleet Clustering Map
                </h3>
                <span className="text-[10px] font-mono text-[#68dba9] bg-[#00311f] px-2 py-0.5 rounded uppercase font-semibold">
                  Multi-City Real-Time Mesh
                </span>
              </div>

              {/* City Selection Tabs */}
              <div className="flex items-center bg-[#0a0e16] p-1 rounded-lg border border-[#262a33]">
                {(['delhi', 'mumbai', 'bengaluru', 'hyderabad'] as const).map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setActiveCityTab(city)}
                    className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                      activeCityTab === city
                        ? 'bg-[#262a33] text-[#dfe2ee] font-bold shadow'
                        : 'text-[#bccac0] hover:text-[#dfe2ee]'
                    }`}
                  >
                    {city === 'delhi' ? 'Delhi-NCR' : city.charAt(0).toUpperCase() + city.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Mesh Indicators Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="bg-[#0a0e16] p-2.5 rounded-lg border border-[#262a33] flex items-center justify-between">
                <span className="text-[#bccac0]">Active Trips</span>
                <span className="text-[#68dba9] font-bold">142</span>
              </div>
              <div className="bg-[#0a0e16] p-2.5 rounded-lg border border-[#262a33] flex items-center justify-between">
                <span className="text-[#bccac0]">Available Idle</span>
                <span className="text-[#dfe2ee] font-bold">328</span>
              </div>
              <div className="bg-[#0a0e16] p-2.5 rounded-lg border border-[#262a33] flex items-center justify-between">
                <span className="text-[#bccac0]">En Route Pickup</span>
                <span className="text-[#b4c5ff] font-bold">41</span>
              </div>
              <div className="bg-[#0a0e16] p-2.5 rounded-lg border border-[#93000a]/50 flex items-center justify-between bg-red-950/20">
                <span className="text-[#ffb4ab]">Flagged SOS</span>
                <span className="text-[#ffb4ab] font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#ffb4ab] animate-ping"></span>
                  03
                </span>
              </div>
            </div>

            {/* Interactive Map Visualizer Box */}
            <div className="relative w-full h-[400px] rounded-xl overflow-hidden bg-[#0a0e16] border border-[#262a33] flex flex-col justify-between p-4">
              {/* Map Background Image */}
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity filter contrast-125"
                style={{
                  backgroundImage:
                    "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBlnAsSo9wv6HaCFamF4_TFWTQw7btArKhyHdJz8ro4zFr8ddpOxDEmldg8oJdGbxSHqsQRGMNWyNJkC0riBMUP-itZR5w2HCxcOrrREHnl_s-t9xvx2B_kW5ojcIajvLdp1bGexU5k4M9TTT6DtIABtqIowMcPMPUjZQ0Dn7qD1kyp0WYwKsQAL-kxrv7UduQ08Ie6vdvKtC87AN49cnzCNBeuWFWKCEgVoGdlmkuV_1mSiX0uWzs42w')",
                }}
              ></div>

              {/* Map Overlay Canvas Grid */}
              <div className="absolute inset-0 pointer-events-none border border-[#68dba9]/10">
                <div className="w-full h-full bg-[linear-gradient(to_right,#31353e15_1px,transparent_1px),linear-gradient(to_bottom,#31353e15_1px,transparent_1px)] bg-[size:32px_32px]"></div>
              </div>

              {/* Top Map HUD */}
              <div className="relative z-10 flex items-center justify-between bg-[#181c24]/90 backdrop-blur-md px-3 py-2 rounded-lg border border-[#262a33]">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#68dba9] animate-pulse"></span>
                  <span className="text-[#dfe2ee] font-bold uppercase">
                    Telemetry Mesh : Active
                  </span>
                  <span className="text-[#bccac0]">(1.28 FPS)</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-[#68dba9]">
                  <span className="material-symbols-outlined text-sm">layers</span>
                  Heatmap Ingestion
                </div>
              </div>

              {/* Live Map Pins / Callouts */}
              <div className="relative z-20 flex flex-col gap-4 pointer-events-auto">
                {/* SOS Alert Pin on Map */}
                <div className="absolute left-[38%] top-[25%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer">
                  <div className="bg-[#93000a] text-[#ffdad6] text-[10px] font-mono font-bold px-2 py-1 rounded-md shadow-2xl flex items-center gap-1.5 border border-red-500/50 animate-bounce">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                    <span>SOS TRIPPED: Devendra R. - Innova Crysta</span>
                  </div>
                  <span className="text-[9px] font-mono text-[#ffdad6] bg-[#0a0e16]/90 px-1.5 py-0.5 rounded mt-0.5">
                    Connaught Place Outer Ring
                  </span>
                </div>

                {/* Active Cluster Pin 1 */}
                <div className="absolute left-[65%] top-[55%] flex items-center gap-1.5 bg-[#181c24]/90 px-2 py-1 rounded-lg border border-[#68dba9]/50 shadow">
                  <span className="w-2 h-2 rounded-full bg-[#68dba9]"></span>
                  <span className="text-[10px] font-mono text-[#dfe2ee] font-bold">
                    Aerocity Hub (28 Drivers)
                  </span>
                </div>

                {/* Active Cluster Pin 2 */}
                <div className="absolute left-[20%] top-[70%] flex items-center gap-1.5 bg-[#181c24]/90 px-2 py-1 rounded-lg border border-[#b4c5ff]/50 shadow">
                  <span className="w-2 h-2 rounded-full bg-[#b4c5ff]"></span>
                  <span className="text-[10px] font-mono text-[#dfe2ee] font-bold">
                    Vasant Kunj (14 Drivers)
                  </span>
                </div>
              </div>

              {/* Bottom HUD Coordinates */}
              <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-[#bccac0] bg-[#0a0e16]/80 px-3 py-1.5 rounded-lg border border-[#262a33]">
                <span>Grid: 28.6139° N, 77.2090° E</span>
                <span>Zoom: 13.8x</span>
                <span className="text-[#68dba9]">NCR-CENTRAL</span>
              </div>
            </div>
          </div>

          {/* Right: Surge & Fleet Dynamics Panel (5 Cols) */}
          <div className="xl:col-span-5 bg-[#181c24] rounded-2xl border border-[#262a33] p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#68dba9] text-xl">
                  trending_up
                </span>
                <h3 className="font-bold font-display text-lg text-[#dfe2ee]">
                  Surge &amp; Fleet Dynamics
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSurgeActive(!surgeActive)}
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 transition-colors ${
                  surgeActive
                    ? 'bg-[#00311f] text-[#68dba9] border border-[#25a475]'
                    : 'bg-[#262a33] text-[#bccac0]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${surgeActive ? 'bg-[#68dba9]' : 'bg-[#bccac0]'}`}
                ></span>
                {surgeActive ? 'Surge Active' : 'Surge Off'}
              </button>
            </div>

            {/* Active Surge Alert Box */}
            <div className="bg-[#0a0e16] p-4 rounded-xl border border-[#25a475]/40 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#68dba9] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-ping"></span>
                  SOUTH DELHI HUB ACTIVE
                </span>
                <span className="bg-[#25a475] text-[#00311f] text-xs font-mono font-bold px-2 py-0.5 rounded">
                  1.25x
                </span>
              </div>
              <p className="text-xs text-[#bccac0] leading-relaxed">
                Triggered by monsoon downpour in Select CITYWALK. 22 free chauffeurs currently in
                zone.
              </p>
              <div className="flex items-center justify-between text-[11px] font-mono text-[#bccac0] pt-1">
                <span>Automatic decay in: 18m</span>
                <button
                  type="button"
                  onClick={() => showAlert('Manual Surge Override initiated for South Delhi Hub.')}
                  className="text-[#68dba9] hover:underline font-bold"
                >
                  Manual Override
                </button>
              </div>
            </div>

            {/* Other Corridor Surge Cards */}
            <div className="flex flex-col gap-2.5">
              <div className="bg-[#0a0e16] p-3 rounded-lg border border-[#262a33] flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono text-[#dfe2ee] font-bold block">
                    Gurugram Cyber Hub Corridor
                  </span>
                  <span className="text-[10px] font-mono text-[#bccac0]">
                    Peak corporate travel hours
                  </span>
                </div>
                <span className="bg-[#262a33] text-[#68dba9] font-mono text-xs font-bold px-2.5 py-1 rounded">
                  1.40x Surge
                </span>
              </div>

              <div className="bg-[#0a0e16] p-3 rounded-lg border border-[#262a33] flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono text-[#dfe2ee] font-bold block">
                    Noida Expressway Corridor
                  </span>
                  <span className="text-[10px] font-mono text-[#bccac0]">Moderate flow</span>
                </div>
                <span className="bg-[#262a33] text-[#68dba9] font-mono text-xs font-bold px-2.5 py-1 rounded">
                  1.10x Surge
                </span>
              </div>

              <div className="bg-[#0a0e16] p-3 rounded-lg border border-[#262a33] flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono text-[#dfe2ee] font-bold block">
                    IGI Airport T1/T3 Corridor
                  </span>
                  <span className="text-[10px] font-mono text-[#bccac0]">High red-eye demand</span>
                </div>
                <span className="bg-[#262a33] text-[#68dba9] font-mono text-xs font-bold px-2.5 py-1 rounded">
                  1.35x Surge
                </span>
              </div>
            </div>

            {/* CAN-BUS Injection Latency Box */}
            <div className="mt-auto bg-[#0a0e16] p-3 rounded-xl border border-[#262a33] flex items-center justify-between text-[11px] font-mono text-[#bccac0]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#68dba9]"></span>
                <span>CAN-BUS Latency 14ms</span>
              </div>
              <span>API PACKET LOSS 0.002%</span>
              <span className="text-[#68dba9] font-bold">100% SLA</span>
            </div>
          </div>
        </div>

        {/* Live Operations Dispatch Log Table Section */}
        <div className="bg-[#181c24] rounded-2xl border border-[#262a33] p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#68dba9] text-2xl">local_taxi</span>
              <div>
                <h3 className="font-bold font-display text-lg text-[#dfe2ee]">
                  Live Operations Dispatch Log
                </h3>
                <p className="text-xs text-[#bccac0]">
                  Sub-second real-time state transition stream
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search trip, driver, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#0a0e16] border border-[#262a33] rounded-lg px-3 py-1.5 text-xs text-[#dfe2ee] placeholder-[#bccac0] focus:outline-none focus:border-[#68dba9]"
              />
              <button
                type="button"
                onClick={() => showAlert('Instant Chauffeur Dispatch interface launched.')}
                className="px-4 py-2 bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-bold font-mono text-xs rounded-xl shadow transition-colors shrink-0"
              >
                + Instant Chauffeur Dispatch
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono text-[#dfe2ee]">
              <thead className="bg-[#0a0e16] text-[#bccac0] uppercase text-[10px] tracking-wider border-b border-[#262a33]">
                <tr>
                  <th className="px-4 py-3">Booking ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Assigned Chauffeur</th>
                  <th className="px-4 py-3">Fleet Model</th>
                  <th className="px-4 py-3">Active Route</th>
                  <th className="px-4 py-3">Live Status</th>
                  <th className="px-4 py-3">Fare Est.</th>
                  <th className="px-4 py-3">Safety Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262a33]">
                {/* Row 1: SOS Alert */}
                <tr className="bg-[#93000a]/10 hover:bg-[#93000a]/20 transition-colors border-l-4 border-l-red-500">
                  <td className="px-4 py-3">
                    <span className="font-bold text-[#ffb4ab]">BK-7091-956</span>
                    <span className="block text-[9px] text-[#bccac0]">Corporate Fleet</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-[#dfe2ee]">Rajiv Malhotra</span>
                    <span className="block text-[10px] text-[#bccac0]">+91 98110 44210</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#ffb4ab] animate-ping"></span>
                      <span className="font-bold text-[#dfe2ee]">Devendra Rawat</span>
                    </div>
                    <span className="block text-[10px] text-[#bccac0]">DL-12A-4400</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[#dfe2ee]">Toyota Innova Crysta</span>
                    <span className="block text-[9px] text-[#68dba9]">Executive SUV</span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px] truncate">
                    <span>CP Outer Ring &rarr; Aerocity Terminal T3</span>
                    <span className="block text-[9px] text-[#ffb4ab]">Deviated Route</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-[#93000a] text-[#ffdad6] font-bold px-2 py-0.5 rounded text-[10px] animate-pulse">
                      SOS Alerted
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-[#dfe2ee]">₹1,880</td>
                  <td className="px-4 py-3 text-[#ffb4ab] font-bold">Code Red Ops</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => showAlert('Opening Telematics HUD for BK-7091-956')}
                        className="px-2.5 py-1 bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] rounded text-[11px]"
                      >
                        Telematics HUD
                      </button>
                      <button
                        type="button"
                        onClick={() => showAlert('POLICE DISPATCH INITIATED FOR BK-7091-956')}
                        className="px-2.5 py-1 bg-[#93000a] hover:bg-[#690005] text-[#ffdad6] font-bold rounded text-[11px]"
                      >
                        Dispatch Police
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Row 2: Normal Active Trip */}
                <tr className="hover:bg-[#262a33]/40 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-bold text-[#dfe2ee]">BK-6041</span>
                    <span className="block text-[9px] text-[#bccac0]">Corporate Fleet</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-[#dfe2ee]">Kavita Singhania</span>
                    <span className="block text-[10px] text-[#bccac0]">+91 99820 11920</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-[#dfe2ee]">Harpreet Singh</span>
                    <span className="block text-[10px] text-[#bccac0]">DL-01B-8901</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[#dfe2ee]">Mercedes-Benz C200</span>
                    <span className="block text-[9px] text-[#68dba9]">VIP First Class</span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px] truncate">
                    <span>Golf Links &rarr; Cyber City DLF Ph 2</span>
                    <span className="block text-[9px] text-[#68dba9]">ETA: 24 min (Smooth)</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-[#00311f] text-[#68dba9] font-bold px-2 py-0.5 rounded text-[10px]">
                      On Trip (48 km/h)
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-[#dfe2ee]">₹3,420</td>
                  <td className="px-4 py-3 text-[#68dba9]">Sensors Normal</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => showAlert('Inspecting telematics for BK-6041')}
                        className="px-2.5 py-1 bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] rounded text-[11px]"
                      >
                        Inspect
                      </button>
                      <button
                        type="button"
                        onClick={() => showAlert('Reassignment panel opened for BK-6041')}
                        className="px-2.5 py-1 bg-[#262a33] hover:bg-[#353942] text-[#b4c5ff] rounded text-[11px]"
                      >
                        Reassign
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Row 3: En Route */}
                <tr className="hover:bg-[#262a33]/40 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-bold text-[#dfe2ee]">BK-6042</span>
                    <span className="block text-[9px] text-[#bccac0]">Private Chauffeur</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-[#dfe2ee]">Aditya Birla Ops</span>
                    <span className="block text-[10px] text-[#bccac0]">+91 97118 90123</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-[#dfe2ee]">Manish Sharma</span>
                    <span className="block text-[10px] text-[#bccac0]">DL-100-1122</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[#dfe2ee]">Skoda Superb L&amp;K</span>
                    <span className="block text-[9px] text-[#bccac0]">Business Sedan</span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px] truncate">
                    <span>South Ext II &rarr; Hyatt Regency</span>
                    <span className="block text-[9px] text-[#b4c5ff]">Pickup in 4 mins</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-[#262a33] text-[#b4c5ff] font-bold px-2 py-0.5 rounded text-[10px]">
                      En Route
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-[#dfe2ee]">₹1,450</td>
                  <td className="px-4 py-3 text-[#68dba9]">Passcode Cleared</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => showAlert('Inspecting BK-6042')}
                        className="px-2.5 py-1 bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] rounded text-[11px]"
                      >
                        Inspect
                      </button>
                      <button
                        type="button"
                        onClick={() => showAlert('Override executed for BK-6042')}
                        className="px-2.5 py-1 bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] rounded text-[11px]"
                      >
                        Override
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Row 4: Searching Driver */}
                <tr className="hover:bg-[#262a33]/40 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-bold text-[#dfe2ee]">BK-6043</span>
                    <span className="block text-[9px] text-[#bccac0]">On-Demand</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-[#dfe2ee]">Vikram Mehta</span>
                    <span className="block text-[10px] text-[#bccac0]">+91 99890 88701</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-[#68dba9] animate-pulse">Broadcasting...</span>
                    <span className="block text-[10px] text-[#bccac0]">to 5 nearby drivers</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[#dfe2ee]">Toyota Camry Hybrid</span>
                    <span className="block text-[9px] text-[#bccac0]">EV Hybrid</span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px] truncate">
                    <span>Vasant Vihar &rarr; Noida Sec-62</span>
                    <span className="block text-[9px] text-[#68dba9]">Surge 1.25x applied</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-[#262a33] text-[#dfe2ee] font-bold px-2 py-0.5 rounded text-[10px]">
                      Searching (42s)
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-[#dfe2ee]">₹2,100</td>
                  <td className="px-4 py-3 text-[#bccac0]">Radar Ping</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        showAlert('Force Assign triggered for BK-6043. Chauffeur assigned.')
                      }
                      className="px-3 py-1 bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] font-bold rounded text-[11px] transition-colors"
                    >
                      Force Assign
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Driver Partner KYC & Verification Pipeline */}
        <div className="bg-[#181c24] rounded-2xl border border-[#262a33] p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#68dba9] text-2xl">verified</span>
              <div>
                <h3 className="font-bold font-display text-lg text-[#dfe2ee]">
                  Driver Partner KYC &amp; Verification Pipeline
                </h3>
                <p className="text-xs text-[#bccac0]">
                  Automated OCR cross-referenced with Ministry of Road Transport &amp; CCTNS crime
                  database
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="bg-[#0a0e16] text-[#68dba9] font-mono text-xs font-bold px-3 py-1 rounded-lg border border-[#262a33]">
                3 Pending in Queue
              </span>
              <button
                type="button"
                onClick={() => showAlert('Batch Approval Rules executed.')}
                className="px-3 py-1.5 bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] font-mono text-xs font-bold rounded-lg transition-colors"
              >
                Batch Approval Rules
              </button>
            </div>
          </div>

          {/* 3 Driver Applicant Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Driver 1: Suresh Babu */}
            <div className="bg-[#0a0e16] p-4 rounded-xl border border-[#262a33] flex flex-col gap-3 justify-between">
              <div className="flex items-start gap-3">
                <Image
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDc1I-Euw-zX80B-am8pKRl33-EkusXLl7gDj3GMaxX0rk9xEF_qrMGo3RiagzsJzPCqSDAa61RNPrbs-mZueUF4Ve0qdmrfl0AwmpTaSUhd_fATWZZEtDaHUbAoROgIwTVKyucbn2ZslIRKjvOIsqmjXJFEFOTsgFL8FvAgskn8brUxRITtf85zm5oDl7GEaWGDniDROU6uwts8jWuWTwOy06SsUA1Sieb60vghqxjTIl6Y2whzJxqvQ"
                  alt="Suresh Babu portrait"
                  width={48}
                  height={48}
                  unoptimized
                  className="w-12 h-12 rounded-lg object-cover border border-[#262a33]"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-[#dfe2ee] text-sm">Suresh Babu</h4>
                    <span className="bg-[#00311f] text-[#68dba9] text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase">
                      Tier 1 Elite
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#bccac0]">DL: DL-042019003801</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs font-mono text-[#bccac0] bg-[#181c24] p-3 rounded-lg border border-[#262a33]">
                <div className="flex justify-between">
                  <span>Driving License OCR:</span>
                  <span className="text-[#68dba9] font-bold">99.2% Match</span>
                </div>
                <div className="flex justify-between">
                  <span>Police Clearance (PCC):</span>
                  <span className="text-[#68dba9] font-bold">Verified</span>
                </div>
                <div className="flex justify-between">
                  <span>CCTNS Criminal Check:</span>
                  <span className="text-[#68dba9] font-bold">Clean Record</span>
                </div>
                <div className="flex justify-between">
                  <span>Aadhaar Bio-Auth:</span>
                  <span className="text-[#68dba9] font-bold">UIDAI Matched</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => showAlert('Suresh Babu APPROVED as Chauffeur.')}
                  className="flex-1 py-1.5 bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-mono text-xs font-bold rounded-lg transition-colors text-center"
                >
                  Approve Partner
                </button>
                <button
                  type="button"
                  onClick={() => showAlert('Re-upload requested for Suresh Babu.')}
                  className="px-3 py-1.5 bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] font-mono text-xs rounded-lg transition-colors"
                >
                  Request Re-upload
                </button>
              </div>
            </div>

            {/* Driver 2: Mohd. Tanveer */}
            <div className="bg-[#0a0e16] p-4 rounded-xl border border-[#262a33] flex flex-col gap-3 justify-between">
              <div className="flex items-start gap-3">
                <Image
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDC6PVqsA7FJz9_L50-rPgUd8p5vLWp1HzeL-6VD2DFKMNfVl8bc1Khc5f0VIjjZL0Kq5dr0EnmE1FiGnZ4uRwpWP1b2MCPQ3mytrzKF195vS5wj1p7zIT4dngfZoo77PGLW-_7bqktfZTnPTT6dWf0wcYj6D5XHvkKaGL353d2GeuNrg_faOszLPGrxKFgJ9ZzZ0ItTdAHVkiS3ZSswIsn-WIxXfGDLTS-T2AxjhFLF5BMz2u0aWfC5w"
                  alt="Mohd Tanveer portrait"
                  width={48}
                  height={48}
                  unoptimized
                  className="w-12 h-12 rounded-lg object-cover border border-[#262a33]"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-[#dfe2ee] text-sm">Mohd. Tanveer</h4>
                    <span className="bg-[#262a33] text-[#dfe2ee] text-[9px] font-mono px-1.5 py-0.2 rounded uppercase">
                      Executive Sedan
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#bccac0]">DL: HR-262010009122</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs font-mono text-[#bccac0] bg-[#181c24] p-3 rounded-lg border border-[#262a33]">
                <div className="flex justify-between">
                  <span>Driving License OCR:</span>
                  <span className="text-[#68dba9] font-bold">84.8% Match</span>
                </div>
                <div className="flex justify-between">
                  <span>Police Clearance (PCC):</span>
                  <span className="text-[#dfe2ee]">Uploaded (Autograb)</span>
                </div>
                <div className="flex justify-between">
                  <span>CCTNS Criminal Check:</span>
                  <span className="text-[#68dba9] font-bold">Clean Record</span>
                </div>
                <div className="flex justify-between">
                  <span>Eye Screening Certificate:</span>
                  <span className="text-[#dfe2ee]">6/6 Vision (Ok)</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => showAlert('Mohd. Tanveer APPROVED as Chauffeur.')}
                  className="flex-1 py-1.5 bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-mono text-xs font-bold rounded-lg transition-colors text-center"
                >
                  Approve Partner
                </button>
                <button
                  type="button"
                  onClick={() => showAlert('Re-upload requested for Mohd. Tanveer.')}
                  className="px-3 py-1.5 bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] font-mono text-xs rounded-lg transition-colors"
                >
                  Request Re-upload
                </button>
              </div>
            </div>

            {/* Driver 3: Deepak Verma (Flagged) */}
            <div className="bg-[#0a0e16] p-4 rounded-xl border border-[#93000a]/50 flex flex-col gap-3 justify-between bg-red-950/10">
              <div className="flex items-start gap-3">
                <Image
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA3Y6wiEUNlIW9jDDgpdcxFiFB2qsOjbOT9N-WQop_8IG1fbmwgPK5eKyA_amUmVQBtz8t8uMZuCrPt4a7Pi7aoKKFtg8aN0NjicOsLWevJRubZgUJ9bS5irANenEPQbmn1ZswNyaYLpyl8JZyR7LFjhT0ZsMhEMdpP50olENA397a4DWuuk_DKNQXPaNFfm0NZup_qxCCakpT6xKIb-mmp37lzKsnc96PM0hDRfiA5k6FO1dNFuWlm4g"
                  alt="Deepak Verma portrait"
                  width={48}
                  height={48}
                  unoptimized
                  className="w-12 h-12 rounded-lg object-cover border border-red-500/40"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-[#dfe2ee] text-sm">Deepak Verma</h4>
                    <span className="bg-[#93000a] text-[#ffdad6] text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase">
                      Flagged OCR
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#bccac0]">DL: UP-142017001194</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs font-mono text-[#bccac0] bg-[#181c24] p-3 rounded-lg border border-red-900/40">
                <div className="flex justify-between">
                  <span>Driving License OCR:</span>
                  <span className="text-[#ffb4ab] font-bold">31.4% Blur Detected</span>
                </div>
                <div className="flex justify-between">
                  <span>Police Clearance (PCC):</span>
                  <span className="text-[#ffb4ab] font-bold">Expired 22 Days Ago</span>
                </div>
                <div className="flex justify-between">
                  <span>CCTNS Criminal Check:</span>
                  <span className="text-[#68dba9]">Clean</span>
                </div>
                <div className="flex justify-between">
                  <span>Vehicle Commercial Permit:</span>
                  <span className="text-[#ffb4ab]">Pending State RC</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => showAlert('Deepak Verma APPROVED manually.')}
                  className="px-3 py-1.5 bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] font-mono text-xs rounded-lg transition-colors"
                >
                  Approve Partner
                </button>
                <button
                  type="button"
                  onClick={() =>
                    showAlert('Deepak Verma application REJECTED & applicant notified.')
                  }
                  className="flex-1 py-1.5 bg-[#93000a] hover:bg-[#690005] text-[#ffdad6] font-mono text-xs font-bold rounded-lg transition-colors text-center"
                >
                  Reject &amp; Notify
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom 3 Rail Cards: Settlement Rails, Platform Take-Rate Control, Priority Disputes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Settlement Rails */}
          <div className="bg-[#181c24] rounded-2xl border border-[#262a33] p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#68dba9] text-xl">
                  account_balance
                </span>
                <h3 className="font-bold font-display text-base text-[#dfe2ee]">
                  Settlement Rails
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#68dba9] bg-[#00311f] px-2 py-0.5 rounded font-bold">
                Host PayX Connected
              </span>
            </div>

            <p className="text-xs text-[#bccac0]">
              Automated T+0 batch payouts scheduled for 00:00 midnight to 894 active bank accounts.
            </p>

            <div className="space-y-2 font-mono text-xs bg-[#0a0e16] p-3 rounded-xl border border-[#262a33]">
              <div className="flex justify-between items-center">
                <span className="text-[#bccac0]">PAYOUT QUEUE TOTAL</span>
                <span className="font-bold text-[#dfe2ee]">₹2.84M</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#bccac0]">INSTANT CHAUFFEUR WITHDRAWALS</span>
                <span className="font-bold text-[#68dba9]">₹412,800</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#bccac0]">FAILED / RETRY WEBHOOKS</span>
                <span className="font-bold text-[#68dba9]">0 Failures</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => showAlert('Manual Batch Payout Run triggered for ₹2.84M.')}
              className="mt-auto py-2 px-4 bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] font-mono text-xs font-bold rounded-xl transition-colors text-center border border-[#3d4a42]"
            >
              Trigger Manual Batch Payout Run
            </button>
          </div>

          {/* Card 2: Platform Take-Rate Control */}
          <div className="bg-[#181c24] rounded-2xl border border-[#262a33] p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#68dba9] text-xl">tune</span>
                <h3 className="font-bold font-display text-base text-[#dfe2ee]">
                  Platform Take-Rate Control
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#bccac0]">Policy: Dynamic</span>
            </div>

            <p className="text-xs text-[#bccac0]">
              Global baseline commission applied across all customer booking types and vehicle
              tiers.
            </p>

            <div className="flex flex-col gap-2 bg-[#0a0e16] p-3 rounded-xl border border-[#262a33]">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-[#bccac0]">GLOBAL BASE COMMISSION</span>
                <span className="text-[#68dba9] font-bold text-sm">{takeRate}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="30"
                step="0.5"
                value={takeRate}
                onChange={(e) => setTakeRate(parseFloat(e.target.value))}
                className="w-full accent-[#68dba9] cursor-pointer h-1.5 bg-[#262a33] rounded-lg"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#bccac0]">
                <span>Min 10.0%</span>
                <span>Rec. 18.5%</span>
                <span>Max Cap 30.0%</span>
              </div>
            </div>

            <div className="space-y-1 text-xs font-mono text-[#bccac0]">
              <div className="flex justify-between">
                <span>Projected Monthly Platform Net:</span>
                <span className="text-[#68dba9] font-bold">₹3.40M</span>
              </div>
              <div className="flex justify-between">
                <span>Partner Chauffeur Retention:</span>
                <span className="text-[#dfe2ee] font-bold">{(100 - takeRate).toFixed(1)}%</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => showAlert(`Take-Rate updated to ${takeRate}% across platform.`)}
              className="mt-auto py-2 px-4 bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-mono text-xs font-bold rounded-xl transition-colors text-center shadow"
            >
              Save Rate Matrix
            </button>
          </div>

          {/* Card 3: Priority Disputes */}
          <div className="bg-[#181c24] rounded-2xl border border-[#262a33] p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ffb4ab] text-xl">gavel</span>
                <h3 className="font-bold font-display text-base text-[#dfe2ee]">
                  Priority Disputes
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#ffb4ab] bg-[#93000a]/40 px-2 py-0.5 rounded font-bold border border-red-500/30">
                2 SLA Overdue
              </span>
            </div>

            <p className="text-xs text-[#bccac0]">
              High-priority customer and driver payment arbitration queue with audio recording logs.
            </p>

            <div className="flex flex-col gap-2 font-mono text-xs">
              <div className="bg-[#0a0e16] p-3 rounded-lg border border-[#262a33] flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-[#dfe2ee] font-bold">DIS-8012 - Toll Dispute</span>
                  <span className="text-[10px] text-[#bccac0]">4m ago</span>
                </div>
                <p className="text-[11px] text-[#bccac0] line-clamp-1">
                  Customer billed ₹320 for Bandra-Worli Sea Link toll not taken...
                </p>
                <div className="flex justify-between items-center pt-1 text-[10px]">
                  <span className="text-[#68dba9]">Refund Eligible: ₹320</span>
                  <button
                    type="button"
                    onClick={() => showAlert('₹320 refunded to customer for DIS-8012.')}
                    className="text-[#68dba9] hover:underline font-bold"
                  >
                    Auto-Credit Customer
                  </button>
                </div>
              </div>

              <div className="bg-[#0a0e16] p-3 rounded-lg border border-[#262a33] flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-[#dfe2ee] font-bold">DIS-8803 - Cancellation Fee</span>
                  <span className="text-[10px] text-[#bccac0]">16m ago</span>
                </div>
                <p className="text-[11px] text-[#bccac0] line-clamp-1">
                  Chauffeur waited 14 mins at Aerocity T3 before customer cancelled...
                </p>
                <div className="flex justify-between items-center pt-1 text-[10px]">
                  <span className="text-[#b4c5ff]">Driver Claim: ₹250</span>
                  <button
                    type="button"
                    onClick={() =>
                      showAlert('₹250 cancellation fee released to chauffeur for DIS-8803.')
                    }
                    className="text-[#b4c5ff] hover:underline font-bold"
                  >
                    Release to Chauffeur
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => showAlert('Opening Full Arbitration Console...')}
              className="mt-auto py-2 px-4 bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] font-mono text-xs font-bold rounded-xl transition-colors text-center border border-[#3d4a42]"
            >
              Open Full Arbitration Console
            </button>
          </div>
        </div>
      </div>
    </ControlStationLayout>
  );
}

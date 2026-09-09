'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';

export default function LiveFleetRadarPage() {
  const [selectedZone, setSelectedZone] = useState<'DELHI' | 'MUMBAI' | 'BLR'>('DELHI');
  const [searchQuery, setSearchQuery] = useState('PILOT-921');
  const [filterAvailable, setFilterAvailable] = useState(true);
  const [filterInFlight, setFilterInFlight] = useState(true);
  const [filterSurge, setFilterSurge] = useState(true);
  const [filterSOS, setFilterSOS] = useState(true);
  const [filterFASTag, setFilterFASTag] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  return (
    <AdminLayout activePath="live-fleet-radar">
      <div className="flex flex-col w-full gap-4">
        {/* Toast Notification Banner */}
        {notificationMsg && (
          <div className="fixed top-20 right-8 z-50 bg-[#25a475] text-[#00311f] px-4 py-3 rounded-lg shadow-2xl font-semibold text-sm flex items-center gap-2 border border-[#68dba9]">
            <span className="material-symbols-outlined">check_circle</span>
            <span>{notificationMsg}</span>
          </div>
        )}

        {/* TOP SYSTEM & RADAR CONTROLS */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-[#0a0e16] p-3 rounded-xl border border-[#262a33]">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Zone Selector */}
            <div className="flex items-center bg-[#181c24] p-1 rounded-lg border border-[#262a33]">
              <button
                onClick={() => setSelectedZone('DELHI')}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                  selectedZone === 'DELHI'
                    ? 'bg-[#25a475] text-[#00311f]'
                    : 'text-[#87948b] hover:text-[#dfe2ee]'
                }`}
              >
                DELHI NCR [ZONE-01]
              </button>
              <button
                onClick={() => setSelectedZone('MUMBAI')}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                  selectedZone === 'MUMBAI'
                    ? 'bg-[#25a475] text-[#00311f]'
                    : 'text-[#87948b] hover:text-[#dfe2ee]'
                }`}
              >
                MUMBAI MMR [ZONE-02]
              </button>
              <button
                onClick={() => setSelectedZone('BLR')}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                  selectedZone === 'BLR'
                    ? 'bg-[#25a475] text-[#00311f]'
                    : 'text-[#87948b] hover:text-[#dfe2ee]'
                }`}
              >
                BLR TECH CORRIDOR
              </button>
            </div>

            {/* GNSS Lock Status Pill */}
            <div className="px-3 py-1.5 rounded-lg bg-[#181c24] border border-[#262a33] flex items-center gap-2 font-mono text-xs text-[#bccac0]">
              <span className="material-symbols-outlined text-[#68dba9] text-[16px]">
                satellite_alt
              </span>
              <span>L1/L5 RTK-GNSS:</span>
              <span className="text-[#68dba9] font-bold">LOCKED (±0.04m)</span>
            </div>

            <div className="px-3 py-1.5 rounded-lg bg-[#181c24] border border-[#262a33] flex items-center gap-2 font-mono text-xs text-[#bccac0]">
              <span className="material-symbols-outlined text-[#b4c5ff] text-[16px]">memory</span>
              <span>TELEMATICS IOPS:</span>
              <span className="text-[#b4c5ff] font-bold">18,490/sec</span>
            </div>
          </div>

          {/* Radar Search bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Call-sign or Pilot ID..."
                className="w-full h-9 pl-8 pr-3 rounded-lg bg-[#181c24] border border-[#262a33] font-mono text-xs text-[#dfe2ee] placeholder:text-[#87948b] focus:outline-none focus:border-[#68dba9]"
              />
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[#87948b] text-[16px]">
                search
              </span>
            </div>
            <button
              onClick={() => showNotification('Carrier radar calibration refreshed')}
              className="p-2 rounded-lg bg-[#181c24] hover:bg-[#262a33] border border-[#262a33] text-[#68dba9]"
            >
              <span className="material-symbols-outlined text-[18px]">sync</span>
            </button>
          </div>
        </div>

        {/* METRIC TOGGLE STRIP */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setFilterAvailable(!filterAvailable)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs border transition-all ${
              filterAvailable
                ? 'bg-[#25a475]/20 text-[#68dba9] border-[#25a475]'
                : 'bg-[#181c24] text-[#87948b] border-[#262a33]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">check_box</span>
            <span>AVAILABLE PILOTS</span>
            <span className="font-bold">1,420</span>
          </button>

          <button
            onClick={() => setFilterInFlight(!filterInFlight)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs border transition-all ${
              filterInFlight
                ? 'bg-[#0053db]/20 text-[#b4c5ff] border-[#0053db]'
                : 'bg-[#181c24] text-[#87948b] border-[#262a33]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">check_box</span>
            <span>IN-FLIGHT RIDES</span>
            <span className="font-bold">184</span>
          </button>

          <button
            onClick={() => setFilterSurge(!filterSurge)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs border transition-all ${
              filterSurge
                ? 'bg-[#25a475]/20 text-[#68dba9] border-[#25a475]'
                : 'bg-[#181c24] text-[#87948b] border-[#262a33]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">check_box</span>
            <span>SURGE CORRIDORS</span>
            <span className="font-bold">4 Zns</span>
          </button>

          <button
            onClick={() => setFilterSOS(!filterSOS)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs border transition-all ${
              filterSOS
                ? 'bg-[#93000a]/20 text-[#ffb4ab] border-[#93000a]'
                : 'bg-[#181c24] text-[#87948b] border-[#262a33]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">check_box</span>
            <span>SOS / ANOMALY</span>
            <span className="font-bold">1 ESC</span>
          </button>

          <button
            onClick={() => setFilterFASTag(!filterFASTag)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs border transition-all ${
              filterFASTag
                ? 'bg-[#25a475]/20 text-[#68dba9] border-[#25a475]'
                : 'bg-[#181c24] text-[#87948b] border-[#262a33]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">check_box</span>
            <span>FASTAG PORTALS</span>
            <span className="font-bold">12 Sync</span>
          </button>
        </div>

        {/* MAIN RADAR VIEWPORT & DOSSIER GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* RADAR MAP CONTAINER (8 Cols) */}
          <div className="xl:col-span-8 bg-[#0a0e16] rounded-xl border border-[#262a33] p-4 flex flex-col justify-between relative min-h-[580px] shadow-2xl overflow-hidden">
            {/* Top Telemetry Bar */}
            <div className="flex items-center justify-between z-10 bg-[#0a0e16]/80 backdrop-blur-md p-2.5 rounded-lg border border-[#262a33] font-mono text-xs text-[#bccac0]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-ping" />
                <span className="font-bold text-[#dfe2ee]">RADAR SWEEP: 2.4 GHz CARRIER</span>
              </div>
              <div className="hidden sm:block">LAT: 28.5562° N • LON: 77.1000° E</div>
            </div>

            {/* Simulated Vector Radar Map Graphic with Animated Radar Sweep Line */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
              {/* Concentric Circles */}
              <div className="w-[500px] h-[500px] rounded-full border border-[#25a475]/30 relative flex items-center justify-center">
                <div className="w-[360px] h-[360px] rounded-full border border-[#25a475]/40 flex items-center justify-center">
                  <div className="w-[220px] h-[220px] rounded-full border border-[#25a475]/50 flex items-center justify-center">
                    <div className="w-[100px] h-[100px] rounded-full border border-[#25a475]/60" />
                  </div>
                </div>
                {/* Radar Sweep Line */}
                <div className="absolute inset-0 rounded-full animate-[spin_8s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,rgba(104,219,169,0.25)_360deg)]" />
              </div>
            </div>

            {/* Visual Geofence Zones & Vehicle Pins */}
            <div className="relative z-10 flex-1 my-6 flex flex-col justify-between">
              {/* Geofence Overlay 1: Aerocity */}
              <div className="absolute top-1/4 right-1/4 bg-[#25a475]/10 border border-[#68dba9]/40 p-3 rounded-xl backdrop-blur-sm shadow-xl">
                <div className="text-[10px] font-mono font-bold text-[#68dba9] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">local_airport</span>
                  AEROCITY T3 INTL
                </div>
                <div className="text-xs font-mono text-[#dfe2ee]">328 ACTIVE CARS</div>
              </div>

              {/* Geofence Overlay 2: Cyberhub */}
              <div className="absolute bottom-1/4 left-1/3 bg-[#0053db]/10 border border-[#b4c5ff]/40 p-3 rounded-xl backdrop-blur-sm shadow-xl">
                <div className="text-[10px] font-mono font-bold text-[#b4c5ff] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">apartment</span>
                  GURUGRAM CYBERHUB
                </div>
                <div className="text-xs font-mono text-[#dfe2ee]">412 ACTIVE CARS</div>
              </div>

              {/* Target Marker: PILOT-921 */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#25a475] text-[#00311f] px-3 py-1.5 rounded-lg shadow-[0_0_20px_rgba(104,219,169,0.8)] font-mono text-xs font-bold flex items-center gap-2 border border-[#68dba9]">
                <span className="material-symbols-outlined text-[16px] animate-bounce">
                  directions_car
                </span>
                <span>PILOT-921 • 46 KM/H</span>
              </div>

              {/* FASTag Marker */}
              <div className="absolute bottom-1/3 right-1/3 bg-[#181c24] border border-[#262a33] text-[#68dba9] px-2.5 py-1 rounded font-mono text-[10px] flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">toll</span>
                <span>FASTAG TOLL: RAO TULA RAM</span>
              </div>
            </div>

            {/* Map Control Buttons */}
            <div className="absolute top-16 right-6 flex flex-col gap-1 z-20">
              <button className="w-8 h-8 rounded bg-[#181c24] border border-[#262a33] text-[#dfe2ee] font-bold hover:bg-[#262a33]">
                +
              </button>
              <button className="w-8 h-8 rounded bg-[#181c24] border border-[#262a33] text-[#dfe2ee] font-bold hover:bg-[#262a33]">
                -
              </button>
              <button className="w-8 h-8 rounded bg-[#181c24] border border-[#262a33] text-[#68dba9] font-bold hover:bg-[#262a33]">
                <span className="material-symbols-outlined text-[16px]">center_focus_strong</span>
              </button>
            </div>

            {/* Legend & Telemetry Bar */}
            <div className="flex items-center justify-between z-10 bg-[#0a0e16]/90 backdrop-blur-md p-2.5 rounded-lg border border-[#262a33] font-mono text-[11px] text-[#bccac0]">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#68dba9]" /> Available
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#b4c5ff]" /> Active Ride
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#eab308]" /> Standby
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#ffb4ab]" /> SOS
                </span>
              </div>
              <div>VECTOR MAP BUILD: v4.8.19-DELHI • FEED 60FPS</div>
            </div>
          </div>

          {/* PILOT DOSSIER PANEL (4 Cols) */}
          <div className="xl:col-span-4 bg-[#0a0e16] rounded-xl border border-[#262a33] p-5 shadow-2xl flex flex-col justify-between gap-4">
            <div>
              {/* Header Profile Header */}
              <div className="flex items-start justify-between border-b border-[#262a33] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#25a475]/20 border border-[#68dba9] flex items-center justify-center font-bold text-lg text-[#68dba9] font-['Space_Grotesk']">
                    VS
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                        Capt. Vikram S.
                      </h3>
                      <span className="material-symbols-outlined text-[16px] text-[#68dba9]">
                        verified
                      </span>
                    </div>
                    <div className="text-xs font-mono text-[#87948b]">
                      DL-04201800921 • Vetting Level 4
                    </div>
                    <div className="text-xs font-mono text-[#68dba9] font-bold mt-0.5">
                      ★ 4.98 (2,410 VVIP Trips)
                    </div>
                  </div>
                </div>
                <span className="bg-[#0053db]/20 text-[#b4c5ff] border border-[#0053db] font-mono text-[9px] font-bold px-2 py-0.5 rounded">
                  PILOT 1 IN-FLIGHT
                </span>
              </div>

              {/* Vehicle Info */}
              <div className="py-3 border-b border-[#262a33]">
                <div className="text-[10px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk']">
                  Assigned Asset
                </div>
                <div className="text-sm font-bold text-[#dfe2ee] mt-0.5">BMW 530d M-Sport</div>
                <div className="flex items-center justify-between text-xs font-mono text-[#bccac0] mt-1">
                  <span>Black Sapphire • 2024</span>
                  <span className="text-[#68dba9] font-bold">DL-1C-AA-9901</span>
                </div>
                <div className="text-[10px] font-mono text-[#87948b] mt-0.5">
                  Fastag ID: 48910034
                </div>
              </div>

              {/* Live Telemetry Data */}
              <div className="py-3 border-b border-[#262a33] flex flex-col gap-2">
                <div className="text-[10px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk']">
                  Live Telemetry Telemetry
                </div>
                <div className="bg-[#181c24] p-3 rounded-lg border border-[#262a33] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#68dba9]">speed</span>
                    <span className="text-xs text-[#dfe2ee]">Telemetry Speed</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold font-mono text-[#68dba9]">46</span>
                    <span className="text-xs font-mono text-[#87948b]"> / 50 KM/H LIMIT</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-[#181c24] p-2.5 rounded-lg border border-[#262a33]">
                    <div className="text-[10px] text-[#87948b]">GEOFENCE LOCK</div>
                    <div className="text-sm font-bold text-[#68dba9]">99.8%</div>
                  </div>
                  <div className="bg-[#181c24] p-2.5 rounded-lg border border-[#262a33]">
                    <div className="text-[10px] text-[#87948b]">CABIN TEMP</div>
                    <div className="text-sm font-bold text-[#dfe2ee]">20.5°C</div>
                  </div>
                </div>
              </div>

              {/* Handshake & ETA */}
              <div className="py-3 border-b border-[#262a33] flex items-center justify-between font-mono text-xs">
                <div>
                  <div className="text-[10px] text-[#87948b]">HANDSHAKE PIN</div>
                  <div className="font-bold text-[#68dba9]">PIN: 7842 (Matched)</div>
                  <div className="text-[10px] text-[#bccac0]">Client: Rajesh M. (Chairman)</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[#87948b]">ETA DESTINATION</div>
                  <div className="text-lg font-bold text-[#68dba9]">14 MINS</div>
                  <div className="text-[10px] text-[#bccac0]">Aerocity T3 VIP Bay</div>
                </div>
              </div>

              {/* Audio Telemetry Buffer */}
              <div className="py-3 flex items-center justify-between bg-[#181c24] p-3 rounded-lg border border-[#262a33] mt-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#68dba9] text-[18px]">lock</span>
                  <div>
                    <div className="text-xs font-bold text-[#dfe2ee]">AUDIO TELEMETRY BUFFER</div>
                    <div className="text-[10px] text-[#87948b]">
                      256-Bit Hardware Encrypted Standby
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#25a475]/20 text-[#68dba9] font-mono text-[10px] font-bold border border-[#25a475]">
                  ARMED
                </span>
              </div>
            </div>

            {/* Operator Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#262a33]">
              <button
                onClick={() => showNotification('Force Override engaged for PILOT-921')}
                className="bg-[#181c24] hover:bg-[#262a33] text-[#dfe2ee] font-bold text-xs py-2 px-3 rounded-lg border border-[#262a33] flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px] text-[#ffb4ab]">
                  warning
                </span>{' '}
                Force Override
              </button>
              <button
                onClick={() => showNotification('Encrypted VoIP Session Connected')}
                className="bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] font-bold text-xs py-2 px-3 rounded-lg shadow-md flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">call</span> Encrypted VoIP
              </button>
              <button
                onClick={() => showNotification('Silent cabin check initiated')}
                className="bg-[#181c24] hover:bg-[#262a33] text-[#bccac0] text-xs py-2 px-3 rounded-lg border border-[#262a33] flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">hearing</span> Silent Check
              </button>
              <button
                onClick={() => showNotification('Driver Reassignment Dialog Opened')}
                className="bg-[#181c24] hover:bg-[#262a33] text-[#bccac0] text-xs py-2 px-3 rounded-lg border border-[#262a33] flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">swap_horiz</span> Reassign
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM STATE BUS LIVE PUB/SUB LOG */}
        <div className="bg-[#0a0e16] rounded-xl p-3 border border-[#262a33] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[#68dba9] font-bold bg-[#25a475]/10 px-2 py-1 rounded border border-[#25a475]/30">
              <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-pulse" />
              STATE BUS LIVE
            </span>
            <span className="text-[#87948b]">PUB/SUB v2</span>
            <span className="text-[#dfe2ee] hidden sm:inline">
              14:47:59.201 <span className="text-[#68dba9]">FASTag Auto-Debited:</span> ₹120.00 [Rao
              Tula Ram Portal]
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="px-3 py-1 rounded bg-[#181c24] border border-[#262a33] text-[#bccac0] hover:text-[#dfe2ee]"
            >
              {isPaused ? 'RESUME STREAM' : 'PAUSE STREAM'}
            </button>
            <button
              onClick={() => showNotification('State dump exported to CSV')}
              className="px-3 py-1 rounded bg-[#181c24] border border-[#262a33] text-[#bccac0] hover:text-[#dfe2ee]"
            >
              EXPORT DUMP
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

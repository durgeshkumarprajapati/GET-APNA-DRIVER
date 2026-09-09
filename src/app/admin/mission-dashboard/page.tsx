'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import Link from 'next/link';

export default function MissionDashboardPage() {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'VIP' | 'SEDAN' | 'DEVIATED'>('ALL');
  const [selectedSubTab, setSelectedSubTab] = useState<'SURGE' | 'SPEEDS' | 'DEADHEAD'>('SURGE');
  const [autoSync, setAutoSync] = useState(true);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  const missions = [
    {
      id: 'BK-9482',
      status: 'DEVIATED ROUTE',
      statusColor: 'text-[#ffb4ab] bg-[#93000a]/20 border-[#93000a]',
      passenger: 'Vikramaditya Rao',
      passengerInitials: 'VR',
      passengerTier: 'Aero-Priority Titanium',
      chauffeur: 'Rajesh Kumar',
      chauffeurRating: '4.96 ★ (1,840 trips)',
      vehicle: 'Mercedes-Benz E-Class',
      plate: 'DL-01-EA-8890',
      telemetry: '62 km/h • 3.2km Off Track',
      location: 'Aerocity Corridor NH48',
      fare: '₹4,200',
      takeRate: '₹504 (12%)',
      isAlert: true,
      category: 'DEVIATED',
    },
    {
      id: 'BK-9481',
      status: 'IN TRANSIT',
      statusColor: 'text-[#68dba9] bg-[#25a475]/10 border-[#25a475]/30',
      passenger: 'Shreya Mukherjee',
      passengerInitials: 'SM',
      passengerTier: 'Corporate Executive Pass',
      chauffeur: 'Manpreet Singh',
      chauffeurRating: '4.99 ★ (3,120 trips)',
      vehicle: 'BMW 530d M-Sport',
      plate: 'HR-26-CM-1102',
      telemetry: '54 km/h • On Schedule',
      location: 'Cyber Hub ➔ Chanakyapuri',
      fare: '₹3,850',
      takeRate: '₹462 (12%)',
      isAlert: false,
      category: 'VIP',
    },
    {
      id: 'BK-9480',
      status: 'ARRIVED PICKUP',
      statusColor: 'text-[#b4c5ff] bg-[#0053db]/10 border-[#0053db]/30',
      passenger: 'Anandita Khurana',
      passengerInitials: 'AK',
      passengerTier: 'Private Chauffeur Daily',
      chauffeur: 'Dinesh Verma',
      chauffeurRating: '4.92 ★ (940 trips)',
      vehicle: 'Toyota Camry Hybrid',
      plate: 'DL-03-CC-4009',
      telemetry: '0 km/h • Gate 3 Terminal 3',
      location: 'Grace Period: 03:45 Left',
      fare: '₹2,450',
      takeRate: '₹294 (12%)',
      isAlert: false,
      category: 'SEDAN',
    },
    {
      id: 'BK-9479',
      status: 'SETTLED & DISCHARGED',
      statusColor: 'text-[#bccac0] bg-[#262a33] border-[#3d4a42]',
      passenger: 'Gaurav Taneja',
      passengerInitials: 'GT',
      passengerTier: 'Standard Corporate',
      chauffeur: 'Surender Yadav',
      chauffeurRating: '4.95 ★ (2,450 trips)',
      vehicle: 'Audi A8 Technology',
      plate: 'UP-16-AB-9911',
      telemetry: 'Trip Completed in 48m',
      location: 'Noida Sec-128 ➔ T3',
      fare: '₹3,200',
      takeRate: '₹384 (12%)',
      isAlert: false,
      category: 'SEDAN',
    },
  ];

  const filteredMissions = missions.filter((m) => {
    if (activeFilter === 'VIP') return m.category === 'VIP' || m.passengerTier.includes('Titanium');
    if (activeFilter === 'SEDAN') return m.category === 'SEDAN';
    if (activeFilter === 'DEVIATED') return m.status.includes('DEVIATED');
    return true;
  });

  return (
    <AdminLayout activePath="mission-dashboard">
      <div className="flex flex-col w-full gap-6">
        {/* Toast Notification Banner */}
        {notificationMsg && (
          <div className="fixed top-20 right-8 z-50 bg-[#25a475] text-[#00311f] px-4 py-3 rounded-lg shadow-2xl font-semibold text-sm flex items-center gap-2 border border-[#68dba9]">
            <span className="material-symbols-outlined">check_circle</span>
            <span>{notificationMsg}</span>
          </div>
        )}

        {/* Dynamic Operational Telemetry Ticker */}
        <div className="relative overflow-hidden bg-[#0a0e16] rounded-xl p-3 flex flex-wrap items-center justify-between gap-4 shadow-lg border border-[#262a33]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 bg-[#181c24] px-3 py-1 rounded-lg text-[#68dba9] font-bold text-xs tracking-wider uppercase border border-[#262a33]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#68dba9] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#68dba9]" />
              </span>
              LIVE DISPATCH ENGINE V4.8
            </span>
            <span className="text-[#bccac0] font-mono text-xs flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#68dba9]">
                satellite_alt
              </span>
              GNSS MESH: 99.98% LOCK-ON
            </span>
            <span className="hidden md:inline-block text-[#87948b] font-mono text-xs">•</span>
            <span className="hidden md:inline-flex text-[#bccac0] font-mono text-xs items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#b4c5ff]">memory</span>
              INGEST: 14.8K EVENTS/SEC
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[#87948b] font-mono text-xs hidden sm:inline">
              ZONE: DELHI-NCR MEGA-CORRIDOR
            </span>
            <button
              onClick={() => {
                setAutoSync(!autoSync);
                showNotification(autoSync ? 'Auto-Sync Paused' : 'Auto-Sync Enabled (5s Interval)');
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors border ${
                autoSync
                  ? 'bg-[#25a475]/20 text-[#68dba9] border-[#25a475]'
                  : 'bg-[#181c24] text-[#bccac0] border-[#262a33] hover:bg-[#262a33]'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[14px] ${
                  autoSync ? 'animate-spin' : ''
                }`}
              >
                refresh
              </span>
              <span>{autoSync ? 'Auto-Sync 5s' : 'Paused'}</span>
            </button>
          </div>
        </div>

        {/* SECTION 1: Executive KPI Grid (5 metrics across top) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Metric 1: GBV */}
          <div className="relative bg-[#0a0e16] rounded-xl p-5 flex flex-col justify-between shadow-md border border-[#262a33] group hover:border-[#68dba9]/50 transition-all">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-widest font-['Space_Grotesk']">
                Gross Booking Value
              </span>
              <span className="material-symbols-outlined text-[#68dba9] text-[20px]">
                currency_rupee
              </span>
            </div>
            <div className="my-3">
              <div className="text-2xl font-bold text-[#dfe2ee] tracking-tight font-['Space_Grotesk']">
                ₹42,850,200
              </div>
              <div className="flex items-center gap-1.5 mt-1 font-mono text-xs">
                <span className="inline-flex items-center text-[#68dba9] font-semibold">
                  <span className="material-symbols-outlined text-[14px]">trending_up</span>
                  +18.4%
                </span>
                <span className="text-[#87948b]">WoW Growth</span>
              </div>
            </div>
            <div className="w-full bg-[#181c24] rounded-full h-1 overflow-hidden">
              <div className="bg-[#68dba9] h-full rounded-full" style={{ width: '78%' }} />
            </div>
          </div>

          {/* Metric 2: Active Missions */}
          <div className="relative bg-[#0a0e16] rounded-xl p-5 flex flex-col justify-between shadow-md border border-[#262a33] group hover:border-[#4edea3]/50 transition-all">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-widest font-['Space_Grotesk']">
                Live Missions
              </span>
              <span className="material-symbols-outlined text-[#4edea3] text-[20px]">near_me</span>
            </div>
            <div className="my-3">
              <div className="text-2xl font-bold text-[#dfe2ee] tracking-tight font-['Space_Grotesk'] flex items-center gap-2">
                184 <span className="text-sm font-medium text-[#68dba9]">Live</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 font-mono text-xs">
                <span className="text-[#68dba9] font-semibold">98.2%</span>
                <span className="text-[#87948b]">Punctuality SLA</span>
              </div>
            </div>
            <div className="w-full bg-[#181c24] rounded-full h-1 overflow-hidden">
              <div className="bg-[#00a572] h-full rounded-full" style={{ width: '92%' }} />
            </div>
          </div>

          {/* Metric 3: Fleet Availability */}
          <div className="relative bg-[#0a0e16] rounded-xl p-5 flex flex-col justify-between shadow-md border border-[#262a33] group hover:border-[#b4c5ff]/50 transition-all">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-widest font-['Space_Grotesk']">
                Fleet Telemetry
              </span>
              <span className="material-symbols-outlined text-[#b4c5ff] text-[20px]">
                directions_car
              </span>
            </div>
            <div className="my-3">
              <div className="text-2xl font-bold text-[#dfe2ee] tracking-tight font-['Space_Grotesk']">
                1,420 <span className="text-xs font-mono font-normal text-[#87948b]">Active</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono mt-1">
                <span className="text-[#68dba9]">312 Free</span>
                <span className="text-[#bccac0]">924 Busy</span>
                <span className="text-[#ffb4ab]">184 Rest</span>
              </div>
            </div>
            <div className="flex w-full gap-0.5 h-1 rounded-full overflow-hidden">
              <div className="bg-[#68dba9] h-full" style={{ width: '22%' }} />
              <div className="bg-[#0053db] h-full" style={{ width: '65%' }} />
              <div className="bg-[#31353e] h-full" style={{ width: '13%' }} />
            </div>
          </div>

          {/* Metric 4: Platform Commission */}
          <div className="relative bg-[#0a0e16] rounded-xl p-5 flex flex-col justify-between shadow-md border border-[#262a33] group hover:border-[#85f8c4]/50 transition-all">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-widest font-['Space_Grotesk']">
                Platform Commission
              </span>
              <span className="material-symbols-outlined text-[#85f8c4] text-[20px]">
                account_balance_wallet
              </span>
            </div>
            <div className="my-3">
              <div className="text-2xl font-bold text-[#dfe2ee] tracking-tight font-['Space_Grotesk']">
                ₹5,142,024
              </div>
              <div className="flex items-center gap-1.5 mt-1 font-mono text-xs">
                <span className="text-[#68dba9] font-semibold">12.0%</span>
                <span className="text-[#87948b]">Blended Net Margin</span>
              </div>
            </div>
            <div className="w-full bg-[#181c24] rounded-full h-1 overflow-hidden">
              <div className="bg-[#68dba9] h-full rounded-full" style={{ width: '60%' }} />
            </div>
          </div>

          {/* Metric 5: Critical Action Items */}
          <div className="relative bg-[#0a0e16] rounded-xl p-5 flex flex-col justify-between shadow-md border border-[#262a33] group hover:border-[#ffb4ab]/50 transition-all">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-bold text-[#ffb4ab] uppercase tracking-widest font-['Space_Grotesk']">
                Action Queue
              </span>
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffb4ab] opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#ffb4ab]" />
              </span>
            </div>
            <div className="my-3">
              <div className="text-2xl font-bold text-[#ffb4ab] tracking-tight font-['Space_Grotesk']">
                14 Pending
              </div>
              <div className="flex items-center justify-between text-xs font-mono mt-1 text-[#bccac0]">
                <span>8 KYC</span>
                <span className="text-[#ffb4ab] font-bold">3 SOS</span>
                <span>3 Rails</span>
              </div>
            </div>
            <div className="w-full bg-[#181c24] rounded-full h-1 overflow-hidden">
              <div className="bg-[#93000a] h-full rounded-full" style={{ width: '85%' }} />
            </div>
          </div>
        </section>

        {/* SECTION 2: Action Required Triage Panel (High Priority Command Strip) */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ffb4ab] text-[20px] animate-pulse">
                crisis_alert
              </span>
              <h2 className="text-lg font-bold text-[#dfe2ee] tracking-tight font-['Space_Grotesk']">
                Mission Critical Triage
              </h2>
              <span className="bg-[#93000a] text-[#ffdad6] font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                3 CRITICAL ESCALATIONS
              </span>
            </div>
            <span className="font-mono text-xs text-[#87948b] hidden sm:inline">
              AUTO-ROUTING TO NOC L4 CONTROLLERS
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Card 1: Emergency SOS */}
            <div className="relative bg-[#0a0e16] rounded-xl p-5 shadow-xl border border-[#93000a]/40 overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#93000a] via-[#ffb4ab] to-transparent" />
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#93000a]/20 text-[#ffb4ab] font-bold text-[10px] tracking-wider uppercase">
                    <span className="material-symbols-outlined text-[14px]">warning</span> EMERGENCY
                    SOS
                  </span>
                  <span className="font-mono text-xs text-[#87948b]">Trip #BK-9482</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#dfe2ee] leading-tight font-['Space_Grotesk']">
                    Deviated Route Corridor Alert
                  </h3>
                  <p className="text-xs text-[#bccac0] mt-1 leading-relaxed">
                    Chauffeur Rajesh Kumar / VIP Client Vikramaditya Rao. Telematics detected
                    unauthorized diversion (+3.2 km off NH-48) toward unauthorized sector.
                  </p>
                </div>
                <div className="flex items-center gap-4 py-1.5 text-xs font-mono text-[#bccac0] bg-[#181c24] px-3 rounded-lg border border-[#262a33]">
                  <span>VELOCITY: 62 KM/H</span>
                  <span className="text-[#68dba9]">CABIN MIC: ACTIVE</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => showNotification('Police 112 Dispatch Signal Broadcasted!')}
                  className="flex-1 bg-[#93000a] hover:bg-[#93000a]/90 text-[#ffdad6] text-xs font-bold py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-lg"
                >
                  <span className="material-symbols-outlined text-[16px]">local_police</span>{' '}
                  Dispatch Police 112
                </button>
                <Link
                  href="/admin/live-fleet-radar"
                  className="bg-[#181c24] hover:bg-[#262a33] text-[#dfe2ee] text-xs py-2 px-3 rounded-lg border border-[#262a33] transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#68dba9]">
                    sensors
                  </span>{' '}
                  Telematics HUD
                </Link>
              </div>
            </div>

            {/* Card 2: KYC SLA Breach */}
            <div className="relative bg-[#0a0e16] rounded-xl p-5 shadow-xl border border-[#25a475]/40 overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#68dba9] via-[#25a475] to-transparent" />
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#25a475]/20 text-[#68dba9] font-bold text-[10px] tracking-wider uppercase">
                    <span className="material-symbols-outlined text-[14px]">shield_person</span>{' '}
                    MoRTH DL AUDIT
                  </span>
                  <span className="font-mono text-xs text-[#ffb4ab] font-bold">
                    SLA: 42m REMAINING
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#dfe2ee] leading-tight font-['Space_Grotesk']">
                    8 Chauffeurs Pending Ingestion
                  </h3>
                  <p className="text-xs text-[#bccac0] mt-1 leading-relaxed">
                    Commercial badges submitted for Aerocity premium pool. High-definition
                    DigiLocker cross-checks required before 16:00 peak dispatch cycle.
                  </p>
                </div>
                <div className="flex items-center gap-4 py-1.5 text-xs font-mono text-[#bccac0] bg-[#181c24] px-3 rounded-lg border border-[#262a33]">
                  <span>CLEARANCE: LEVEL 2</span>
                  <span>BACKLOG: DELHI NORTH</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Link
                  href="/admin/verification-queue"
                  className="w-full bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] font-bold text-xs py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md"
                >
                  <span className="material-symbols-outlined text-[16px]">verified</span> Open KYC
                  Queue (8)
                </Link>
              </div>
            </div>

            {/* Card 3: RazorpayX Rails Alert */}
            <div className="relative bg-[#0a0e16] rounded-xl p-5 shadow-xl border border-[#0053db]/40 overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0053db] via-[#b4c5ff] to-transparent" />
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0053db]/20 text-[#b4c5ff] font-bold text-[10px] tracking-wider uppercase">
                    <span className="material-symbols-outlined text-[14px]">sync_problem</span>{' '}
                    SETTLEMENT RETRIES
                  </span>
                  <span className="font-mono text-xs text-[#87948b]">BATCH #TXN-7712</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#dfe2ee] leading-tight font-['Space_Grotesk']">
                    2 Disbursals Dropped at Host
                  </h3>
                  <p className="text-xs text-[#bccac0] mt-1 leading-relaxed">
                    Automated IMPS rails rejected transfer due to HDFC corporate node timeout.
                    Chauffeur automated wallet hold currently active.
                  </p>
                </div>
                <div className="flex items-center gap-4 py-1.5 text-xs font-mono text-[#bccac0] bg-[#181c24] px-3 rounded-lg border border-[#262a33]">
                  <span>VOLUME: ₹84,600</span>
                  <span className="text-[#ffb4ab]">CODE: IMPS_91_TIMEOUT</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Link
                  href="/admin/treasury-and-settlements"
                  className="w-full bg-[#181c24] hover:bg-[#262a33] text-[#dfe2ee] text-xs py-2 px-3 rounded-lg border border-[#262a33] transition-colors flex items-center justify-center gap-1.5 font-medium"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#b4c5ff]">
                    account_tree
                  </span>{' '}
                  Review Payout Ledger
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: Live Operations Summary & Fleet Velocity Split View */}
        <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Sub-panel: Regional Surge Heatmap & Transit Telemetry (7 Cols) */}
          <div className="xl:col-span-7 bg-[#0a0e16] rounded-xl p-5 shadow-xl border border-[#262a33] flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#68dba9] text-[20px]">hub</span>
                  <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    Regional Density &amp; Fleet Velocity
                  </h3>
                </div>
                <span className="text-xs font-mono text-[#87948b]">
                  Live Spatial Mesh • Delhi NCR Sub-districts
                </span>
              </div>
              <div className="flex items-center gap-1 bg-[#181c24] p-1 rounded-lg border border-[#262a33]">
                <button
                  onClick={() => setSelectedSubTab('SURGE')}
                  className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                    selectedSubTab === 'SURGE'
                      ? 'bg-[#262a33] text-[#68dba9]'
                      : 'text-[#87948b] hover:text-[#dfe2ee]'
                  }`}
                >
                  Surge Radar
                </button>
                <button
                  onClick={() => setSelectedSubTab('SPEEDS')}
                  className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                    selectedSubTab === 'SPEEDS'
                      ? 'bg-[#262a33] text-[#68dba9]'
                      : 'text-[#87948b] hover:text-[#dfe2ee]'
                  }`}
                >
                  Corridor Speeds
                </button>
                <button
                  onClick={() => setSelectedSubTab('DEADHEAD')}
                  className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                    selectedSubTab === 'DEADHEAD'
                      ? 'bg-[#262a33] text-[#68dba9]'
                      : 'text-[#87948b] hover:text-[#dfe2ee]'
                  }`}
                >
                  Deadhead Ratio
                </button>
              </div>
            </div>

            {/* Tactical Map View Container */}
            <div className="relative w-full h-80 rounded-xl overflow-hidden bg-[#181c24] border border-[#262a33]">
              <div
                className="w-full h-full bg-cover bg-center opacity-80"
                style={{
                  backgroundImage:
                    "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCKiKHCnhQU2amlhvY_rtUZGTXoMvGytdfJBINqDaPweEVxmk-Tz0_eEreP7BooWCqtnpx3fIGBWCZ9DggqYPDfSXJaDG76xfEh2loE86orCrk-zx5JpfXpGC1Hjhwb_Tq5501YXDyVnWiykdiK_0bPI_f1DE98RTWoOgwR9-IgkzxM3Mkc1g_Md9QbRPPsQZkyANs3x9gE2Y4m8MVudQ5cG3p67B6DmBXJs7pVQx4bnl2UDPf0o7xkXg')",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e16] via-transparent to-[#0a0e16]/40 pointer-events-none" />

              {/* Live Corridor Telemetry Overlays */}
              <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-auto">
                <div className="bg-[#0a0e16]/90 backdrop-blur-md p-3 rounded-lg border border-[#262a33] shadow-lg flex items-center gap-3">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#68dba9] animate-ping" />
                  <div>
                    <div className="text-[9px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk']">
                      CORRIDOR 01
                    </div>
                    <div className="text-xs font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                      Aerocity T3 ↔ Gurgaon CyberCity
                    </div>
                  </div>
                  <span className="ml-4 bg-[#68dba9]/20 text-[#68dba9] font-mono text-xs px-2 py-0.5 rounded font-bold border border-[#68dba9]/40">
                    +1.4x Surge
                  </span>
                </div>

                <div className="bg-[#0a0e16]/90 backdrop-blur-md p-3 rounded-lg border border-[#262a33] shadow-lg flex items-center gap-3">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#b4c5ff]" />
                  <div>
                    <div className="text-[9px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk']">
                      CORRIDOR 02
                    </div>
                    <div className="text-xs font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                      Golf Course Ext ↔ Chanakyapuri Diplomatic
                    </div>
                  </div>
                  <span className="ml-4 bg-[#0053db]/20 text-[#b4c5ff] font-mono text-xs px-2 py-0.5 rounded font-bold border border-[#0053db]/40">
                    +1.25x Surge
                  </span>
                </div>
              </div>

              {/* Telemetry Bottom Bar */}
              <div className="absolute bottom-4 left-4 right-4 bg-[#0a0e16]/95 backdrop-blur-md p-3 rounded-lg border border-[#262a33] flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-xs font-mono text-[#dfe2ee]">
                  <div>
                    <span className="text-[#87948b]">AVG VELOCITY:</span>{' '}
                    <span className="font-bold text-[#68dba9]">48.4 KM/H</span>
                  </div>
                  <div className="hidden sm:block">
                    <span className="text-[#87948b]">ETA VARIANCE:</span>{' '}
                    <span className="font-bold text-[#dfe2ee]">+1.2 MIN</span>
                  </div>
                  <div className="hidden md:block">
                    <span className="text-[#87948b]">ACTIVE PAIRED:</span>{' '}
                    <span className="font-bold text-[#68dba9]">924 VANS</span>
                  </div>
                </div>
                <span className="font-mono text-xs text-[#68dba9] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">navigation</span>
                  100% TELEMETRY SYNC
                </span>
              </div>
            </div>

            {/* Regional Corridor Breakdown Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#181c24] p-3 rounded-lg border border-[#262a33] flex flex-col">
                <span className="text-[10px] font-bold text-[#87948b] font-['Space_Grotesk']">
                  DLF CYBERHUB
                </span>
                <span className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-0.5">
                  412 Cars
                </span>
                <span className="text-xs font-mono text-[#68dba9] mt-1">+1.25x Surge</span>
              </div>
              <div className="bg-[#181c24] p-3 rounded-lg border border-[#262a33] flex flex-col">
                <span className="text-[10px] font-bold text-[#87948b] font-['Space_Grotesk']">
                  IGI AIRPORT T3
                </span>
                <span className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-0.5">
                  328 Cars
                </span>
                <span className="text-xs font-mono text-[#68dba9] mt-1">+1.40x Surge</span>
              </div>
              <div className="bg-[#181c24] p-3 rounded-lg border border-[#262a33] flex flex-col">
                <span className="text-[10px] font-bold text-[#87948b] font-['Space_Grotesk']">
                  GOLF COURSE EXT
                </span>
                <span className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-0.5">
                  284 Cars
                </span>
                <span className="text-xs font-mono text-[#bccac0] mt-1">1.0x Base</span>
              </div>
              <div className="bg-[#181c24] p-3 rounded-lg border border-[#262a33] flex flex-col">
                <span className="text-[10px] font-bold text-[#87948b] font-['Space_Grotesk']">
                  NOIDA SEC-62
                </span>
                <span className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-0.5">
                  196 Cars
                </span>
                <span className="text-xs font-mono text-[#68dba9] mt-1">+1.15x Surge</span>
              </div>
            </div>
          </div>

          {/* Right Sub-panel: Real-Time Performance & Conversion Funnel Analytics (5 Cols) */}
          <div className="xl:col-span-5 bg-[#0a0e16] rounded-xl p-5 shadow-xl border border-[#262a33] flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#68dba9] text-[20px]">
                    query_stats
                  </span>
                  <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    Hourly Velocity &amp; Funnel
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-[#68dba9] bg-[#25a475]/20 px-2 py-0.5 rounded font-bold border border-[#25a475]/40">
                  PEAK 18:00 - 21:00
                </span>
              </div>
              <span className="text-xs font-mono text-[#87948b] block mt-1">
                Mission Dispatch Conversion Stream (Last 24 Hours)
              </span>
            </div>

            {/* Custom Micro Sparkline SVG Visualization */}
            <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono text-[#bccac0]">
                <span>HOURLY TRIP DISPATCH VOLUMES</span>
                <span className="text-[#68dba9] font-bold">AVG: 310 TRIPS/HR</span>
              </div>
              <div className="h-28 w-full flex items-end pt-2">
                <svg
                  className="w-full h-full text-[#68dba9] overflow-visible"
                  fill="none"
                  preserveAspectRatio="none"
                  viewBox="0 0 400 100"
                >
                  <defs>
                    <linearGradient id="primaryGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#68dba9" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#68dba9" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 80 Q 30 75, 60 70 T 120 60 T 180 50 T 240 40 T 300 15 T 360 25 T 400 35 L 400 100 L 0 100 Z"
                    fill="url(#primaryGradient)"
                  />
                  <path
                    d="M0 80 Q 30 75, 60 70 T 120 60 T 180 50 T 240 40 T 300 15 T 360 25 T 400 35"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="2.5"
                  />
                  <circle className="fill-[#68dba9] animate-pulse" cx="300" cy="15" r="5" />
                </svg>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-[#87948b] pt-1 border-t border-[#262a33]">
                <span>08:00</span>
                <span>11:00</span>
                <span>14:00</span>
                <span className="text-[#68dba9] font-bold">18:00 (PEAK)</span>
                <span>21:00</span>
                <span>23:00</span>
              </div>
            </div>

            {/* Conversion Funnel Waterfall */}
            <div className="flex flex-col gap-2">
              <div className="text-[10px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk'] mb-1">
                End-to-End Handshake Funnel
              </div>

              <div className="flex items-center justify-between bg-[#181c24] p-2.5 rounded-lg border border-[#262a33]">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-[#87948b] w-5">01</span>
                  <span className="text-xs text-[#dfe2ee] font-medium">Chauffeur Searches</span>
                </div>
                <div className="flex items-center gap-4 font-mono text-xs">
                  <span className="text-[#dfe2ee] font-bold">12,400</span>
                  <span className="text-[#87948b] w-12 text-right">100%</span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-[#181c24] p-2.5 rounded-lg border border-[#262a33]">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-[#87948b] w-5">02</span>
                  <span className="text-xs text-[#dfe2ee] font-medium">
                    Driver Credential Preview
                  </span>
                </div>
                <div className="flex items-center gap-4 font-mono text-xs">
                  <span className="text-[#dfe2ee] font-bold">8,920</span>
                  <span className="text-[#bccac0] w-12 text-right">71.9%</span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-[#181c24] p-2.5 rounded-lg border border-[#262a33]">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-[#87948b] w-5">03</span>
                  <span className="text-xs text-[#dfe2ee] font-medium">
                    Telemetry Lock Handshake
                  </span>
                </div>
                <div className="flex items-center gap-4 font-mono text-xs">
                  <span className="text-[#dfe2ee] font-bold">4,210</span>
                  <span className="text-[#bccac0] w-12 text-right">33.9%</span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-[#25a475]/20 p-2.5 rounded-lg border border-[#25a475]/40">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-[#68dba9] w-5">04</span>
                  <span className="text-xs text-[#68dba9] font-bold">
                    Missions Fulfilled &amp; Settled
                  </span>
                </div>
                <div className="flex items-center gap-4 font-mono text-xs">
                  <span className="text-[#68dba9] font-bold">4,110</span>
                  <span className="text-[#68dba9] font-bold w-12 text-right">97.6%</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: Real-time Live Mission Transition Stream (Compact Enterprise Data Table) */}
        <section className="bg-[#0a0e16] rounded-xl p-5 shadow-xl border border-[#262a33] flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#68dba9] text-[22px]">
                  format_list_bulleted
                </span>
                <h3 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Live Mission Telemetry Stream
                </h3>
                <span className="bg-[#181c24] text-[#bccac0] font-mono text-[10px] px-2 py-0.5 rounded border border-[#262a33]">
                  STREAMING (184 ACTIVE)
                </span>
              </div>
              <p className="text-xs text-[#87948b] mt-0.5">
                Real-time GPS status, driver telemetry logs, and instantaneous dispatch override
                rails.
              </p>
            </div>

            {/* Filter / Control Bar */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-[#181c24] rounded-lg p-1 border border-[#262a33]">
                <button
                  onClick={() => setActiveFilter('ALL')}
                  className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                    activeFilter === 'ALL'
                      ? 'bg-[#262a33] text-[#dfe2ee] font-bold'
                      : 'text-[#87948b] hover:text-[#dfe2ee]'
                  }`}
                >
                  All (184)
                </button>
                <button
                  onClick={() => setActiveFilter('VIP')}
                  className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                    activeFilter === 'VIP'
                      ? 'bg-[#262a33] text-[#dfe2ee] font-bold'
                      : 'text-[#87948b] hover:text-[#dfe2ee]'
                  }`}
                >
                  VIP Escort (28)
                </button>
                <button
                  onClick={() => setActiveFilter('SEDAN')}
                  className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                    activeFilter === 'SEDAN'
                      ? 'bg-[#262a33] text-[#dfe2ee] font-bold'
                      : 'text-[#87948b] hover:text-[#dfe2ee]'
                  }`}
                >
                  Sedan Elite (112)
                </button>
                <button
                  onClick={() => setActiveFilter('DEVIATED')}
                  className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                    activeFilter === 'DEVIATED'
                      ? 'bg-[#93000a] text-[#ffdad6] font-bold'
                      : 'text-[#ffb4ab] hover:text-[#dfe2ee]'
                  }`}
                >
                  Deviated (1)
                </button>
              </div>

              <button
                onClick={() => showNotification('Fleet filter dialog active')}
                className="bg-[#181c24] hover:bg-[#262a33] text-[#dfe2ee] px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors border border-[#262a33]"
              >
                <span className="material-symbols-outlined text-[16px]">tune</span> Filter Fleet
              </button>
            </div>
          </div>

          {/* Data Table Container */}
          <div className="overflow-x-auto w-full border border-[#262a33] rounded-lg">
            <table className="w-full text-left font-sans text-xs border-collapse">
              <thead>
                <tr className="bg-[#181c24] text-[#87948b] font-['Space_Grotesk'] uppercase tracking-wider border-b border-[#262a33]">
                  <th className="py-3 px-4">Booking &amp; Phase</th>
                  <th className="py-3 px-4">Passenger / VIP Profile</th>
                  <th className="py-3 px-4">Assigned Chauffeur</th>
                  <th className="py-3 px-4">Vehicle Asset</th>
                  <th className="py-3 px-4">Speed / GPS Telemetry</th>
                  <th className="py-3 px-4">Net Fare (Take-rate)</th>
                  <th className="py-3 px-4 text-right">Operator Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262a33]">
                {filteredMissions.map((m) => (
                  <tr
                    key={m.id}
                    className={`transition-colors ${
                      m.isAlert ? 'bg-[#93000a]/10 hover:bg-[#93000a]/20' : 'hover:bg-[#181c24]/80'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="relative flex h-2.5 w-2.5">
                          <span
                            className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                              m.isAlert ? 'bg-[#ffb4ab]' : 'bg-[#68dba9]'
                            } opacity-75`}
                          />
                          <span
                            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                              m.isAlert ? 'bg-[#ffb4ab]' : 'bg-[#68dba9]'
                            }`}
                          />
                        </span>
                        <div>
                          <span
                            className={`font-mono font-bold ${
                              m.isAlert ? 'text-[#ffb4ab]' : 'text-[#dfe2ee]'
                            }`}
                          >
                            #{m.id}
                          </span>
                          <div
                            className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded mt-0.5 inline-block border ${m.statusColor}`}
                          >
                            {m.status}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#181c24] border border-[#262a33] flex items-center justify-center font-mono text-xs text-[#dfe2ee] font-bold">
                          {m.passengerInitials}
                        </div>
                        <div>
                          <div className="font-semibold text-[#dfe2ee]">{m.passenger}</div>
                          <span className="font-mono text-[10px] text-[#b4c5ff]">
                            {m.passengerTier}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-[#dfe2ee]">{m.chauffeur}</div>
                        <div className="font-mono text-[10px] text-[#68dba9] flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">verified</span>{' '}
                          {m.chauffeurRating}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-[#dfe2ee]">{m.vehicle}</div>
                      <div className="font-mono text-[10px] text-[#87948b]">{m.plate}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div
                        className={`font-mono text-xs font-semibold ${
                          m.isAlert ? 'text-[#ffb4ab]' : 'text-[#dfe2ee]'
                        }`}
                      >
                        {m.telemetry}
                      </div>
                      <div className="font-mono text-[10px] text-[#87948b]">{m.location}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-[#dfe2ee]">{m.fare}</div>
                      <div className="font-mono text-[10px] text-[#68dba9]">{m.takeRate}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() =>
                            showNotification(`Initiating Cabin Intercom with #${m.id}`)
                          }
                          className="p-1.5 rounded bg-[#181c24] hover:bg-[#262a33] text-[#bccac0] border border-[#262a33] transition-colors"
                          title="Cabin Intercom"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            phone_in_talk
                          </span>
                        </button>
                        <button
                          onClick={() => showNotification(`Force Abort Signal Sent to #${m.id}`)}
                          className="p-1.5 rounded bg-[#93000a]/30 text-[#ffb4ab] border border-[#93000a] hover:bg-[#93000a] hover:text-[#ffdad6] transition-colors"
                          title="Force Abort Trip"
                        >
                          <span className="material-symbols-outlined text-[18px]">cancel</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-[#87948b] pt-2">
            <span>SHOWING 4 OF 184 ACTIVE DISPATCHES • STREAM HEARTBEAT: 200MS</span>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 rounded bg-[#181c24] border border-[#262a33] text-[#bccac0] hover:text-[#dfe2ee]">
                Previous 50
              </button>
              <span className="text-[#68dba9] font-bold">Page 1 / 4</span>
              <button className="px-3 py-1 rounded bg-[#181c24] border border-[#262a33] text-[#bccac0] hover:text-[#dfe2ee]">
                Next 50
              </button>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CustomerLayout } from '@/components/customer-layout';

export default function CustomerBookingsPage() {
  const [selectedTab, setSelectedTab] = useState<'active' | 'upcoming' | 'completed' | 'cancelled'>(
    'upcoming',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('Last 30 Days (Oct-Dec)');
  const [selectedTerritory, setSelectedTerritory] = useState('Delhi NCR (All Zones)');

  const completedJourneys = [
    {
      id: '#BK-9204',
      driverName: 'Vikramaditya Singh',
      rating: 5.0,
      vehicle: 'Toyota Vellfire • Premium MPV',
      title: 'Airport Transfer (Indira Gandhi T3)',
      type: 'ONE-WAY',
      date: '12 Oct 2025 • 1h 10m Duration',
      route: 'Vasant Vihar → T3 Departure Terminal',
      fare: '₹620 settled',
      paymentMethod: 'Corporate Visa ••4021',
      status: 'COMPLETED & RATED',
    },
    {
      id: '#BK-9188',
      driverName: 'Mohammad Tariq',
      rating: 5.0,
      vehicle: 'Audi A6 • Luxury Sedan',
      title: 'Night Out Party Safe Transit',
      type: 'HOURLY STANDBY',
      date: '08 Oct 2025 • 4h 00m Duration',
      route: 'Aerocity Worldmark → GK II (Return)',
      fare: '₹950 settled',
      paymentMethod: 'UPI AutoPay (HDFC)',
      status: 'COMPLETED & RATED',
    },
    {
      id: '#BK-8941',
      driverName: 'Sunil Sharma',
      rating: 4.9,
      vehicle: 'Mercedes E-Class • Highway Tourer',
      title: 'Intercity Expedition (Delhi ⇄ Jaipur)',
      type: 'EXPEDITION',
      date: '28 Sep 2025 • 2 Days Multi-Day',
      route: 'Sunder Nagar → Rambagh Palace, Jaipur',
      fare: '₹4,800 settled',
      paymentMethod: 'Net Banking (ICICI Corp)',
      status: 'TRIP COMPLETED',
    },
  ];

  return (
    <CustomerLayout activePath="customer-bookings">
      <div className="flex flex-col w-full gap-6">
        {/* HEADER BLOCK */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl bg-[#181c24] border border-[#262a33]">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#68dba9]" />
              <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-widest font-['Space_Grotesk']">
                ENTERPRISE TELEMATICS LEDGER
              </span>
              <span className="text-[#87948b]">•</span>
              <span className="font-mono text-[10px] text-[#bccac0]">GST Reg. 07AABCG1204K1ZV</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              My Mobility Ledger &amp; Bookings
            </h1>
            <p className="text-xs text-[#bccac0] max-w-2xl">
              Manage active executive allocations, review encrypted trip telemetry receipts, and
              re-dispatch verified elite chauffeurs across Delhi NCR &amp; inter-city corridors.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => alert('Downloading tax statements CSV/PDF...')}
              className="px-4 py-2.5 rounded-lg bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] font-bold text-xs flex items-center gap-2 transition-all border border-[#3d4a42] font-['Space_Grotesk']"
            >
              <span className="material-symbols-outlined text-base text-[#68dba9]">download</span>
              <span>Download Tax Invoice / GST Statements (PDF/CSV)</span>
            </button>
            <button
              type="button"
              onClick={() => alert('Ledger refreshed!')}
              className="p-2.5 rounded-lg bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] border border-[#3d4a42]"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
            </button>
          </div>
        </div>

        {/* STATUS TABS & OUTLAY METRICS BAR */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#181c24] p-3 rounded-xl border border-[#262a33]">
            <div className="flex flex-wrap items-center gap-1.5 bg-[#0a0e16] p-1 rounded-lg border border-[#262a33]">
              <button
                type="button"
                onClick={() => setSelectedTab('active')}
                className={`px-3.5 py-1.5 rounded font-mono text-xs transition-all ${
                  selectedTab === 'active'
                    ? 'bg-[#25a475] text-[#00311f] font-bold'
                    : 'text-[#bccac0] hover:text-[#dfe2ee]'
                }`}
              >
                ACTIVE &amp; IN-FLIGHT{' '}
                <span className="ml-1 px-1 rounded bg-[#00311f] text-[#68dba9] text-[10px]">1</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTab('upcoming')}
                className={`px-3.5 py-1.5 rounded font-mono text-xs transition-all ${
                  selectedTab === 'upcoming'
                    ? 'bg-[#25a475] text-[#00311f] font-bold'
                    : 'text-[#bccac0] hover:text-[#dfe2ee]'
                }`}
              >
                UPCOMING &amp; SCHEDULED{' '}
                <span className="ml-1 px-1 rounded bg-[#00311f] text-[#68dba9] text-[10px]">3</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTab('completed')}
                className={`px-3.5 py-1.5 rounded font-mono text-xs transition-all ${
                  selectedTab === 'completed'
                    ? 'bg-[#25a475] text-[#00311f] font-bold'
                    : 'text-[#bccac0] hover:text-[#dfe2ee]'
                }`}
              >
                COMPLETED JOURNEYS{' '}
                <span className="ml-1 px-1 rounded bg-[#00311f] text-[#68dba9] text-[10px]">
                  18
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTab('cancelled')}
                className={`px-3.5 py-1.5 rounded font-mono text-xs transition-all ${
                  selectedTab === 'cancelled'
                    ? 'bg-[#25a475] text-[#00311f] font-bold'
                    : 'text-[#bccac0] hover:text-[#dfe2ee]'
                }`}
              >
                CANCELLED &amp; DISPUTES{' '}
                <span className="ml-1 px-1 rounded bg-[#00311f] text-[#68dba9] text-[10px]">0</span>
              </button>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs text-[#dfe2ee] px-3">
              <span className="text-[#68dba9] font-bold">₹18,450.00</span> MTD Outlay
              <span className="text-[#87948b]">•</span>
              <span className="text-[#68dba9]">100%</span> On-Time Index
            </div>
          </div>

          {/* FILTER TOOLBAR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#181c24] border border-[#262a33] text-xs text-[#dfe2ee]">
              <span className="material-symbols-outlined text-[#87948b] text-base">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by Booking ID, Driver, or Location ⌘K"
                className="bg-transparent focus:outline-none w-full placeholder:text-[#87948b]"
              />
            </div>

            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#181c24] border border-[#262a33] text-xs text-[#dfe2ee] font-mono cursor-pointer"
            >
              <option>Period: Last 30 Days (Oct-Dec)</option>
              <option>Period: This Month (March 2025)</option>
              <option>Period: Last Quarter (Q4 2024)</option>
            </select>

            <select
              value={selectedTerritory}
              onChange={(e) => setSelectedTerritory(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#181c24] border border-[#262a33] text-xs text-[#dfe2ee] font-mono cursor-pointer"
            >
              <option>Territory: Delhi NCR (All Zones)</option>
              <option>Territory: Outstation Corridors</option>
              <option>Territory: Airport Transfers Only</option>
            </select>

            <select className="px-3 py-2 rounded-lg bg-[#181c24] border border-[#262a33] text-xs text-[#dfe2ee] font-mono cursor-pointer">
              <option>Tier: All Driver Tiers</option>
              <option>Tier: Tier-1 VIP Chauffeurs</option>
              <option>Tier: Highway Expedition</option>
            </select>
          </div>
        </div>

        {/* CONFIRMED UPCOMING BOOKING CARD */}
        <section className="p-6 rounded-xl bg-[#181c24] border border-[#262a33] shadow-sm flex flex-col gap-5 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#262a33] pb-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-[#25a475] text-[#00311f] font-mono text-[10px] font-bold uppercase">
                SCHEDULED FOR TOMORROW, 08:30 AM
              </span>
              <span className="px-2 py-0.5 rounded bg-[#262a33] text-[#dfe2ee] font-mono text-[10px]">
                BOOKING #DEL-8841-EX
              </span>
            </div>
            <span className="text-[10px] font-bold text-[#68dba9] uppercase font-['Space_Grotesk']">
              CONFIRMED &amp; DRIVER LOCKED
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Itinerary Column (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div>
                <h3 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  8-Hour Executive Chauffeur Delegation
                </h3>
                <p className="text-xs text-[#bccac0] mt-1">
                  Multi-point executive itinerary covering corporate hubs, high-level diplomatic
                  corridor, and secure returning transit.
                </p>
              </div>

              {/* Waypoint Steps Box */}
              <div className="p-4 rounded-xl bg-[#0a0e16] border border-[#262a33] flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <span className="w-3 h-3 rounded-full bg-[#68dba9] mt-1 shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] block">
                      PRIMARY PICKUP (08:30 AM)
                    </span>
                    <strong className="text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                      Golf Links, New Delhi (Private Residence)
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-3 pl-1.5">
                  <span className="material-symbols-outlined text-[#87948b] text-sm">east</span>
                  <span className="font-mono text-xs text-[#bccac0]">
                    Multi-Stop Enroute (Cyber City &amp; Golf Course Ext.)
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-3 h-3 rounded-full bg-[#b4c5ff] mt-1 shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] block">
                      TERMINAL STOP
                    </span>
                    <strong className="text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                      DLF Cyber City, Gurugram (Building 10B)
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Assigned Driver Box (5 cols) */}
            <div className="lg:col-span-5 p-4 rounded-xl bg-[#0a0e16] border border-[#262a33] flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-[#25a475]/20 border border-[#68dba9] flex items-center justify-center font-bold text-[#68dba9]">
                      GS
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#68dba9] border-2 border-[#0a0e16]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                        Gurpreet Singh
                      </h4>
                      <span className="material-symbols-outlined text-[#68dba9] text-sm">
                        verified
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-[#68dba9]">
                      5.0 ★ • 1,240+ VIP Missions
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#262a33] text-[#bccac0] text-[9px] font-bold uppercase font-['Space_Grotesk']">
                  VIP PROTOCOL CERTIFIED
                </span>
              </div>

              <div className="space-y-1 font-mono text-xs text-[#bccac0] border-t border-[#262a33] pt-2">
                <div className="flex justify-between">
                  <span>Vehicle Allocated:</span>
                  <strong className="text-[#dfe2ee]">Client Owned (BMW 730Ld)</strong>
                </div>
                <div className="flex justify-between">
                  <span>Direct Comms:</span>
                  <strong className="text-[#68dba9]">+91 9811X-SECURE</strong>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => alert('Modify schedule requested.')}
                  className="py-1.5 rounded bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] font-mono text-[10px] text-center"
                >
                  MODIFY
                </button>
                <button
                  type="button"
                  onClick={() => alert('Opening special instructions prompt...')}
                  className="py-1.5 rounded bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] font-mono text-[10px] text-center"
                >
                  INSTRUCTIONS
                </button>
                <button
                  type="button"
                  onClick={() => alert('Booking cancellation initiated (Zero penalty apply).')}
                  className="py-1.5 rounded bg-[#93000a]/30 hover:bg-[#93000a]/50 text-[#ffb4ab] font-mono text-[10px] text-center font-bold"
                >
                  ABORT
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* COMPLETED JOURNEYS TABLE & DIGITAL SLIPS */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                Completed Journeys &amp; Digital Slips
              </h2>
              <p className="text-xs text-[#bccac0]">
                Cryptographically signed invoices with GPS waypoint telemetry logs
              </p>
            </div>
            <span className="font-mono text-xs text-[#bccac0]">Showing 3 of 18 record entries</span>
          </div>

          <div className="flex flex-col gap-3">
            {completedJourneys.map((j) => (
              <div
                key={j.id}
                className="p-5 rounded-xl bg-[#181c24] border border-[#262a33] hover:border-[#3d4a42] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0a0e16] border border-[#262a33] flex items-center justify-center text-[#68dba9] shrink-0 font-bold text-sm">
                    {j.driverName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>

                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                        {j.driverName}
                      </span>
                      <span className="font-mono text-xs text-amber-400 font-bold">
                        {j.rating} ★
                      </span>
                      <span className="font-mono text-[10px] text-[#87948b]">• {j.vehicle}</span>
                      <span className="font-mono text-[10px] text-[#87948b]">{j.id}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                        {j.title}
                      </h3>
                      <span className="px-2 py-0.5 rounded bg-[#262a33] text-[#b4c5ff] font-mono text-[9px] uppercase font-bold">
                        {j.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 font-mono text-xs text-[#bccac0]">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">schedule</span>
                        {j.date}
                      </span>
                      <span>•</span>
                      <span>{j.route}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                  <div className="flex flex-col text-right font-mono">
                    <span className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                      {j.fare}
                    </span>
                    <span className="text-[10px] text-[#bccac0] flex items-center gap-1 justify-end">
                      <span className="material-symbols-outlined text-xs">credit_card</span>
                      {j.paymentMethod}
                    </span>
                    <span className="text-[9px] text-[#68dba9] uppercase font-bold mt-0.5">
                      {j.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => alert(`Invoice PDF preview for ${j.id}`)}
                      className="px-3 py-2 rounded-lg bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] font-mono text-xs transition-colors"
                    >
                      View Invoice
                    </button>
                    <Link
                      href="/customer/find-driver"
                      className="px-3 py-2 rounded-lg bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] font-bold font-mono text-xs flex items-center gap-1 transition-colors"
                    >
                      <span>REBOOK</span>
                      <span className="material-symbols-outlined text-xs">repeat</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* BOTTOM TRUST CARDS GRID */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-[#25a475]/20 text-[#68dba9] shrink-0">
              <span className="material-symbols-outlined text-xl">verified</span>
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                50-Lakh Active Cover
              </h4>
              <p className="text-xs text-[#bccac0] mt-0.5">
                Every allocated driver carries background-cleared insurance endorsement.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-[#25a475]/20 text-[#68dba9] shrink-0">
              <span className="material-symbols-outlined text-xl">description</span>
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                Instant GST Claiming
              </h4>
              <p className="text-xs text-[#bccac0] mt-0.5">
                Automated B2B invoices pushed to your company&apos;s accounting webhook.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-[#25a475]/20 text-[#68dba9] shrink-0">
              <span className="material-symbols-outlined text-xl">published_with_changes</span>
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                Zero Cancellation Penalty
              </h4>
              <p className="text-xs text-[#bccac0] mt-0.5">
                Free reschedule or cancellation up to 60 mins prior to wheel rotation.
              </p>
            </div>
          </div>
        </section>
      </div>
    </CustomerLayout>
  );
}

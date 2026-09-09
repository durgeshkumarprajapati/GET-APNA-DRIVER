'use client';

import { AdminLayout } from '@/components/admin-layout';
import Link from 'next/link';

export default function AdminDriverDirectoryPage() {
  const drivers = [
    {
      name: 'Rajesh Kumar',
      id: 'DRV-VIP-1840',
      tier: 'Level 4 VVIP Chauffeur',
      rating: '4.96 ★',
      trips: 1840,
      status: 'IN MISSION',
      badge: 'Mercedes & BMW Certified',
    },
    {
      name: 'Manpreet Singh',
      id: 'DRV-EXE-3120',
      tier: 'Level 4 VVIP Chauffeur',
      rating: '4.99 ★',
      trips: 3120,
      status: 'AVAILABLE',
      badge: 'S-Class & Maybach Certified',
    },
    {
      name: 'Dinesh Verma',
      id: 'DRV-STD-0940',
      tier: 'Level 3 Executive',
      rating: '4.92 ★',
      trips: 940,
      status: 'IN MISSION',
      badge: 'EV & Hybrid Master',
    },
    {
      name: 'Surender Yadav',
      id: 'DRV-STD-2450',
      tier: 'Level 3 Executive',
      rating: '4.95 ★',
      trips: 2450,
      status: 'STANDBY',
      badge: 'Outstation Specialist',
    },
  ];

  return (
    <AdminLayout activePath="driver-directory">
      <div className="flex flex-col gap-6 w-full">
        <div className="flex items-center justify-between bg-[#0a0e16] p-4 rounded-xl border border-[#262a33]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#68dba9]">
              <span className="material-symbols-outlined text-[16px]">id_card</span>
              <span>CHAUFFEUR DIRECTORY &amp; ROSTER</span>
            </div>
            <h1 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              Chauffeur Master Directory
            </h1>
          </div>
          <Link
            href="/admin/live-fleet-radar"
            className="px-3 py-1.5 rounded-lg bg-[#25a475] text-[#00311f] font-bold text-xs font-['Space_Grotesk'] flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">radar</span> Live Fleet Radar
          </Link>
        </div>

        <div className="bg-[#0a0e16] rounded-xl border border-[#262a33] p-5 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs border-collapse">
              <thead>
                <tr className="bg-[#181c24] text-[#87948b] font-['Space_Grotesk'] uppercase border-b border-[#262a33]">
                  <th className="py-3 px-4">Chauffeur Name</th>
                  <th className="py-3 px-4">Driver ID</th>
                  <th className="py-3 px-4">Clearance Tier</th>
                  <th className="py-3 px-4">Rating &amp; Trips</th>
                  <th className="py-3 px-4">Specialization</th>
                  <th className="py-3 px-4 text-right">Duty Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262a33] font-mono">
                {drivers.map((d, i) => (
                  <tr key={i} className="hover:bg-[#181c24]/80">
                    <td className="py-3 px-4 font-bold text-[#dfe2ee]">{d.name}</td>
                    <td className="py-3 px-4 text-[#87948b]">{d.id}</td>
                    <td className="py-3 px-4 text-[#b4c5ff]">{d.tier}</td>
                    <td className="py-3 px-4 text-[#68dba9]">
                      {d.rating} ({d.trips} trips)
                    </td>
                    <td className="py-3 px-4 text-[#bccac0]">{d.badge}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="px-2 py-0.5 rounded bg-[#25a475]/20 text-[#68dba9] text-[10px] font-bold border border-[#25a475]">
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

'use client';

import { DriverLayout } from '@/components/driver-layout';

export default function DriverSchedulePage() {
  const scheduleSlots = [
    {
      date: 'Today (March 09)',
      shifts: [
        { time: '08:00 - 16:00', zone: 'South Delhi VIP Sector', status: 'COMPLETED' },
        { time: '19:30 - 23:30', zone: 'IGI Airport T3 Transfers', status: 'ACTIVE IN-FLIGHT' },
      ],
    },
    {
      date: 'Tomorrow (March 10)',
      shifts: [
        { time: '08:00 - 14:00', zone: 'Gurugram CyberCity Expressway', status: 'RESERVED' },
        { time: '16:00 - 22:00', zone: 'Aerocity Hospitality District', status: 'RESERVED' },
      ],
    },
  ];

  return (
    <DriverLayout>
      <div className="flex flex-col w-full px-6 py-6 gap-6">
        <div className="flex items-center justify-between p-6 rounded-xl bg-[#181c24] border border-[#262a33]">
          <div>
            <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk'] block">
              DUTY SCHEDULING &amp; SHIFT ROSTER
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              Chauffeur Schedule &amp; Reserved Shifts
            </h1>
            <p className="text-xs text-[#bccac0] mt-1">
              Pre-book high-yield shift slots across VIP corridors in Delhi NCR.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {scheduleSlots.map((s, i) => (
            <div key={i} className="p-5 rounded-xl bg-[#181c24] border border-[#262a33] space-y-3">
              <h3 className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">{s.date}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {s.shifts.map((shift, j) => (
                  <div
                    key={j}
                    className="p-3.5 rounded-lg bg-[#0a0e16] border border-[#262a33] flex items-center justify-between font-mono text-xs"
                  >
                    <div>
                      <strong className="text-[#dfe2ee] block">{shift.time}</strong>
                      <span className="text-[10px] text-[#87948b]">{shift.zone}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#25a475]/20 text-[#68dba9] text-[9px] font-bold">
                      {shift.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DriverLayout>
  );
}

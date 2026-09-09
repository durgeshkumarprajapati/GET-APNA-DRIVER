'use client';

import { DriverLayout } from '@/components/driver-layout';

export default function DriverPerformancePage() {
  const badges = [
    {
      title: 'T1-ELITE CHAUFFEUR',
      level: 'Level 5 Master',
      icon: 'military_tech',
      color: 'text-[#68dba9]',
    },
    {
      title: 'GERMAN LUXURY CERTIFIED',
      level: 'Mercedes & BMW',
      icon: 'verified',
      color: 'text-[#4edea3]',
    },
    {
      title: 'ZERO ACCIDENT SLA',
      level: '1,420 Journeys',
      icon: 'security',
      color: 'text-[#b4c5ff]',
    },
    {
      title: 'AIRPORT INGRESS PRO',
      level: 'T3 Flight Sync',
      icon: 'flight_takeoff',
      color: 'text-[#68dba9]',
    },
  ];

  return (
    <DriverLayout activePath="performance-and-badges">
      <div className="flex flex-col w-full px-6 py-6 gap-6">
        <div className="flex items-center justify-between p-6 rounded-xl bg-[#181c24] border border-[#262a33]">
          <div>
            <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk'] block">
              CHAUFFEUR REPUTATION &amp; RECOGNITION
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              Performance Metrics &amp; Elite Badges
            </h1>
            <p className="text-xs text-[#bccac0] mt-1">
              Your overall quality score, customer satisfaction rating, and verified luxury
              certifications.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {badges.map((b, i) => (
            <div
              key={i}
              className="p-5 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col gap-3"
            >
              <span className={`material-symbols-outlined text-3xl ${b.color}`}>{b.icon}</span>
              <div>
                <h3 className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                  {b.title}
                </h3>
                <span className="font-mono text-xs text-[#87948b]">{b.level}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DriverLayout>
  );
}

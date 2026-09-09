'use client';

import { DriverLayout } from '@/components/driver-layout';

export default function DriverRatingsPage() {
  const reviews = [
    {
      client: 'Dr. Radhika Sen',
      rating: 5.0,
      date: 'March 08, 2025',
      comment:
        'Exceptional handling with my Mercedes E-Class. Punctual, quiet, and very professional driving.',
    },
    {
      client: 'Dr. Vikramaditya Rao',
      rating: 5.0,
      date: 'March 02, 2025',
      comment:
        'Flawless night outstation trip to Jaipur. Extremely polite and knowledgeable about highway routes.',
    },
    {
      client: 'Sunil Mehta (Deloitte Partner)',
      rating: 4.9,
      date: 'Feb 28, 2025',
      comment:
        'Arrived 15 mins early for morning airport drop. Smooth driving through CyberCity traffic.',
    },
  ];

  return (
    <DriverLayout>
      <div className="flex flex-col w-full px-6 py-6 gap-6">
        <div className="flex items-center justify-between p-6 rounded-xl bg-[#181c24] border border-[#262a33]">
          <div>
            <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk'] block">
              CLIENT TESTIMONIALS &amp; AUDITS
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              Passenger Ratings &amp; Reviews (4.98 ★)
            </h1>
            <p className="text-xs text-[#bccac0] mt-1">
              Verified feedback from board-level executives, corporate partners, and luxury vehicle
              owners.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {reviews.map((r, i) => (
            <div key={i} className="p-5 rounded-xl bg-[#181c24] border border-[#262a33] space-y-2">
              <div className="flex items-center justify-between font-mono text-xs">
                <strong className="text-[#dfe2ee] text-sm font-['Space_Grotesk']">
                  {r.client}
                </strong>
                <span className="text-amber-400 font-bold">
                  {r.rating} ★ • {r.date}
                </span>
              </div>
              <p className="text-xs text-[#bccac0] italic">&quot;{r.comment}&quot;</p>
            </div>
          ))}
        </div>
      </div>
    </DriverLayout>
  );
}

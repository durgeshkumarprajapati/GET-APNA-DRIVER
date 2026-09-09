'use client';

import Link from 'next/link';
import { CustomerLayout } from '@/components/customer-layout';

export default function CustomerFavoritesPage() {
  const favoriteDrivers = [
    {
      id: 'drv_1',
      name: 'Manpreet Singh',
      rating: 4.99,
      trips: '2,190 trips',
      experience: '4.8 yrs exp',
      rate: 180,
      specialty: 'Mercedes-Benz S/E, Audi A6/A8',
      status: 'Available (3 km away)',
    },
    {
      id: 'drv_2',
      name: 'Devendra Joshi',
      rating: 4.96,
      trips: '1,640 trips',
      experience: '3.5 yrs exp',
      rate: 160,
      specialty: 'Toyota Fortuner, BMW 3/5 Series',
      status: 'Available (1.8 km away)',
    },
    {
      id: 'drv_3',
      name: 'Satish Chauhan',
      rating: 4.97,
      trips: '3,420 trips',
      experience: '6.0 yrs exp',
      rate: 175,
      specialty: 'EV (BYD/Ioniq), Jaguar/Land Rover',
      status: 'On Mission (Free at 21:00)',
    },
    {
      id: 'drv_4',
      name: 'Vikramaditya Singh',
      rating: 4.98,
      trips: '2,890 trips',
      experience: '11 yrs exp',
      rate: 190,
      specialty: 'VVIP Protocol, Rolls Royce & Maybach Specialist',
      status: 'Available (5 km away)',
    },
  ];

  return (
    <CustomerLayout>
      <div className="flex flex-col w-full gap-6">
        <div className="flex items-center justify-between p-6 rounded-xl bg-[#181c24] border border-[#262a33]">
          <div>
            <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk'] block">
              PREFERRED EXECUTIVE ROSTER
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              Your Favorite Elite Chauffeurs
            </h1>
            <p className="text-xs text-[#bccac0] mt-1">
              Direct access to your preferred background-verified chauffeurs for quick rebooking.
            </p>
          </div>
          <Link
            href="/customer/find-driver"
            className="px-4 py-2.5 rounded-lg bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] font-bold text-xs font-['Space_Grotesk'] transition-all"
          >
            + Dispatch Chauffeur Now
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {favoriteDrivers.map((drv) => (
            <div
              key={drv.id}
              className="p-5 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col justify-between gap-4 shadow-sm hover:border-[#3d4a42] transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#25a475]/20 border border-[#68dba9] flex items-center justify-center font-bold text-[#68dba9] font-['Space_Grotesk']">
                    {drv.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#dfe2ee] font-['Space_Grotesk']">
                      {drv.name}
                    </h3>
                    <span className="font-mono text-xs text-[#87948b]">
                      {drv.experience} • {drv.trips}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#262a33] text-amber-400 font-mono text-xs font-bold">
                  <span className="material-symbols-outlined text-xs">star</span>
                  <span>{drv.rating}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0a0e16] border border-[#262a33] font-mono text-xs text-[#bccac0] space-y-1">
                <div>
                  Specialty: <strong className="text-[#dfe2ee]">{drv.specialty}</strong>
                </div>
                <div>
                  Status: <span className="text-[#68dba9] font-bold">{drv.status}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#262a33]">
                <span className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  ₹{drv.rate}
                  <span className="text-xs text-[#bccac0] font-normal">/hr</span>
                </span>
                <Link
                  href="/customer/find-driver"
                  className="px-4 py-2 rounded-lg bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-bold text-xs font-['Space_Grotesk'] transition-all"
                >
                  Quick Rebook
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </CustomerLayout>
  );
}

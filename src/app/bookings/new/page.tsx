'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ControlStationLayout } from '@/components/control-station-layout';

export default function BookDriverPage() {
  const router = useRouter();

  const [pickupZone, setPickupZone] = useState('Vasant Vihar, Block C, New Delhi');
  const [selectedTab, setSelectedTab] = useState<'hourly' | 'oneway' | 'outstation' | 'nightout'>(
    'hourly',
  );
  const [vehicleClass, setVehicleClass] = useState<'luxury' | 'sedan' | 'hatchback'>('luxury');
  const [transmission, setTransmission] = useState<'auto' | 'manual'>('auto');
  const [selectedDriverId, setSelectedDriverId] = useState('vikram');
  const [radiusKm, setRadiusKm] = useState(5);
  const [mapStyle, setMapStyle] = useState<'dark' | 'satellite'>('dark');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const drivers = [
    {
      id: 'vikram',
      name: 'Vikram Singh',
      tag: 'Elite Top Chauffeur',
      rating: 4.98,
      reviews: 342,
      trips: '1,420 trips',
      exp: '9 yrs exp',
      rate: 160,
      eta: '6 mins',
      kyc: 'Govt KYC 100%',
      specialty: 'German Luxury Specialist',
      quote:
        'Exceptional handling with my Mercedes S-Class. Smooth, quiet, and highly disciplined route knowledge.',
      languages: 'EN / HI / PB',
    },
    {
      id: 'tariq',
      name: 'Mohammad Tariq',
      tag: 'Verified Chauffeur',
      rating: 4.92,
      reviews: 180,
      trips: '890 trips',
      exp: '6 yrs exp',
      rate: 140,
      eta: '12 mins',
      kyc: 'Govt KYC 100%',
      specialty: 'Automatic Sedan & SUV Specialist',
      quote: 'Punctual, polite and handles heavy traffic with extreme composure.',
      languages: 'HI / EN',
    },
    {
      id: 'sunil',
      name: 'Sunil Sharma',
      tag: 'Master Veteran',
      rating: 4.95,
      reviews: 520,
      trips: '2,100 trips',
      exp: '11 yrs exp',
      rate: 175,
      eta: '15 mins',
      kyc: 'Govt KYC 100%',
      specialty: 'VIP Diplomatic Protocol Trained',
      quote: 'Flawless night outstation driving experience. Very courteous.',
      languages: 'EN / HI',
    },
  ];

  const selectedDriver = drivers.find((d) => d.id === selectedDriverId) || drivers[0];

  const handleConfirmDispatch = async () => {
    setLoading(true);
    setError(null);

    const idempotencyKey = `bk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': idempotencyKey,
        },
        body: JSON.stringify({
          pickupLocation: {
            latitude: 28.5603,
            longitude: 77.1627,
            address: pickupZone,
            label: 'Vasant Vihar',
          },
          bookingType:
            selectedTab === 'hourly'
              ? 'HOURLY'
              : selectedTab === 'outstation'
                ? 'MULTI_DAY'
                : 'ONE_WAY',
          estimatedDurationMinutes: selectedTab === 'hourly' ? 240 : 60,
          customerNotes: `Driver preference: ${selectedDriver.name} (${vehicleClass.toUpperCase()} ${transmission.toUpperCase()})`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to dispatch chauffeur.');
      } else {
        router.push(`/bookings/${data.booking.id}`);
      }
    } catch {
      setError('Unexpected error occurred while dispatching chauffeur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ControlStationLayout activePersona="customer" activePath="customer-book-driver">
      <div className="w-full px-6 py-4 flex flex-col gap-6">
        <div className="flex flex-col xl:flex-row gap-6 w-full items-start">
          {/* Left Panel: Booking & Driver Triage (42% width) */}
          <section className="w-full xl:w-[42%] flex flex-col gap-4 shrink-0">
            {error && (
              <div className="p-4 rounded-xl bg-[#93000a]/40 border border-[#ffb4ab] text-[#ffdad6] text-xs">
                {error}
              </div>
            )}

            {/* Location & Pickup Anchor Card */}
            <div className="bg-[#181c24] rounded-xl p-4 shadow-sm border border-[#262a33] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-ping" />
                  <span className="text-[10px] font-bold uppercase text-[#68dba9] tracking-wider font-['Space_Grotesk']">
                    Pickup Telemetry Locked
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#bccac0]">
                  GPS: 28.5603° N, 77.1627° E
                </span>
              </div>

              <div className="bg-[#1c2028] rounded-lg p-3 flex items-center justify-between gap-3 border border-[#262a33]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#25a475]/20 flex items-center justify-center shrink-0 text-[#68dba9]">
                    <span className="material-symbols-outlined text-base">my_location</span>
                  </div>
                  <div className="min-w-0">
                    <span className="font-mono text-[9px] text-[#bccac0] uppercase block">
                      Current Pickup Zone
                    </span>
                    <p className="font-bold text-sm text-[#dfe2ee] truncate font-['Space_Grotesk']">
                      {pickupZone}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = prompt('Enter new pickup address:', pickupZone);
                    if (next) setPickupZone(next);
                  }}
                  className="bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] font-mono text-[10px] px-3 py-1.5 rounded-lg transition-colors shrink-0 flex items-center gap-1 border border-[#3d4a42]"
                >
                  <span className="material-symbols-outlined text-xs">edit_location</span>
                  <span>Change</span>
                </button>
              </div>
            </div>

            {/* Trip Configuration Tabs */}
            <div className="bg-[#181c24] rounded-xl p-4 shadow-sm border border-[#262a33] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#bccac0] tracking-wider font-['Space_Grotesk']">
                  Service Tier & Booking Mode
                </span>
                <span className="font-mono text-[10px] text-[#68dba9]">
                  Fixed Surcharge Shield Active
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 bg-[#0a0e16] p-1 rounded-lg border border-[#262a33]">
                <button
                  type="button"
                  onClick={() => setSelectedTab('hourly')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded font-mono text-[11px] transition-all ${
                    selectedTab === 'hourly'
                      ? 'bg-[#262a33] text-[#dfe2ee] font-bold shadow border border-[#3d4a42]'
                      : 'text-[#bccac0] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${selectedTab === 'hourly' ? 'bg-[#68dba9]' : 'bg-transparent'}`}
                  />
                  <span>Hourly Rental (min 4h)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTab('oneway')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded font-mono text-[11px] transition-all ${
                    selectedTab === 'oneway'
                      ? 'bg-[#262a33] text-[#dfe2ee] font-bold shadow border border-[#3d4a42]'
                      : 'text-[#bccac0] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${selectedTab === 'oneway' ? 'bg-[#68dba9]' : 'bg-transparent'}`}
                  />
                  <span>One-Way Drop</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTab('outstation')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded font-mono text-[11px] transition-all ${
                    selectedTab === 'outstation'
                      ? 'bg-[#262a33] text-[#dfe2ee] font-bold shadow border border-[#3d4a42]'
                      : 'text-[#bccac0] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${selectedTab === 'outstation' ? 'bg-[#68dba9]' : 'bg-transparent'}`}
                  />
                  <span>Outstation Trip</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTab('nightout')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded font-mono text-[11px] transition-all ${
                    selectedTab === 'nightout'
                      ? 'bg-[#262a33] text-[#dfe2ee] font-bold shadow border border-[#3d4a42]'
                      : 'text-[#bccac0] hover:text-[#dfe2ee]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${selectedTab === 'nightout' ? 'bg-[#68dba9]' : 'bg-transparent'}`}
                  />
                  <span>Party Safe / Night Out</span>
                </button>
              </div>

              {/* Vehicle Specifications */}
              <div className="pt-1 flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase text-[#bccac0] tracking-wider font-['Space_Grotesk']">
                  Your Vehicle Profile to Drive
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setVehicleClass('luxury')}
                    className={`p-2.5 rounded-lg text-left flex flex-col gap-1 transition-all ${
                      vehicleClass === 'luxury'
                        ? 'bg-[#262a33] text-[#dfe2ee] border border-[#68dba9]/50 shadow'
                        : 'bg-[#1c2028] text-[#bccac0] opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[#68dba9]">
                      <span className="material-symbols-outlined text-base">directions_car</span>
                      {vehicleClass === 'luxury' && (
                        <span className="material-symbols-outlined text-xs">check_circle</span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold uppercase text-[#dfe2ee] font-['Space_Grotesk']">
                      Luxury / SUV
                    </span>
                    <span className="font-mono text-[9px] text-[#bccac0]">
                      Audi, BMW, Merc, Land Rover
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVehicleClass('sedan')}
                    className={`p-2.5 rounded-lg text-left flex flex-col gap-1 transition-all ${
                      vehicleClass === 'sedan'
                        ? 'bg-[#262a33] text-[#dfe2ee] border border-[#68dba9]/50 shadow'
                        : 'bg-[#1c2028] text-[#bccac0] opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[#68dba9]">
                      <span className="material-symbols-outlined text-base">airport_shuttle</span>
                      {vehicleClass === 'sedan' && (
                        <span className="material-symbols-outlined text-xs">check_circle</span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold uppercase text-[#dfe2ee] font-['Space_Grotesk']">
                      Premium Sedan
                    </span>
                    <span className="font-mono text-[9px] text-[#bccac0]">
                      City, Ciaz, Octavia, Camry
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVehicleClass('hatchback')}
                    className={`p-2.5 rounded-lg text-left flex flex-col gap-1 transition-all ${
                      vehicleClass === 'hatchback'
                        ? 'bg-[#262a33] text-[#dfe2ee] border border-[#68dba9]/50 shadow'
                        : 'bg-[#1c2028] text-[#bccac0] opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[#68dba9]">
                      <span className="material-symbols-outlined text-base">garage</span>
                      {vehicleClass === 'hatchback' && (
                        <span className="material-symbols-outlined text-xs">check_circle</span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold uppercase text-[#dfe2ee] font-['Space_Grotesk']">
                      Hatchback
                    </span>
                    <span className="font-mono text-[9px] text-[#bccac0]">
                      i20, Baleno, Swift, Polo
                    </span>
                  </button>
                </div>

                {/* Transmission Radio Options */}
                <div className="flex items-center justify-between bg-[#1c2028] p-2 rounded-lg mt-1 border border-[#262a33]">
                  <span className="font-mono text-[10px] text-[#bccac0]">Transmission Matrix:</span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded bg-[#262a33] text-[#dfe2ee] font-mono text-[10px]">
                      <input
                        type="radio"
                        name="transmission"
                        checked={transmission === 'auto'}
                        onChange={() => setTransmission('auto')}
                        className="accent-[#68dba9] w-3 h-3"
                      />
                      <span>Automatic (DSG/AT/CVT)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded text-[#bccac0] font-mono text-[10px]">
                      <input
                        type="radio"
                        name="transmission"
                        checked={transmission === 'manual'}
                        onChange={() => setTransmission('manual')}
                        className="accent-[#68dba9] w-3 h-3"
                      />
                      <span>Manual</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Vetting Filters */}
              <div className="pt-1 flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase text-[#bccac0] tracking-wider font-['Space_Grotesk']">
                  Vetting Filters
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-full bg-[#25a475]/30 text-[#68dba9] font-mono text-[10px] flex items-center gap-1 shadow-sm border border-[#25a475]/40">
                    <span className="material-symbols-outlined text-xs">verified</span> Rating 4.8+
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-[#262a33] text-[#dfe2ee] font-mono text-[10px] flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">timeline</span> 5+ Yrs Exp
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-[#25a475]/30 text-[#68dba9] font-mono text-[10px] flex items-center gap-1 shadow-sm border border-[#25a475]/40">
                    <span className="material-symbols-outlined text-xs">translate</span> English &
                    Hindi
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-[#262a33] text-[#dfe2ee] font-mono text-[10px] flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">smoke_free</span> Non-Smoker
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-[#262a33] text-[#68dba9] font-mono text-[10px] flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">hotel_class</span> Luxury
                    Trained
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-[#68dba9] text-[#003825] font-mono text-[10px] flex items-center gap-1 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#003825] animate-pulse" />{' '}
                    Immediate (Now)
                  </span>
                </div>
              </div>
            </div>

            {/* Available Drivers List */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-[#dfe2ee] font-['Space_Grotesk']">
                    Available Chauffeurs
                  </h3>
                  <span className="bg-[#68dba9]/20 text-[#68dba9] font-mono text-[10px] px-2 py-0.5 rounded-full">
                    3 Ready for Dispatch
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#bccac0]">Live Radian Sort</span>
              </div>

              {drivers.map((drv) => {
                const isSelected = selectedDriverId === drv.id;
                return (
                  <div
                    key={drv.id}
                    onClick={() => setSelectedDriverId(drv.id)}
                    className={`rounded-xl p-4 shadow-sm cursor-pointer transition-all flex flex-col gap-3 border ${
                      isSelected
                        ? 'bg-[#181c24] border-[#68dba9] ring-1 ring-[#68dba9]/60 shadow-lg'
                        : 'bg-[#181c24] border-[#262a33] opacity-90 hover:opacity-100 hover:bg-[#1c2028]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-14 h-14 rounded-xl bg-[#68dba9]/20 border border-[#68dba9] flex items-center justify-center text-xl font-bold text-[#68dba9]">
                            {drv.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </div>
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#0f131c] rounded-full flex items-center justify-center">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#68dba9] animate-ping" />
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-[#dfe2ee] font-['Space_Grotesk']">
                              {drv.name}
                            </h3>
                            <span className="bg-[#25a475] text-[#00311f] text-[9px] font-bold px-2 py-0.5 rounded uppercase font-['Space_Grotesk']">
                              {drv.tag}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[#bccac0] font-mono text-[11px]">
                            <span className="text-[#68dba9] font-bold flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-xs">star</span>{' '}
                              {drv.rating}
                            </span>
                            <span>•</span>
                            <span>{drv.trips}</span>
                            <span>•</span>
                            <span>{drv.exp}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xl font-bold text-[#68dba9] block leading-none font-['Space_Grotesk']">
                          ₹{drv.rate}
                          <span className="text-xs font-mono text-[#bccac0] font-normal">/hr</span>
                        </span>
                        <span className="font-mono text-[10px] text-[#68dba9] mt-1 block">
                          ETA {drv.eta}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 bg-[#0a0e16]/60 p-2 rounded-lg border border-[#1c2028]">
                      <div className="flex items-center gap-2 font-mono text-[10px] text-[#bccac0]">
                        <span className="flex items-center gap-1 text-[#dfe2ee]">
                          <span className="material-symbols-outlined text-xs text-[#68dba9]">
                            verified_user
                          </span>{' '}
                          {drv.kyc}
                        </span>
                        <span>|</span>
                        <span>{drv.specialty}</span>
                      </div>
                      {isSelected ? (
                        <span className="font-mono text-[10px] text-[#68dba9] font-bold">
                          Active Selection
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-[#bccac0]">
                          Click to select
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Price Estimation Breakdown */}
            <div className="bg-[#181c24] rounded-xl p-4 shadow-sm border border-[#262a33] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#bccac0] tracking-wider font-['Space_Grotesk']">
                  Fare Calculation Breakdown
                </span>
                <span className="font-mono text-[10px] text-[#68dba9] flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">check_circle</span> Guaranteed
                  Rate
                </span>
              </div>

              <div className="space-y-1.5 font-mono text-xs text-[#bccac0]">
                <div className="flex justify-between items-center">
                  <span>Base Dispatch & Setup (incl. first 1 hr)</span>
                  <span className="text-[#dfe2ee]">₹350.00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>
                    Hourly Rate ({selectedDriver.name} @ ₹{selectedDriver.rate}/hr tier)
                  </span>
                  <span className="text-[#dfe2ee]">₹150.00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Zero-Deductible Platform Insurance</span>
                  <span className="text-[#dfe2ee]">₹25.00</span>
                </div>
                <div className="flex justify-between items-center text-[#68dba9] bg-[#68dba9]/10 p-2 rounded-lg border border-[#68dba9]/20">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs">confirmation_number</span>
                    <span>Promo Applied: FIRSTDRIVE</span>
                  </div>
                  <span className="font-bold">-₹100.00</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between bg-[#1c2028] p-3 rounded-lg border border-[#262a33]">
                <div>
                  <span className="text-[9px] font-bold uppercase text-[#bccac0] block font-['Space_Grotesk']">
                    Total Net Estimated
                  </span>
                  <span className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    ₹425.00
                  </span>
                </div>
                <div className="text-right font-mono text-[10px]">
                  <span className="text-[#bccac0] block">Billing starts upon driver handover</span>
                  <span className="text-[#68dba9]">No Cancellation Fee within 5m</span>
                </div>
              </div>

              {/* Primary CTA Button */}
              <button
                type="button"
                onClick={handleConfirmDispatch}
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#68dba9]/20 font-['Space_Grotesk'] disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-[#003825] border-t-transparent" />
                ) : (
                  <span className="material-symbols-outlined text-base">rocket_launch</span>
                )}
                <span>Confirm & Dispatch {selectedDriver.name}</span>
              </button>
            </div>
          </section>

          {/* Right Panel: Immersive Live Radar & Satellite Canvas (58% width) */}
          <section className="w-full xl:w-[58%] flex flex-col gap-4 relative shrink-0">
            {/* Radar Canvas Shell */}
            <div className="relative w-full h-[760px] rounded-2xl overflow-hidden bg-[#0a0e16] shadow-2xl flex flex-col justify-between p-4 border border-[#262a33]">
              {/* Radar Grid SVG */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                  <radialGradient id="radarSweep" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#68dba9" stopOpacity="0.25" />
                    <stop offset="60%" stopColor="#68dba9" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#0f131c" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <path
                  d="M0,190 H1000 M0,380 H1000 M0,570 H1000"
                  stroke="#31353e"
                  strokeWidth="1"
                  strokeDasharray="4 8"
                  opacity="0.4"
                />
                <path
                  d="M250,0 V800 M500,0 V800 M750,0 V800"
                  stroke="#31353e"
                  strokeWidth="1"
                  strokeDasharray="4 8"
                  opacity="0.4"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="90"
                  fill="none"
                  stroke="#68dba9"
                  strokeWidth="1"
                  strokeDasharray="3 6"
                  opacity="0.3"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="180"
                  fill="none"
                  stroke="#68dba9"
                  strokeWidth="1"
                  strokeDasharray="4 8"
                  opacity="0.25"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="280"
                  fill="none"
                  stroke="#68dba9"
                  strokeWidth="1"
                  strokeDasharray="6 12"
                  opacity="0.15"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="240"
                  fill="url(#radarSweep)"
                  className="animate-pulse"
                />
              </svg>

              {/* Sweep Ray Rotator */}
              <div className="absolute inset-0 origin-center animate-radar-sweep pointer-events-none">
                <div className="w-1/2 h-1/2 bg-gradient-to-br from-[#68dba9]/30 to-transparent origin-bottom-right transform rotate-45 rounded-tl-full" />
              </div>

              {/* Top Map HUD & Controls */}
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 bg-[#181c24]/90 backdrop-blur-xl p-3 rounded-xl shadow-lg border border-[#262a33]">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#68dba9] flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0f131c]" />
                    </span>
                    <span className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                      Radar Sector 04
                    </span>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 font-mono text-[10px] text-[#bccac0] bg-[#1c2028] px-2 py-1 rounded border border-[#262a33]">
                    <span>Sweep Band: 5.2 GHz</span>
                    <span>•</span>
                    <span className="text-[#68dba9]">Latency 14ms</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Search Radius Slider */}
                  <div className="flex items-center gap-2 bg-[#1c2028] px-3 py-1.5 rounded-lg border border-[#262a33]">
                    <span className="material-symbols-outlined text-xs text-[#bccac0]">radar</span>
                    <span className="font-mono text-[10px] text-[#bccac0]">Radius:</span>
                    <input
                      type="range"
                      min="2"
                      max="15"
                      value={radiusKm}
                      onChange={(e) => setRadiusKm(parseInt(e.target.value, 10))}
                      className="w-16 accent-[#68dba9] cursor-pointer h-1 bg-[#262a33] rounded-lg"
                    />
                    <span className="font-mono text-[10px] text-[#68dba9] font-bold">
                      {radiusKm}km
                    </span>
                  </div>

                  {/* View Style Toggle */}
                  <div className="flex items-center bg-[#1c2028] p-1 rounded-lg border border-[#262a33]">
                    <button
                      type="button"
                      onClick={() => setMapStyle('dark')}
                      className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                        mapStyle === 'dark' ? 'bg-[#262a33] text-[#dfe2ee]' : 'text-[#bccac0]'
                      }`}
                    >
                      Dark Grid
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapStyle('satellite')}
                      className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                        mapStyle === 'satellite' ? 'bg-[#262a33] text-[#dfe2ee]' : 'text-[#bccac0]'
                      }`}
                    >
                      Satellite
                    </button>
                  </div>
                </div>
              </div>

              {/* Customer Pin Anchor */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-none">
                <div className="relative flex items-center justify-center">
                  <span className="absolute w-12 h-12 rounded-full bg-[#68dba9]/30 animate-ping" />
                  <div className="w-6 h-6 rounded-full bg-[#68dba9] shadow-[0_0_16px_#68dba9] flex items-center justify-center text-[#003825]">
                    <span className="material-symbols-outlined text-xs font-bold">person_pin</span>
                  </div>
                </div>
                <div className="mt-2 bg-[#0a0e16]/90 backdrop-blur-md px-2.5 py-1 rounded shadow text-center border border-[#262a33]">
                  <span className="text-[9px] font-bold text-[#68dba9] uppercase block font-['Space_Grotesk']">
                    You (Pickup Anchor)
                  </span>
                  <span className="font-mono text-[9px] text-[#bccac0]">Vasant Vihar C-4/12</span>
                </div>
              </div>

              {/* Driver Pin Callouts */}
              <div
                onClick={() => setSelectedDriverId('vikram')}
                className="absolute left-[33%] top-[31%] z-30 flex flex-col items-center group cursor-pointer transition-transform hover:scale-110"
              >
                <div className="bg-[#68dba9] text-[#003825] font-bold text-[9px] px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 font-['Space_Grotesk']">
                  <span className="material-symbols-outlined text-[10px]">star</span>
                  <span>VIKRAM • 6m ETA</span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-[#0a0e16] p-0.5 shadow-xl mt-1 ring-2 ring-[#68dba9]">
                  <div className="w-full h-full rounded-lg bg-[#68dba9]/20 flex items-center justify-center text-xs font-bold text-[#68dba9]">
                    VS
                  </div>
                </div>
              </div>

              <div
                onClick={() => setSelectedDriverId('tariq')}
                className="absolute left-[68%] top-[24%] z-20 flex flex-col items-center group cursor-pointer transition-transform hover:scale-105"
              >
                <div className="bg-[#262a33] text-[#dfe2ee] font-bold text-[9px] px-2 py-0.5 rounded-full shadow flex items-center gap-1 font-['Space_Grotesk']">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#68dba9]" />
                  <span>TARIQ • 12m</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-[#0a0e16] p-0.5 shadow-lg mt-1 ring-1 ring-[#3d4a42]">
                  <div className="w-full h-full rounded-md bg-[#68dba9]/20 flex items-center justify-center text-xs font-bold text-[#68dba9]">
                    MT
                  </div>
                </div>
              </div>

              <div
                onClick={() => setSelectedDriverId('sunil')}
                className="absolute left-[24%] top-[70%] z-20 flex flex-col items-center group cursor-pointer transition-transform hover:scale-105"
              >
                <div className="bg-[#262a33] text-[#dfe2ee] font-bold text-[9px] px-2 py-0.5 rounded-full shadow flex items-center gap-1 font-['Space_Grotesk']">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#68dba9]" />
                  <span>SUNIL • 15m</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-[#0a0e16] p-0.5 shadow-lg mt-1 ring-1 ring-[#3d4a42]">
                  <div className="w-full h-full rounded-md bg-[#68dba9]/20 flex items-center justify-center text-xs font-bold text-[#68dba9]">
                    SS
                  </div>
                </div>
              </div>

              {/* Floating Selected Driver Preview Modal */}
              <div className="relative z-30 bg-[#181c24]/95 backdrop-blur-2xl p-4 rounded-xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 border border-[#68dba9]/30">
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 rounded-xl bg-[#68dba9]/20 border border-[#68dba9] flex items-center justify-center text-2xl font-bold text-[#68dba9]">
                      {selectedDriver.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <span className="absolute -top-1 -left-1 bg-[#68dba9] text-[#003825] text-[9px] font-bold px-1 py-0.2 rounded">
                      TOP PICK
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                        {selectedDriver.name}
                      </h4>
                      <span className="text-[#68dba9] font-bold font-mono text-xs flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-xs">star</span>{' '}
                        {selectedDriver.rating} ({selectedDriver.reviews} reviews)
                      </span>
                    </div>
                    <p className="text-xs text-[#bccac0] italic mt-0.5 line-clamp-1">
                      &quot;{selectedDriver.quote}&quot;
                    </p>
                    <div className="flex items-center gap-3 mt-1 font-mono text-[10px] text-[#bccac0]">
                      <span className="text-[#68dba9] flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">security</span> Police
                        Verified
                      </span>
                      <span>•</span>
                      <span>Non-Smoker</span>
                      <span>•</span>
                      <span>Languages: {selectedDriver.languages}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0">
                  <a
                    href="tel:+917740002020"
                    className="px-3 py-2 rounded-lg bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] font-mono text-xs flex items-center gap-1.5 transition-colors border border-[#3d4a42]"
                  >
                    <span className="material-symbols-outlined text-base text-[#68dba9]">call</span>
                    <span className="hidden sm:inline">Dispatch Desk</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleConfirmDispatch}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-bold text-xs flex items-center gap-1.5 transition-colors shadow font-['Space_Grotesk']"
                  >
                    <span className="material-symbols-outlined text-base">lock</span>
                    <span>Lock {selectedDriver.name.split(' ')[0]}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Telemetry & SLA Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#181c24] p-3 rounded-xl border border-[#262a33] flex items-center gap-3">
                <span className="material-symbols-outlined text-[#68dba9] text-2xl">timer</span>
                <div>
                  <span className="text-[9px] font-bold uppercase text-[#bccac0] block font-['Space_Grotesk']">
                    Average Arrival
                  </span>
                  <span className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    6.8 <span className="text-xs font-normal">mins</span>
                  </span>
                </div>
              </div>

              <div className="bg-[#181c24] p-3 rounded-xl border border-[#262a33] flex items-center gap-3">
                <span className="material-symbols-outlined text-[#68dba9] text-2xl">
                  verified_user
                </span>
                <div>
                  <span className="text-[9px] font-bold uppercase text-[#bccac0] block font-['Space_Grotesk']">
                    Background Pass
                  </span>
                  <span className="text-xl font-bold text-[#68dba9] font-['Space_Grotesk']">
                    100%
                  </span>
                </div>
              </div>

              <div className="bg-[#181c24] p-3 rounded-xl border border-[#262a33] flex items-center gap-3">
                <span className="material-symbols-outlined text-[#68dba9] text-2xl">shield</span>
                <div>
                  <span className="text-[9px] font-bold uppercase text-[#bccac0] block font-['Space_Grotesk']">
                    Transit Cover
                  </span>
                  <span className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    ₹50L <span className="text-xs font-normal">Policy</span>
                  </span>
                </div>
              </div>

              <div className="bg-[#181c24] p-3 rounded-xl border border-[#262a33] flex items-center gap-3">
                <span className="material-symbols-outlined text-[#68dba9] text-2xl">
                  support_agent
                </span>
                <div>
                  <span className="text-[9px] font-bold uppercase text-[#bccac0] block font-['Space_Grotesk']">
                    SOS Response
                  </span>
                  <span className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    &lt; 30s
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </ControlStationLayout>
  );
}

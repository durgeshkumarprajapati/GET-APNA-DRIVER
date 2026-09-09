'use client';

import { DriverLayout } from '@/components/driver-layout';

export default function DriverSosSupportPage() {
  const triggerEmergency = () => {
    alert(
      'ALERT: Driver Cockpit Silent SOS Broadcasted to Police Command (112) & SOC Hotline (+91 11 4099 2200)!',
    );
  };

  return (
    <DriverLayout activePath="sos-support">
      <div className="flex flex-col w-full px-6 py-6 gap-6">
        <div className="flex items-center justify-between p-6 rounded-xl bg-[#181c24] border border-[#262a33]">
          <div>
            <span className="text-[10px] font-bold text-[#ffb4ab] uppercase tracking-wider font-['Space_Grotesk'] block">
              24x7 CHAUFFEUR SAFETY &amp; INCIDENT DESK
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              Driver SOS Emergency &amp; Tactical Hotline
            </h1>
            <p className="text-xs text-[#bccac0] mt-1">
              Instant hardware silent trigger link to Security Operations Center (SOC) and Police
              Dispatch.
            </p>
          </div>
        </div>

        <div className="p-8 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col items-center justify-center text-center gap-6 max-w-xl mx-auto shadow-2xl">
          <button
            type="button"
            onClick={triggerEmergency}
            className="w-36 h-36 rounded-full bg-[#93000a] hover:bg-[#b3000f] text-[#ffdad6] font-bold flex flex-col items-center justify-center gap-2 shadow-2xl ring-4 ring-[#ffb4ab]/40 transition-all"
          >
            <span className="material-symbols-outlined text-4xl animate-pulse">emergency</span>
            <span className="text-xs uppercase font-['Space_Grotesk']">TRIGGER SOS</span>
          </button>

          <div className="text-xs text-[#bccac0] space-y-1">
            <p className="font-bold text-[#dfe2ee]">Instant Armed Response Dispatch</p>
            <p>Pushes vehicle GPS coordinates &amp; active audio buffer to SOC Okhla Command.</p>
          </div>
        </div>
      </div>
    </DriverLayout>
  );
}

'use client';

import { useState } from 'react';
import { CustomerLayout } from '@/components/customer-layout';

export default function CustomerSafetySosPage() {
  const [holdingSos, setHoldingSos] = useState(false);
  const [sosTriggered, setSosTriggered] = useState(false);
  const [autoShare, setAutoShare] = useState(true);
  const [pinHandover, setPinHandover] = useState(true);
  const [nightCheckin, setNightCheckin] = useState(true);
  const [routeDeviation, setRouteDeviation] = useState(true);

  const handleSosClick = () => {
    setSosTriggered(true);
    alert(
      'ALERT: SOS DEPLOYED! 256-bit audio stream & GPS beacons dispatched to Delhi NCR SOC & 3 contacts!',
    );
  };

  return (
    <CustomerLayout>
      <div className="flex flex-col w-full gap-6">
        {/* TOP PROTOCOL BANNER & EMERGENCY CALL BUTTONS */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl bg-[#181c24] border border-[#262a33]">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ffb4ab] animate-ping" />
              <span className="text-[10px] font-bold text-[#ffb4ab] uppercase tracking-widest font-['Space_Grotesk']">
                EMERGENCY DISPATCH PROTOCOL • 24x7 ARMED FLEET SOC MONITORING
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              Executive Threat Response &amp; Incident Control
            </h1>
            <p className="text-xs text-[#bccac0] max-w-2xl">
              Direct hardware-level link with New Delhi Police Command and Apna Driver Tactical
              Security Operations Center (SOC). In-transit audio buffering is active and ready for
              cryptographic escalation.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href="tel:112"
              className="px-4 py-2.5 rounded-lg bg-[#93000a] hover:bg-[#b3000f] text-[#ffdad6] font-bold text-xs flex items-center gap-2 shadow-md transition-all font-['Space_Grotesk']"
            >
              <span className="material-symbols-outlined text-base">local_police</span>
              <span>POLICE DISPATCH: Dial 112</span>
            </a>

            <a
              href="tel:+911140992200"
              className="px-4 py-2.5 rounded-lg bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] font-bold text-xs flex items-center gap-2 transition-all border border-[#3d4a42] font-['Space_Grotesk']"
            >
              <span className="material-symbols-outlined text-base text-[#68dba9]">
                headset_mic
              </span>
              <span>APNA CRISIS DESK: +91 11 4099 2200</span>
            </a>
          </div>
        </section>

        {/* MAIN CONTENT ROW 1: SILENT SOC DEPLOYMENT & ACTIVE TELEMATICS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: One-Touch Silent SOC Deployment (6 cols) */}
          <section className="lg:col-span-6 p-6 rounded-xl bg-[#181c24] border border-[#262a33] shadow-sm flex flex-col justify-between gap-5 relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk']">
                LEVEL 1 EMERGENCY TRIGGER
              </span>
              <span className="px-2 py-0.5 rounded bg-[#93000a] text-[#ffdad6] font-mono text-[9px] font-bold uppercase">
                FAILSAFE ACTIVE
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                One-Touch Silent SOC Deployment
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-[#0a0e16] border border-[#262a33]">
              <button
                type="button"
                onClick={handleSosClick}
                onMouseDown={() => setHoldingSos(true)}
                onMouseUp={() => setHoldingSos(false)}
                className={`w-32 h-32 rounded-2xl flex flex-col items-center justify-center gap-1 shrink-0 transition-all shadow-2xl ${
                  sosTriggered
                    ? 'bg-[#93000a] text-[#ffdad6] ring-4 ring-[#ffb4ab]'
                    : holdingSos
                      ? 'bg-[#b3000f] text-[#ffdad6] scale-95'
                      : 'bg-[#93000a]/80 hover:bg-[#93000a] text-[#ffdad6]'
                }`}
              >
                <span className="material-symbols-outlined text-4xl animate-pulse">emergency</span>
                <span className="font-bold text-xs uppercase font-['Space_Grotesk']">
                  TRIGGER SOS
                </span>
                <span className="font-mono text-[9px]">HOLD 2 SECONDS</span>
              </button>

              <div className="flex flex-col gap-2 text-xs text-[#bccac0]">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[#68dba9] text-base shrink-0 mt-0.5">
                    check_circle
                  </span>
                  <span>Instantaneous 256-bit encrypted audio streaming to Delhi NCR SOC.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[#68dba9] text-base shrink-0 mt-0.5">
                    check_circle
                  </span>
                  <span>
                    Nearest Armed Response Vehicle / PCR Van auto-routed to live coordinates.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[#68dba9] text-base shrink-0 mt-0.5">
                    check_circle
                  </span>
                  <span>
                    Autonomous SMS &amp; WhatsApp SOS beacon dispatched to 3 trusted contacts.
                  </span>
                </div>
                <p className="font-mono text-[10px] text-[#87948b] mt-1">
                  Dual-confirmation safeguard prevents false triggers. SOC validates telemetry
                  immediately.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 font-mono text-xs text-[#bccac0] border-t border-[#262a33]">
              <span>System Self-Diagnostic: Latency 14ms (Healthy)</span>
              <button
                type="button"
                onClick={() => alert('Silent hardware drill initiated successfully.')}
                className="text-[#68dba9] hover:underline flex items-center gap-1 font-bold"
              >
                <span>RUN SILENT HARDWARE DRILL</span>
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </button>
            </div>
          </section>

          {/* RIGHT: Active Telematics Status (6 cols) */}
          <section className="lg:col-span-6 p-6 rounded-xl bg-[#181c24] border border-[#262a33] shadow-sm flex flex-col justify-between gap-5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk']">
                Active Telematics Status
              </span>
              <span className="px-2 py-0.5 rounded bg-[#25a475] text-[#00311f] font-mono text-[9px] font-bold uppercase">
                GPS LOCKED
              </span>
            </div>

            {/* Simulated Live Coordinates Terminal */}
            <div className="p-4 rounded-xl bg-[#0a0e16] border border-[#262a33] font-mono text-xs text-[#dfe2ee] space-y-1">
              <div className="flex justify-between items-center text-[#68dba9] font-bold">
                <span>LAT 28.5603° N, LON 77.1627° E</span>
                <span className="text-[10px] text-[#bccac0]">Corridor Ping: 1.2s</span>
              </div>
              <div className="w-full h-16 bg-[#181c24] rounded-lg p-2 relative overflow-hidden border border-[#262a33] flex items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#68dba9]/10 via-transparent to-transparent" />
                <span className="font-mono text-[10px] text-[#68dba9] animate-pulse">
                  ● LIVE ENCRYPTED BEACON STREAMING TO SOC OKHLA HUB
                </span>
              </div>
            </div>

            {/* 4 Telemetry Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-[#0a0e16] border border-[#262a33]">
                <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] block">
                  GEOFENCE COMPLIANCE
                </span>
                <strong className="text-base text-[#68dba9] font-['Space_Grotesk'] block mt-0.5">
                  100% Locked
                </strong>
                <span className="font-mono text-[9px] text-[#bccac0]">Safe corridor; 0% dev</span>
              </div>

              <div className="p-3 rounded-lg bg-[#0a0e16] border border-[#262a33]">
                <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] block">
                  SPEED TELEMETRY
                </span>
                <strong className="text-base text-[#dfe2ee] font-['Space_Grotesk'] block mt-0.5">
                  42 km/h
                </strong>
                <span className="font-mono text-[9px] text-[#68dba9]">
                  In 50 km/h zone (Normal)
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#0a0e16] border border-[#262a33]">
                <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] block">
                  CABIN AUDIO BUFFER
                </span>
                <strong className="text-base text-[#dfe2ee] font-['Space_Grotesk'] block mt-0.5">
                  AES-256
                </strong>
                <span className="font-mono text-[9px] text-[#bccac0]">
                  Encrypted hardware standby
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#0a0e16] border border-[#262a33]">
                <span className="text-[9px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] block">
                  SOC NETWORK HUB
                </span>
                <strong className="text-base text-[#dfe2ee] font-['Space_Grotesk'] block mt-0.5">
                  Tier-1 Okhla
                </strong>
                <span className="font-mono text-[9px] text-[#bccac0]">
                  Backup: CyberCity Gurugram
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* MAIN CONTENT ROW 2: TRUSTED CIRCLE & SAFETY PREFERENCES */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Trusted Circle Emergency Contacts (6 cols) */}
          <section className="lg:col-span-6 p-6 rounded-xl bg-[#181c24] border border-[#262a33] shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk'] block">
                  RAPID ALERT NETWORK
                </span>
                <h3 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Trusted Circle (Emergency Contacts)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  const name = prompt('Enter Contact Name:');
                  const phone = prompt('Enter Mobile Number:');
                  if (name && phone) alert(`Added ${name} (${phone}) to Emergency Circle.`);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#25a475] hover:bg-[#68dba9] text-[#00311f] font-bold text-xs flex items-center gap-1 font-['Space_Grotesk']"
              >
                <span className="material-symbols-outlined text-sm">person_add</span>
                <span>Add Contact</span>
              </button>
            </div>

            <p className="text-xs text-[#bccac0]">
              These authorized individuals receive real-time vehicle telemetry dynamic route maps
              and chauffeur contact pins automatically upon any trip anomaly or manual SOS trigger.
            </p>

            <div className="flex flex-col gap-3">
              {/* Contact 1 */}
              <div className="p-3.5 rounded-lg bg-[#0a0e16] border border-[#262a33] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#25a475]/20 text-[#68dba9] font-bold flex items-center justify-center text-xs font-['Space_Grotesk']">
                    RS
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                        Radhika Sharma
                      </h4>
                      <span className="px-1.5 py-0.2 rounded bg-[#262a33] text-[#bccac0] font-mono text-[9px]">
                        Wife • Primary
                      </span>
                    </div>
                    <span className="font-mono text-xs text-[#87948b]">+91 98100 44219</span>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-[#68dba9] bg-[#25a475]/10 px-2.5 py-1 rounded border border-[#25a475]/30">
                  SMS + WhatsApp Link Active
                </span>
              </div>

              {/* Contact 2 */}
              <div className="p-3.5 rounded-lg bg-[#0a0e16] border border-[#262a33] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0053db]/20 text-[#b4c5ff] font-bold flex items-center justify-center text-xs font-['Space_Grotesk']">
                    SK
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                        Dr. Sameer Kapoor
                      </h4>
                      <span className="px-1.5 py-0.2 rounded bg-[#262a33] text-[#bccac0] font-mono text-[9px]">
                        Brother
                      </span>
                    </div>
                    <span className="font-mono text-xs text-[#87948b]">+91 96201 55920</span>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-[#68dba9] bg-[#25a475]/10 px-2.5 py-1 rounded border border-[#25a475]/30">
                  Auto-Broadcast Active
                </span>
              </div>

              {/* Contact 3 */}
              <div className="p-3.5 rounded-lg bg-[#0a0e16] border border-[#262a33] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#262a33] text-[#dfe2ee] font-bold flex items-center justify-center text-xs font-['Space_Grotesk']">
                    ES
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                        Enterprise Security Desk (Deloitte)
                      </h4>
                      <span className="px-1.5 py-0.2 rounded bg-[#262a33] text-[#b4c5ff] font-mono text-[9px]">
                        Corporate SLA
                      </span>
                    </div>
                    <span className="font-mono text-xs text-[#87948b]">+91 11 6620 1000</span>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-[#68dba9] bg-[#25a475]/10 px-2.5 py-1 rounded border border-[#25a475]/30">
                  SOC API Webhook Synced
                </span>
              </div>
            </div>
          </section>

          {/* RIGHT: Ride Safety Preferences Toolkit (6 cols) */}
          <section className="lg:col-span-6 p-6 rounded-xl bg-[#181c24] border border-[#262a33] shadow-sm flex flex-col gap-4">
            <div>
              <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk'] block">
                PREVENTATIVE CONTROLS
              </span>
              <h3 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                Ride Safety Preferences Toolkit
              </h3>
            </div>

            <div className="flex flex-col gap-3">
              {/* Toggle 1 */}
              <div className="p-3.5 rounded-lg bg-[#0a0e16] border border-[#262a33] flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                    Auto-Share Every Trip With Family
                  </h4>
                  <p className="text-xs text-[#bccac0] mt-0.5">
                    Dispatches link upon booking acceptance without manual steps.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoShare(!autoShare)}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                    autoShare ? 'bg-[#68dba9]' : 'bg-[#262a33]'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-[#0f131c] absolute top-1 transition-transform ${
                      autoShare ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 2 */}
              <div className="p-3.5 rounded-lg bg-[#0a0e16] border border-[#262a33] flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                    Start-of-Ride PIN Handover
                  </h4>
                  <p className="text-xs text-[#bccac0] mt-0.5">
                    Driver ignition immobilized until 4-digit code is verified.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPinHandover(!pinHandover)}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                    pinHandover ? 'bg-[#68dba9]' : 'bg-[#262a33]'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-[#0f131c] absolute top-1 transition-transform ${
                      pinHandover ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 3 */}
              <div className="p-3.5 rounded-lg bg-[#0a0e16] border border-[#262a33] flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                    Night Escort Virtual Check-in
                  </h4>
                  <p className="text-xs text-[#bccac0] mt-0.5">
                    Auto-SOC dispatch officer voice call if stopped &gt; 5 mins between 22:00-05:00.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNightCheckin(!nightCheckin)}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                    nightCheckin ? 'bg-[#68dba9]' : 'bg-[#262a33]'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-[#0f131c] absolute top-1 transition-transform ${
                      nightCheckin ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 4 */}
              <div className="p-3.5 rounded-lg bg-[#0a0e16] border border-[#262a33] flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                    Route Deviation Alert
                  </h4>
                  <p className="text-xs text-[#bccac0] mt-0.5">
                    Triggers instant push &amp; SMS if detour exceeds 400 meters from mapped route.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRouteDeviation(!routeDeviation)}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                    routeDeviation ? 'bg-[#68dba9]' : 'bg-[#262a33]'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-[#0f131c] absolute top-1 transition-transform ${
                      routeDeviation ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* COMPLIANCE & AUDITING STANDARDS: CHAUFFEUR SECURITY CLEARANCE MATRIX */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk'] block">
                COMPLIANCE &amp; AUDITING STANDARDS
              </span>
              <h2 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                Chauffeur Security Clearance Matrix
              </h2>
            </div>
            <span className="font-mono text-xs text-[#68dba9] flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">verified_user</span>
              Every driver passes a 5-tier statutory background check
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1 */}
            <div className="p-5 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="material-symbols-outlined text-[#68dba9] text-2xl">
                    security
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#25a475]/20 text-[#68dba9] font-mono text-[10px] font-bold">
                    CCTNS 100%
                  </span>
                </div>
                <h3 className="font-bold text-base text-[#dfe2ee] mt-3 font-['Space_Grotesk']">
                  Criminal Registry Clearance
                </h3>
                <p className="text-xs text-[#bccac0] mt-1">
                  Verified across all State Police databases through Ministry of Home Affairs CCTNS
                  integration.
                </p>
              </div>
              <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] pt-2 border-t border-[#262a33]">
                ZERO INCIDENT RECORD REQUIRED
              </span>
            </div>

            {/* Card 2 */}
            <div className="p-5 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="material-symbols-outlined text-[#68dba9] text-2xl">
                    fingerprint
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#25a475]/20 text-[#68dba9] font-mono text-[10px] font-bold">
                    UIDAI AUTH
                  </span>
                </div>
                <h3 className="font-bold text-base text-[#dfe2ee] mt-3 font-['Space_Grotesk']">
                  Aadhaar Biometric Verification
                </h3>
                <p className="text-xs text-[#bccac0] mt-1">
                  Instant IRIS &amp; Fingerprint match validation via UIDAI e-KYC. Impersonation
                  mathematically impossible.
                </p>
              </div>
              <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] pt-2 border-t border-[#262a33]">
                LIVE HARDWARE ONBOARDING
              </span>
            </div>

            {/* Card 3 */}
            <div className="p-5 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="material-symbols-outlined text-[#68dba9] text-2xl">badge</span>
                  <span className="px-2 py-0.5 rounded bg-[#25a475]/20 text-[#68dba9] font-mono text-[10px] font-bold">
                    SARATHI MoRTH
                  </span>
                </div>
                <h3 className="font-bold text-base text-[#dfe2ee] mt-3 font-['Space_Grotesk']">
                  Commercial Transport License
                </h3>
                <p className="text-xs text-[#bccac0] mt-1">
                  Authenticated via MoRTH Sarathi portal. Heavy Passenger &amp; Commercial
                  endorsement with &gt; 5 yrs history.
                </p>
              </div>
              <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] pt-2 border-t border-[#262a33]">
                CHAUFFEUR ACADEMY GRADUATE
              </span>
            </div>

            {/* Card 4 */}
            <div className="p-5 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="material-symbols-outlined text-[#68dba9] text-2xl">
                    vaccines
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#25a475]/20 text-[#68dba9] font-mono text-[10px] font-bold">
                    0.00% BAC
                  </span>
                </div>
                <h3 className="font-bold text-base text-[#dfe2ee] mt-3 font-['Space_Grotesk']">
                  Breathalyzer Spot Inspections
                </h3>
                <p className="text-xs text-[#bccac0] mt-1">
                  Zero-tolerance random fuel-cell breathalyzer inspections conducted before every
                  shift start.
                </p>
              </div>
              <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk'] pt-2 border-t border-[#262a33]">
                CONTINUOUS TELEMATICS GAUGING
              </span>
            </div>
          </div>
        </section>

        {/* BOTTOM POLICY BANNER */}
        <section className="p-6 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#25a475]/20 text-[#68dba9] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">verified_user</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  ₹50,00,000 In-Transit Transit Insurance Protection
                </h3>
                <span className="px-2 py-0.5 rounded bg-[#25a475] text-[#00311f] font-mono text-[9px] font-bold uppercase">
                  ACTIVE POLICY
                </span>
              </div>
              <p className="text-xs text-[#bccac0] mt-1">
                Underwritten by ICICI Lombard General Insurance. Complete coverage for accidental
                medical expenses, hospitalization, and emergency air ambulance extraction on all
                active trips booked via Get Apna Driver.
              </p>
              <div className="flex items-center gap-4 font-mono text-[11px] text-[#87948b] mt-2">
                <span>
                  Policy No: <strong>GAD-IN-2025-884910</strong>
                </span>
                <span>•</span>
                <span>
                  Validity: <strong>31 Dec 2025</strong>
                </span>
                <span>•</span>
                <span>
                  Claims Desk: <strong className="text-[#68dba9]">claims@apnadriver.com</strong>
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => alert('Downloading official insurance certificate PDF...')}
            className="px-4 py-2.5 rounded-lg bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] font-bold text-xs flex items-center gap-2 shrink-0 border border-[#3d4a42] font-['Space_Grotesk'] transition-all"
          >
            <span className="material-symbols-outlined text-base text-[#68dba9]">download</span>
            <span>Download Policy Card</span>
          </button>
        </section>
      </div>
    </CustomerLayout>
  );
}

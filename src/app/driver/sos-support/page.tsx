'use client';

import { useState } from 'react';
import { DriverLayout } from '@/components/driver-layout';
import { PageHeader } from '@/components/ui/page-header';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { IncidentStatusBadge, IncidentSeverityBadge } from '@/components/ui/incident-status';
import { useActiveBooking } from '@/components/use-active-booking';
import { useSosTrigger } from '@/components/use-sos-trigger';
import { useSafetyIncidents } from '@/components/use-safety-incidents';
import { formatDateTime } from '@/shared/formatting/date';
import { DirectCallResponse } from '@/modules/calling/domain/types';

interface DriverBooking {
  id: string;
  status: string;
  createdAt: string;
  pickupLocation: { address: string; label: string | null };
}

const GEOLOCATION_MESSAGES: Record<string, string> = {
  DENIED:
    'Location permission was denied — the SOS will still be sent using your last known location on file.',
  UNAVAILABLE:
    'Your current position could not be determined — the SOS will still be sent using your last known location on file.',
  TIMEOUT:
    'Locating your position timed out — the SOS will still be sent using your last known location on file.',
  UNSUPPORTED:
    'Location is not supported by this browser — the SOS will still be sent using your last known location on file.',
};

export default function DriverSosSupportPage() {
  const { activeBooking, loading: bookingLoading } = useActiveBooking<DriverBooking>(
    '/api/driver/bookings',
    'bookings',
  );
  const sos = useSosTrigger(activeBooking?.id);
  const { incidents, loading: incidentsLoading, refetch: refetchIncidents } = useSafetyIncidents();

  const [calling, setCalling] = useState(false);
  const [callData, setCallData] = useState<DirectCallResponse | null>(null);
  const [callError, setCallError] = useState<string | null>(null);

  const handleCallCustomerCare = async () => {
    try {
      setCalling(true);
      setCallError(null);
      const res = await fetch('/api/driver/support/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Driver SOS Helpline' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to initiate call');
      }
      setCallData(data.data);
    } catch (err: unknown) {
      setCallError(err instanceof Error ? err.message : 'Error connecting call');
    } finally {
      setCalling(false);
    }
  };

  const handleConfirm = async () => {
    await sos.confirmAndTrigger();
    refetchIncidents();
  };

  return (
    <DriverLayout>
      <div className="flex flex-col w-full px-6 py-6 gap-6">
        <PageHeader
          eyebrow="24x7 Driver Safety Desk"
          title="Driver SOS Emergency"
          subtitle="Trigger an emergency alert at any time — this creates a real, tracked safety incident."
        />

        <div className="p-8 rounded-xl bg-[#93000a]/10 border border-[#93000a]/40 flex flex-col items-center justify-center text-center gap-6 max-w-xl mx-auto">
          {sos.status === 'success' && sos.incident ? (
            <div className="space-y-2">
              <span className="material-symbols-outlined text-4xl text-[#68dba9]">
                check_circle
              </span>
              <h2 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                Help is on the way
              </h2>
              <p className="text-sm text-[#bccac0]">
                Incident <strong className="text-[#dfe2ee]">{sos.incident.incidentNumber}</strong>{' '}
                has been created and our safety team has been notified.
              </p>
              <button
                type="button"
                onClick={sos.reset}
                className="text-xs text-[#68dba9] hover:underline"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                disabled={sos.status === 'submitting'}
                onClick={sos.requestConfirmation}
                className="w-36 h-36 rounded-full bg-[#93000a] hover:bg-[#b3000f] disabled:opacity-60 text-[#ffdad6] font-bold flex flex-col items-center justify-center gap-2 shadow-2xl ring-4 ring-[#ffb4ab]/40 transition-all"
              >
                <span className="material-symbols-outlined text-4xl">emergency</span>
                <span className="text-xs uppercase font-['Space_Grotesk']">
                  {sos.status === 'submitting' ? 'Sending…' : 'Trigger SOS'}
                </span>
              </button>
              <div className="text-xs text-[#bccac0] space-y-1">
                <p className="font-bold text-[#dfe2ee]">Instant Safety Team Dispatch</p>
                <p>Sends your current location and active trip context to our safety team.</p>
              </div>
              {sos.status === 'error' && sos.error && (
                <p className="text-xs text-[#ffb4ab] font-bold">{sos.error}</p>
              )}
              {(sos.geolocationStatus === 'DENIED' ||
                sos.geolocationStatus === 'UNAVAILABLE' ||
                sos.geolocationStatus === 'TIMEOUT' ||
                sos.geolocationStatus === 'UNSUPPORTED') && (
                <p className="text-[10px] text-[#87948b] max-w-md">
                  {GEOLOCATION_MESSAGES[sos.geolocationStatus]}
                </p>
              )}
            </>
          )}
        </div>

        {/* 24x7 Customer Care Voice Helpline Card */}
        <div className="p-6 rounded-xl bg-[#0053db]/10 border border-[#0053db]/40 flex flex-col md:flex-row items-center justify-between gap-4 max-w-xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#70a1ff] text-3xl">phone_in_talk</span>
            <div>
              <h3 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                Direct Driver Support Helpline
              </h3>
              <p className="text-xs text-[#bccac0]">
                Need immediate phone assistance from Customer Care? Click to connect.
              </p>
              {callData && (
                <div className="mt-2 text-xs text-[#68dba9] font-mono">
                  Call Session: {callData.callSessionId.substring(0, 8)} • Dial {callData.dialNumber}
                </div>
              )}
              {callError && <p className="mt-1 text-xs text-[#ffb4ab] font-bold">{callError}</p>}
            </div>
          </div>
          <button
            type="button"
            disabled={calling}
            onClick={handleCallCustomerCare}
            className="px-5 py-2.5 rounded-xl bg-[#0053db] hover:bg-[#2b75ff] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md font-['Space_Grotesk'] shrink-0"
          >
            <span className="material-symbols-outlined text-lg">call</span>
            <span>{calling ? 'Connecting…' : 'Call Support'}</span>
          </button>
        </div>

        <section className="p-5 rounded-xl bg-[#181c24] border border-[#262a33] space-y-2">
          <h2 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
            Active Trip Context
          </h2>
          {bookingLoading ? (
            <LoadingState message="Checking for an active trip…" />
          ) : activeBooking ? (
            <div className="text-xs text-[#bccac0] space-y-1">
              <p>
                Booking <span className="font-mono text-[#dfe2ee]">{activeBooking.id}</span> —{' '}
                <span className="text-[#68dba9]">{activeBooking.status}</span>
              </p>
              <p>Pickup: {activeBooking.pickupLocation.address}</p>
              <p className="text-[10px] text-[#87948b]">
                This trip will be automatically linked to your SOS alert.
              </p>
            </div>
          ) : (
            <p className="text-xs text-[#87948b]">
              No active trip right now — your SOS will still be sent with your current location.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
            Incident History
          </h2>
          {incidentsLoading ? (
            <LoadingState message="Loading incident history…" />
          ) : incidents.length === 0 ? (
            <EmptyState icon="shield" message="No safety incidents on record." />
          ) : (
            <div className="flex flex-col gap-2">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex items-center justify-between gap-4 flex-wrap"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-[#dfe2ee]">
                        {incident.incidentNumber}
                      </span>
                      <IncidentStatusBadge status={incident.status} />
                      <IncidentSeverityBadge severity={incident.severity} />
                    </div>
                    <span className="text-[10px] font-mono text-[#87948b]">
                      {incident.type} • {formatDateTime(incident.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={sos.status === 'confirming'}
        title="Trigger Emergency SOS?"
        message="This will immediately create a real safety incident and alert our safety team with your current location. Only proceed if you need help."
        confirmLabel="Yes, Send SOS"
        cancelLabel="Cancel"
        danger
        onConfirm={() => void handleConfirm()}
        onCancel={sos.cancelConfirmation}
      />
    </DriverLayout>
  );
}

'use client';

import { CustomerLayout } from '@/components/customer-layout';
import { PageHeader } from '@/components/ui/page-header';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { IncidentStatusBadge, IncidentSeverityBadge } from '@/components/ui/incident-status';
import { useActiveBooking } from '@/components/use-active-booking';
import { useSosTrigger } from '@/components/use-sos-trigger';
import { useSafetyIncidents } from '@/components/use-safety-incidents';
import { formatDateTime } from '@/shared/formatting/date';

interface CustomerBooking {
  id: string;
  status: string;
  createdAt: string;
  pickupLocation: { address: string; label: string | null };
  dropoffLocation?: { address: string; label: string | null } | null;
  assignedDriver?: { displayName: string | null } | null;
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

export default function CustomerSafetySosPage() {
  const { activeBooking, loading: bookingLoading } = useActiveBooking<CustomerBooking>(
    '/api/bookings',
    'bookings',
  );
  const sos = useSosTrigger(activeBooking?.id);
  const { incidents, loading: incidentsLoading, refetch: refetchIncidents } = useSafetyIncidents();

  const handleConfirm = async () => {
    await sos.confirmAndTrigger();
    refetchIncidents();
  };

  return (
    <CustomerLayout>
      <div className="flex flex-col w-full gap-6">
        <PageHeader
          eyebrow="Emergency"
          title="Safety & SOS"
          subtitle="Trigger an emergency alert at any time — this creates a real, tracked safety incident."
        />

        <section className="p-6 rounded-xl bg-[#93000a]/10 border border-[#93000a]/40 flex flex-col items-center gap-4 text-center">
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
                className="w-32 h-32 rounded-full bg-[#93000a] hover:bg-[#b3000d] disabled:opacity-60 text-[#ffdad6] font-bold text-xl font-['Space_Grotesk'] shadow-[0_0_40px_rgba(147,0,10,0.5)] transition-colors flex items-center justify-center"
              >
                {sos.status === 'submitting' ? 'Sending…' : 'SOS'}
              </button>
              <p className="text-xs text-[#ffb4ab] max-w-md">
                Press the button, then confirm. This creates a real emergency safety incident and
                notifies our safety team immediately.
              </p>
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
        </section>

        <section className="p-5 rounded-xl bg-[#181c24] border border-[#262a33] space-y-2">
          <h2 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
            Active Booking Context
          </h2>
          {bookingLoading ? (
            <LoadingState message="Checking for an active trip…" />
          ) : activeBooking ? (
            <div className="text-xs text-[#bccac0] space-y-1">
              <p>
                Booking <span className="font-mono text-[#dfe2ee]">{activeBooking.id}</span> —{' '}
                <span className="text-[#68dba9]">{activeBooking.status}</span>
              </p>
              {activeBooking.assignedDriver?.displayName && (
                <p>Driver: {activeBooking.assignedDriver.displayName}</p>
              )}
              <p>Pickup: {activeBooking.pickupLocation.address}</p>
              {activeBooking.dropoffLocation && (
                <p>Dropoff: {activeBooking.dropoffLocation.address}</p>
              )}
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
    </CustomerLayout>
  );
}

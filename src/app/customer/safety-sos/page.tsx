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
import { useTranslation } from '@/i18n/context';

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
  const { t, formatDate } = useTranslation();
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
          eyebrow={t('customer.safety.eyebrow')}
          title={t('customer.safety.title')}
          subtitle={t('customer.safety.subtitle')}
        />

        <section className="p-6 rounded-xl bg-destructive/10 border border-destructive/30 flex flex-col items-center gap-4 text-center">
          {sos.status === 'success' && sos.incident ? (
            <div className="space-y-2">
              <span className="material-symbols-outlined text-4xl text-primary">
                check_circle
              </span>
              <h2 className="text-lg font-bold text-on-surface font-['Space_Grotesk']">
                {t('customer.safety.sosTriggeredTitle')}
              </h2>
              <p className="text-sm text-on-surface-variant">
                {t('customer.safety.sosTriggeredDesc')} (
                <strong className="text-on-surface">{sos.incident.incidentNumber}</strong>)
              </p>
              <button
                type="button"
                onClick={sos.reset}
                className="min-h-[40px] px-2 text-xs text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
                className="w-32 h-32 rounded-full bg-destructive hover:opacity-90 active:opacity-100 disabled:opacity-60 disabled:cursor-not-allowed text-destructive-foreground font-bold text-xl font-['Space_Grotesk'] shadow-lg shadow-destructive/30 transition-all flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
              >
                {sos.status === 'submitting' ? 'Sending…' : 'SOS'}
              </button>
              <p className="text-xs text-destructive max-w-md">
                {t('customer.safety.emergencyDesc')}
              </p>
              {sos.status === 'error' && sos.error && (
                <p className="text-xs text-destructive font-bold">{sos.error}</p>
              )}
              {(sos.geolocationStatus === 'DENIED' ||
                sos.geolocationStatus === 'UNAVAILABLE' ||
                sos.geolocationStatus === 'TIMEOUT' ||
                sos.geolocationStatus === 'UNSUPPORTED') && (
                <p className="text-[10px] text-on-surface-variant max-w-md">
                  {GEOLOCATION_MESSAGES[sos.geolocationStatus]}
                </p>
              )}
            </>
          )}
        </section>

        <section className="p-5 rounded-xl bg-surface-container border border-border space-y-2 shadow-sm">
          <h2 className="text-sm font-bold text-on-surface font-['Space_Grotesk']">
            Active Booking Context
          </h2>
          {bookingLoading ? (
            <LoadingState message="Checking for an active booking…" />
          ) : activeBooking ? (
            <div className="text-xs text-on-surface-variant space-y-1">
              <p>
                Booking <span className="font-mono text-on-surface font-bold">{activeBooking.id}</span> —{' '}
                <span className="text-primary font-bold">{activeBooking.status}</span>
              </p>
              {activeBooking.assignedDriver?.displayName && (
                <p>Driver: {activeBooking.assignedDriver.displayName}</p>
              )}
              <p>Pickup: {activeBooking.pickupLocation.address}</p>
              {activeBooking.dropoffLocation && (
                <p>Dropoff: {activeBooking.dropoffLocation.address}</p>
              )}
              <p className="text-[10px] text-on-surface-variant">
                This booking will be automatically linked to your SOS alert.
              </p>
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant">
              No active booking right now — your SOS will still be sent with your current location.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-bold text-on-surface font-['Space_Grotesk']">
            Incident History
          </h2>
          {incidentsLoading ? (
            <LoadingState message="Loading incident history…" />
          ) : incidents.length === 0 ? (
            <EmptyState icon="shield" message="No safety incidents on record." />
          ) : (
            <div className="flex flex-col gap-2 animate-fade-in-up">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="p-4 rounded-xl bg-surface-container border border-border flex items-center justify-between gap-4 flex-wrap shadow-sm"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-on-surface">
                        {incident.incidentNumber}
                      </span>
                      <IncidentStatusBadge status={incident.status} />
                      <IncidentSeverityBadge severity={incident.severity} />
                    </div>
                    <span className="text-[10px] font-mono text-on-surface-variant">
                      {incident.type} • {formatDate(incident.createdAt)}
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
        title={t('customer.safety.triggerSosBtn')}
        message={t('customer.safety.emergencyDesc')}
        confirmLabel="Yes, Send SOS"
        cancelLabel="Cancel"
        danger
        onConfirm={() => void handleConfirm()}
        onCancel={sos.cancelConfirmation}
      />
    </CustomerLayout>
  );
}

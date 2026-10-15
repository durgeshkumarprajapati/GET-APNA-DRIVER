'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard } from '@/components/ui/metric-card';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/status-badge';
import { LocationMapLink } from '@/components/ui/location-map-link';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';

interface OnlineDriver {
  driverProfileId: string;
  displayName: string;
  availabilityStatus: string;
  latitude: number;
  longitude: number;
  capturedAt: string;
  staleSeconds: number;
}

const AVAILABILITY_TONE: Record<string, StatusBadgeTone> = {
  AVAILABLE: 'success',
  BUSY: 'warning',
  OFFLINE: 'neutral',
  UNAVAILABLE: 'neutral',
};

const STALE_THRESHOLD_SECONDS = 90;

function formatAge(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

export default function AdminLiveFleetRadarPage() {
  const [drivers, setDrivers] = useState<OnlineDriver[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch('/api/admin/live-fleet-radar');
      if (res.ok) {
        const data = await res.json();
        setDrivers(data.drivers ?? []);
        setError(null);
      } else {
        setError('Failed to load live fleet data.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load live fleet data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await load();
    })();
    const interval = setInterval(() => void load(), 15000);
    return () => clearInterval(interval);
  }, []);

  const filtered = drivers.filter((d) =>
    d.displayName.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const availableCount = drivers.filter((d) => d.availabilityStatus === 'AVAILABLE').length;
  const staleCount = drivers.filter((d) => d.staleSeconds > STALE_THRESHOLD_SECONDS).length;

  return (
    <div className="flex flex-col gap-6 w-full">
      <PageHeader
        eyebrow="Fleet Operations"
        title="Live Fleet Radar"
        subtitle="Drivers currently in the live location index — real operational data, refreshed every 15s."
        actions={
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by driver name..."
            className="h-9 px-3 rounded-lg bg-surface-container-lowest border border-surface-container-high text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
          />
        }
      />

      {error && (
        <div className="p-4 rounded-xl border border-error-container bg-error-container/20 text-error text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingState message="Loading live fleet data…" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard label="Drivers Online" value={drivers.length} />
            <MetricCard label="Available Now" value={availableCount} accent="positive" />
            <MetricCard
              label="Stale Locations (&gt;90s)"
              value={staleCount}
              accent={staleCount > 0 ? 'negative' : 'default'}
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon="satellite_alt" message="No drivers currently online." />
          ) : (
            <div className="bg-surface-container-lowest rounded-xl border border-surface-container-high p-5 shadow-xl overflow-x-auto">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-outline font-['Space_Grotesk'] uppercase border-b border-surface-container-high">
                    <th className="py-3 px-4">Driver</th>
                    <th className="py-3 px-4">Availability</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4 text-right">Last Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high font-mono">
                  {filtered.map((driver) => (
                    <tr
                      key={driver.driverProfileId}
                      className="hover:bg-surface-container-low/60 transition-colors"
                    >
                      <td className="py-3 px-4 text-on-surface font-bold">{driver.displayName}</td>
                      <td className="py-3 px-4">
                        <StatusBadge
                          label={driver.availabilityStatus}
                          tone={AVAILABILITY_TONE[driver.availabilityStatus] ?? 'neutral'}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <LocationMapLink latitude={driver.latitude} longitude={driver.longitude} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={
                            driver.staleSeconds > STALE_THRESHOLD_SECONDS
                              ? 'text-error'
                              : 'text-outline'
                          }
                        >
                          {formatAge(driver.staleSeconds)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

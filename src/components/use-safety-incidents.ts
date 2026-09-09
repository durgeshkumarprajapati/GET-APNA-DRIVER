'use client';

import { useCallback, useEffect, useState } from 'react';

export interface SafetyIncidentSummary {
  id: string;
  incidentNumber: string;
  type: string;
  severity: string;
  status: string;
  description: string | null;
  createdAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
}

export interface UseSafetyIncidentsResult {
  incidents: SafetyIncidentSummary[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * The caller's own SOS/safety incident history — GET /api/safety/incidents
 * is already scoped server-side to the authenticated reporter, so this is
 * identical for customer and driver callers. Shared so both SOS pages
 * render the same list logic instead of duplicating it.
 */
export function useSafetyIncidents(): UseSafetyIncidentsResult {
  const [incidents, setIncidents] = useState<SafetyIncidentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchToken, setRefetchToken] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/safety/incidents?page=1&limit=20');
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.items ?? []);
        setError(null);
      } else {
        setError('Failed to load incident history.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load incident history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load, refetchToken]);

  return { incidents, loading, error, refetch: () => setRefetchToken((t) => t + 1) };
}

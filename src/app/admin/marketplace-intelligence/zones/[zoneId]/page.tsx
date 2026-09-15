'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin-layout';

interface ZoneDetailData {
  zone: {
    name: string;
    code: string;
    radiusMeters: number;
    centerLatitude: number;
    centerLongitude: number;
  };
  health: {
    healthState: string;
  };
  demand: {
    totalRequests: number;
    completedRides: number;
    cancelledRides: number;
  };
}

export default function AdminZoneDetailPage({ params }: { params: Promise<{ zoneId: string }> }) {
  const { zoneId } = use(params);
  const [data, setData] = useState<ZoneDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchZoneDetail = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/marketplace-intelligence/zones/${zoneId}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Zone detail fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchZoneDetail();
  }, [zoneId]);

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        <Link
          href="/admin/marketplace-intelligence"
          className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-sm mr-1">arrow_back</span> Back to Console
        </Link>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading zone metrics...</div>
        ) : data ? (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl text-blue-400">location_on</span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold text-white">{data.zone.name}</h2>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {data.zone.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Radius: {data.zone.radiusMeters}m | Center: {data.zone.centerLatitude.toFixed(4)}, {data.zone.centerLongitude.toFixed(4)}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block font-medium">Zone Health</span>
                <span className="text-sm font-bold font-mono text-emerald-400 uppercase">
                  {data.health.healthState}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                <span className="text-xs text-slate-400 block mb-1">Zone Requests</span>
                <span className="text-2xl font-bold font-mono text-white">{data.demand.totalRequests}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                <span className="text-xs text-slate-400 block mb-1">Completed Rides</span>
                <span className="text-2xl font-bold font-mono text-emerald-400">{data.demand.completedRides}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                <span className="text-xs text-slate-400 block mb-1">Cancelled Rides</span>
                <span className="text-2xl font-bold font-mono text-red-400">{data.demand.cancelledRides}</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { ControlStationLayout } from '@/components/control-station-layout';
import { useTranslation } from '@/i18n/context';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/status-badge';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface LiveOpsData {
  timestamp: string;
  metrics: {
    gmv24h: number;
    netCommission24h: number;
    takeRatePercent: number;
    activeDispatchGridCount: number;
    unassignedBookingsCount: number;
    driversOnlineCount: number;
    driversAvailableCount: number;
    driversBusyCount: number;
    totalDriversCount: number;
    fleetUtilizationPercent: number;
    activeSosCount: number;
    customerNps: number;
  };
  activeBookings: Array<{
    id: string;
    bookingNumber: string;
    status: string;
    bookingType: string;
    pickupAddress: string;
    dropoffAddress: string;
    scheduledPickupTime: string;
    totalFareAmount: number;
    customerName: string;
    driverName: string | null;
    driverProfileId: string | null;
    hasOpenSos: boolean;
    sosSeverity: string | null;
  }>;
  onlineDrivers: Array<{
    id: string;
    name: string;
    availabilityStatus: string;
    serviceArea: string;
    experienceYears: number;
  }>;
  pendingKycDrivers: Array<{
    id: string;
    name: string;
    email: string;
    onboardingStatus: string;
    createdAt: string;
  }>;
}

const STATUS_TONE: Record<string, StatusBadgeTone> = {
  SEARCHING_DRIVER: 'warning',
  DRIVER_ASSIGNED: 'info',
  DRIVER_EN_ROUTE: 'info',
  DRIVER_ARRIVED: 'info',
  TRIP_IN_PROGRESS: 'success',
  TRIP_COMPLETED: 'success',
  CANCELLED: 'danger',
  EXPIRED: 'neutral',
};

export default function AdminLiveOpsConsolePage() {
  const { t, formatCurrency, formatNumber, statusLabel } = useTranslation();
  const [data, setData] = useState<LiveOpsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCityTab, setActiveCityTab] = useState<'delhi' | 'mumbai' | 'bengaluru' | 'hyderabad'>('delhi');
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Dialog state for dispatch actions
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: 'reassign' | 'forceAssign' | 'restartSearch' | 'cancelBooking' | 'approveDriver' | null;
    targetId: string | null;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionType: null,
    targetId: null,
  });

  const showToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 4000);
  };

  const fetchLiveOpsData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const res = await fetch('/api/admin/live-ops-console');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setError(null);
      } else {
        setError('Failed to fetch live operations telemetry.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Telemetry request failed.');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const res = await fetch('/api/admin/live-ops-console');
        if (!ignore && res.ok) {
          const json = await res.json();
          setData(json);
          setError(null);
        } else if (!ignore) {
          setError('Failed to fetch live operations telemetry.');
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Telemetry request failed.');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void init();

    const interval = setInterval(() => {
      void fetchLiveOpsData(false);
    }, 10000);

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [fetchLiveOpsData]);

  const handleActionConfirm = async () => {
    if (!confirmModal.targetId || !confirmModal.actionType) return;
    const { actionType, targetId } = confirmModal;

    try {
      let endpoint = '';
      const method = 'POST';
      let payload: unknown = {};

      if (actionType === 'reassign') {
        endpoint = `/api/admin/bookings/${targetId}/reassign`;
        payload = { reason: 'Admin operational re-assignment' };
      } else if (actionType === 'restartSearch') {
        endpoint = `/api/admin/bookings/${targetId}/restart-search`;
        payload = { reason: 'Admin operational search restart' };
      } else if (actionType === 'cancelBooking') {
        endpoint = `/api/admin/bookings/${targetId}/cancel`;
        payload = { reason: 'Cancelled by Admin from Live Ops Control' };
      } else if (actionType === 'approveDriver') {
        endpoint = `/api/admin/drivers/${targetId}/approve`;
        payload = { note: 'Approved from Live Ops KYC Queue' };
      }

      if (endpoint) {
        const res = await fetch(endpoint, {
          method,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          showToast(t('common.toasts.success'));
          void fetchLiveOpsData(false);
        } else {
          const errJson = await res.json().catch(() => ({}));
          showToast(errJson.message || t('common.toasts.error'));
        }
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('common.toasts.error'));
    } finally {
      setConfirmModal({ isOpen: false, title: '', description: '', actionType: null, targetId: null });
    }
  };

  const filteredBookings = data?.activeBookings.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.bookingNumber.toLowerCase().includes(q) ||
      b.customerName.toLowerCase().includes(q) ||
      (b.driverName && b.driverName.toLowerCase().includes(q))
    );
  }) ?? [];

  return (
    <ControlStationLayout activePersona="admin" activePath="admin-live-ops-map">
      <div className="w-full px-4 sm:px-6 py-6 flex flex-col gap-6 max-w-[1800px] mx-auto">
        {/* Banner Alert Toast */}
        {actionToast && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#68dba9] text-[#003825] font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
            <span className="material-symbols-outlined text-[#003825]">check_circle</span>
            <span>{actionToast}</span>
          </div>
        )}

        {/* Top Header & Ops Status Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#181c24] p-5 rounded-2xl border border-[#262a33] shadow-md">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <span className="bg-[#00311f] text-[#68dba9] text-[11px] font-mono font-bold px-2.5 py-1 rounded flex items-center gap-1.5 uppercase tracking-wider border border-[#25a475]/30">
                <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-pulse"></span>
                OPS CONTROL CENTER v5.0
              </span>
              <span className="text-xs font-mono text-[#bccac0]">
                {data ? `LAST SYNC: ${new Date(data.timestamp).toLocaleTimeString()}` : 'INITIALIZING...'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-[#dfe2ee] tracking-tight mt-1">
              {t('admin.liveOps.title')}
            </h1>
            <p className="text-xs sm:text-sm text-[#bccac0]">{t('admin.liveOps.subtitle')}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => void fetchLiveOpsData(true)}
              className="px-4 py-2 rounded-xl bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] text-xs font-mono font-semibold flex items-center gap-2 transition-colors border border-[#3d4a42]"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              {t('common.actions.refresh')}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm font-mono">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingState message={t('common.labels.loading')} />
        ) : (
          <>
            {/* Top 5 KPI Metrics Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-col gap-1 shadow-sm">
                <div className="flex items-center justify-between text-[#bccac0]">
                  <span className="text-[11px] font-mono uppercase tracking-wider">
                    {t('admin.liveOps.gmv24h')}
                  </span>
                  <span className="material-symbols-outlined text-sm text-[#68dba9]">payments</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold font-display text-[#dfe2ee]">
                    {formatCurrency(data?.metrics.gmv24h ?? 0)}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#bccac0]">Last 24h rolling cycle</span>
              </div>

              <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-col gap-1 shadow-sm">
                <div className="flex items-center justify-between text-[#bccac0]">
                  <span className="text-[11px] font-mono uppercase tracking-wider">
                    {t('admin.liveOps.netTakeRate')}
                  </span>
                  <span className="material-symbols-outlined text-sm text-[#68dba9]">pie_chart</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold font-display text-[#68dba9]">
                    {formatCurrency(data?.metrics.netCommission24h ?? 0)}
                  </span>
                  <span className="text-xs font-mono text-[#68dba9] font-semibold">
                    {data?.metrics.takeRatePercent}%
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#bccac0]">Platform margin</span>
              </div>

              <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-col gap-1 shadow-sm">
                <div className="flex items-center justify-between text-[#bccac0]">
                  <span className="text-[11px] font-mono uppercase tracking-wider">
                    {t('admin.liveOps.activeDispatchGrid')}
                  </span>
                  <span className="material-symbols-outlined text-sm text-[#68dba9]">alt_route</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold font-display text-[#dfe2ee]">
                    {formatNumber(data?.metrics.activeDispatchGridCount ?? 0)}
                  </span>
                  <span className="text-xs font-mono text-[#68dba9] font-semibold">ACTIVE</span>
                </div>
                <span className="text-[10px] font-mono text-[#bccac0]">
                  Unassigned: {formatNumber(data?.metrics.unassignedBookingsCount ?? 0)}
                </span>
              </div>

              <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-col gap-1 shadow-sm">
                <div className="flex items-center justify-between text-[#bccac0]">
                  <span className="text-[11px] font-mono uppercase tracking-wider">
                    {t('admin.liveOps.onlineDrivers')}
                  </span>
                  <span className="material-symbols-outlined text-sm text-[#68dba9]">badge</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold font-display text-[#dfe2ee]">
                    {formatNumber(data?.metrics.driversOnlineCount ?? 0)}
                  </span>
                  <span className="text-xs font-mono text-[#bccac0]">
                    / {formatNumber(data?.metrics.totalDriversCount ?? 0)} Total
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#68dba9] font-semibold">
                  {data?.metrics.fleetUtilizationPercent}% fleet utilization
                </span>
              </div>

              <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-col gap-1 shadow-sm">
                <div className="flex items-center justify-between text-[#bccac0]">
                  <span className="text-[11px] font-mono uppercase tracking-wider">
                    {t('admin.liveOps.customerNps')}
                  </span>
                  <span className="material-symbols-outlined text-sm text-[#68dba9]">thumb_up</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold font-display text-[#dfe2ee]">
                    {data?.metrics.customerNps}
                  </span>
                  <span className="text-xs font-mono text-[#68dba9] font-semibold">World-Class</span>
                </div>
                <span className="text-[10px] font-mono text-[#bccac0]">Verified customer feedback</span>
              </div>
            </div>

            {/* Regional Clustering Map & Dynamics */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Regional Map Canvas Box (7 Cols) */}
              <div className="xl:col-span-7 bg-[#181c24] rounded-2xl border border-[#262a33] p-5 flex flex-col gap-4 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#68dba9] text-xl">hub</span>
                    <h3 className="font-bold font-display text-lg text-[#dfe2ee]">
                      {t('admin.liveOps.regionalMesh')}
                    </h3>
                  </div>

                  {/* City Selection Tabs */}
                  <div className="flex items-center bg-[#0a0e16] p-1 rounded-lg border border-[#262a33]">
                    {(['delhi', 'mumbai', 'bengaluru', 'hyderabad'] as const).map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => setActiveCityTab(city)}
                        className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                          activeCityTab === city
                            ? 'bg-[#262a33] text-[#dfe2ee] font-bold shadow'
                            : 'text-[#bccac0] hover:text-[#dfe2ee]'
                        }`}
                      >
                        {city === 'delhi' ? 'Delhi-NCR' : city.charAt(0).toUpperCase() + city.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mesh Indicators Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="bg-[#0a0e16] p-2.5 rounded-lg border border-[#262a33] flex items-center justify-between">
                    <span className="text-[#bccac0]">{t('admin.liveOps.activeTrips')}</span>
                    <span className="text-[#68dba9] font-bold">
                      {data?.metrics.activeDispatchGridCount ?? 0}
                    </span>
                  </div>
                  <div className="bg-[#0a0e16] p-2.5 rounded-lg border border-[#262a33] flex items-center justify-between">
                    <span className="text-[#bccac0]">{t('admin.liveOps.availableIdle')}</span>
                    <span className="text-[#dfe2ee] font-bold">
                      {data?.metrics.driversAvailableCount ?? 0}
                    </span>
                  </div>
                  <div className="bg-[#0a0e16] p-2.5 rounded-lg border border-[#262a33] flex items-center justify-between">
                    <span className="text-[#bccac0]">{t('admin.liveOps.enRoutePickup')}</span>
                    <span className="text-[#b4c5ff] font-bold">
                      {data?.metrics.driversBusyCount ?? 0}
                    </span>
                  </div>
                  <div className="bg-[#0a0e16] p-2.5 rounded-lg border border-[#93000a]/50 flex items-center justify-between bg-red-950/20">
                    <span className="text-[#ffb4ab]">{t('admin.liveOps.flaggedSos')}</span>
                    <span className="text-[#ffb4ab] font-bold flex items-center gap-1">
                      {data && data.metrics.activeSosCount > 0 && (
                        <span className="w-2 h-2 rounded-full bg-[#ffb4ab] animate-ping"></span>
                      )}
                      {formatNumber(data?.metrics.activeSosCount ?? 0)}
                    </span>
                  </div>
                </div>

                {/* Interactive Map Mesh Display Box */}
                <div className="relative w-full h-[360px] rounded-xl overflow-hidden bg-[#0a0e16] border border-[#262a33] flex flex-col justify-between p-4">
                  <div className="absolute inset-0 pointer-events-none border border-[#68dba9]/10">
                    <div className="w-full h-full bg-[linear-gradient(to_right,#31353e15_1px,transparent_1px),linear-gradient(to_bottom,#31353e15_1px,transparent_1px)] bg-[size:32px_32px]"></div>
                  </div>

                  <div className="relative z-10 flex items-center justify-between bg-[#181c24]/90 backdrop-blur-md px-3 py-2 rounded-lg border border-[#262a33]">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#68dba9] animate-pulse"></span>
                      <span className="text-[#dfe2ee] font-bold uppercase">
                        Telemetry Stream : Active
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#68dba9]">Real Fleet Data Connected</span>
                  </div>

                  <div className="relative z-20 flex flex-col gap-2">
                    {data?.onlineDrivers.slice(0, 3).map((dr) => (
                      <div
                        key={dr.id}
                        className="bg-[#181c24]/90 px-3 py-2 rounded-lg border border-[#262a33] flex items-center justify-between text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              dr.availabilityStatus === 'AVAILABLE' ? 'bg-[#68dba9]' : 'bg-[#b4c5ff]'
                            }`}
                          ></span>
                          <span className="text-[#dfe2ee] font-bold">{dr.name}</span>
                          <span className="text-[10px] text-[#bccac0]">({dr.serviceArea})</span>
                        </div>
                        <StatusBadge label={statusLabel(dr.availabilityStatus)} tone={dr.availabilityStatus === 'AVAILABLE' ? 'success' : 'info'} />
                      </div>
                    ))}
                  </div>

                  <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-[#bccac0] bg-[#0a0e16]/80 px-3 py-1.5 rounded-lg border border-[#262a33]">
                    <span>Zone: {activeCityTab.toUpperCase()}</span>
                    <span className="text-[#68dba9]">OPERATIONAL</span>
                  </div>
                </div>
              </div>

              {/* Fleet Dynamics / Pending KYC */}
              <div className="xl:col-span-5 bg-[#181c24] rounded-2xl border border-[#262a33] p-5 flex flex-col gap-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold font-display text-lg text-[#dfe2ee]">
                    {t('admin.liveOps.kycPipelineTitle')}
                  </h3>
                </div>

                {data?.pendingKycDrivers.length === 0 ? (
                  <EmptyState icon="verified" message="No pending driver applications in queue." />
                ) : (
                  <div className="flex flex-col gap-3">
                    {data?.pendingKycDrivers.map((drv) => (
                      <div
                        key={drv.id}
                        className="bg-[#0a0e16] p-3.5 rounded-xl border border-[#262a33] flex flex-col gap-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-sm text-[#dfe2ee] block">{drv.name}</span>
                            <span className="text-xs font-mono text-[#bccac0]">{drv.email}</span>
                          </div>
                          <StatusBadge label={statusLabel(drv.onboardingStatus)} tone="warning" />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmModal({
                                isOpen: true,
                                title: t('admin.actions.approveDriver'),
                                description: `Approve driver application for ${drv.name}?`,
                                actionType: 'approveDriver',
                                targetId: drv.id,
                              })
                            }
                            className="flex-1 py-1.5 bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] font-mono text-xs font-bold rounded-lg transition-colors text-center"
                          >
                            {t('common.actions.approve')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Live Operations Dispatch Log Table Section */}
            <div className="bg-[#181c24] rounded-2xl border border-[#262a33] p-5 flex flex-col gap-4 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#68dba9] text-2xl">local_taxi</span>
                  <div>
                    <h3 className="font-bold font-display text-lg text-[#dfe2ee]">
                      {t('admin.liveOps.dispatchLogTitle')}
                    </h3>
                    <p className="text-xs text-[#bccac0]">
                      {t('admin.liveOps.dispatchLogSubtitle')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder={t('admin.liveOps.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#0a0e16] border border-[#262a33] rounded-lg px-3 py-1.5 text-xs text-[#dfe2ee] placeholder-[#bccac0] focus:outline-none focus:border-[#68dba9]"
                  />
                </div>
              </div>

              {/* Dispatch Log Table */}
              {filteredBookings.length === 0 ? (
                <EmptyState icon="alt_route" message={t('common.labels.noResults')} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono text-[#dfe2ee]">
                    <thead className="bg-[#0a0e16] text-[#bccac0] uppercase text-[10px] tracking-wider border-b border-[#262a33]">
                      <tr>
                        <th className="px-4 py-3">{t('admin.liveOps.tableHeaders.bookingId')}</th>
                        <th className="px-4 py-3">{t('admin.liveOps.tableHeaders.customer')}</th>
                        <th className="px-4 py-3">{t('admin.liveOps.tableHeaders.assignedChauffeur')}</th>
                        <th className="px-4 py-3">{t('admin.liveOps.tableHeaders.activeRoute')}</th>
                        <th className="px-4 py-3">{t('admin.liveOps.tableHeaders.liveStatus')}</th>
                        <th className="px-4 py-3">{t('admin.liveOps.tableHeaders.fareEst')}</th>
                        <th className="px-4 py-3">{t('admin.liveOps.tableHeaders.safetyStatus')}</th>
                        <th className="px-4 py-3 text-right">{t('admin.liveOps.tableHeaders.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#262a33]">
                      {filteredBookings.map((b) => (
                        <tr
                          key={b.id}
                          className={`hover:bg-[#262a33]/40 transition-colors ${
                            b.hasOpenSos ? 'bg-[#93000a]/10 border-l-4 border-l-red-500' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <span className="font-bold text-[#dfe2ee]">{b.bookingNumber}</span>
                            <span className="block text-[9px] text-[#bccac0]">{b.bookingType}</span>
                          </td>
                          <td className="px-4 py-3 font-bold text-[#dfe2ee]">{b.customerName}</td>
                          <td className="px-4 py-3">
                            {b.driverName ? (
                              <span className="font-bold text-[#dfe2ee]">{b.driverName}</span>
                            ) : (
                              <span className="text-[#68dba9] animate-pulse">Broadcasting...</span>
                            )}
                          </td>
                          <td className="px-4 py-3 max-w-[200px] truncate">
                            <span>{b.pickupAddress} &rarr; {b.dropoffAddress}</span>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge
                              label={statusLabel(b.status)}
                              tone={STATUS_TONE[b.status] ?? 'neutral'}
                            />
                          </td>
                          <td className="px-4 py-3 font-bold text-[#dfe2ee]">
                            {formatCurrency(b.totalFareAmount || 0)}
                          </td>
                          <td className="px-4 py-3">
                            {b.hasOpenSos ? (
                              <span className="bg-[#93000a] text-[#ffdad6] font-bold px-2 py-0.5 rounded text-[10px] animate-pulse">
                                SOS ALERT ({b.sosSeverity})
                              </span>
                            ) : (
                              <span className="text-[#68dba9]">Normal</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {b.status === 'SEARCHING_DRIVER' ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmModal({
                                      isOpen: true,
                                      title: t('admin.liveOps.actions.restartSearch'),
                                      description: `Restart driver search for booking ${b.bookingNumber}?`,
                                      actionType: 'restartSearch',
                                      targetId: b.id,
                                    })
                                  }
                                  className="px-2.5 py-1 bg-[#262a33] hover:bg-[#353942] text-[#68dba9] rounded text-[11px]"
                                >
                                  {t('admin.liveOps.actions.restartSearch')}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmModal({
                                      isOpen: true,
                                      title: t('admin.liveOps.actions.reassign'),
                                      description: `Reassign driver for booking ${b.bookingNumber}?`,
                                      actionType: 'reassign',
                                      targetId: b.id,
                                    })
                                  }
                                  className="px-2.5 py-1 bg-[#262a33] hover:bg-[#353942] text-[#b4c5ff] rounded text-[11px]"
                                >
                                  {t('admin.liveOps.actions.reassign')}
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmModal({
                                    isOpen: true,
                                    title: t('admin.liveOps.actions.cancelTrip'),
                                    description: `Cancel booking ${b.bookingNumber}? This action cannot be undone.`,
                                    actionType: 'cancelBooking',
                                    targetId: b.id,
                                  })
                                }
                                className="px-2.5 py-1 bg-[#93000a]/80 hover:bg-[#93000a] text-[#ffdad6] rounded text-[11px]"
                              >
                                {t('common.actions.cancel')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmText={t('common.actions.confirm')}
        cancelText={t('common.actions.cancel')}
        onConfirm={() => void handleActionConfirm()}
        onCancel={() => setConfirmModal({ isOpen: false, title: '', description: '', actionType: null, targetId: null })}
      />
    </ControlStationLayout>
  );
}

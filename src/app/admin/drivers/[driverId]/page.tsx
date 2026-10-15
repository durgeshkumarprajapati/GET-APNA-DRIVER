'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { RatingStars } from '@/components/ui/rating-stars';
import { RatingSummary } from '@/components/ui/rating-summary';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency } from '@/shared/formatting/money';

interface DriverPerformance {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: { 5: number; 4: number; 3: number; 2: number; 1: number };
  completedTrips: number;
  completionRate: string;
  cancellationRate: string;
  averageTripValue: string;
  totalEarnings: string;
}

interface DriverDetail {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  drivingLicenseNumber: string;
  drivingExperienceYears: number;
  primaryServiceArea: string | null;
  dailyHireRate: string | null;
  weeklyHireRate: string | null;
  monthlyHireRate: string | null;
  onboardingStatus: string;
  verificationStatus: string;
  approvalStatus: string;
  availabilityStatus: string;
  rejectionReason: string | null;
  changesRequestedReason: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string | null;
    phoneNumber: string | null;
    accountStatus: string;
  };
  documents: {
    id: string;
    documentType: string;
    documentNumber: string | null;
    status: string;
    version: number;
    isCurrent: boolean;
    originalFileName: string;
    rejectionReason: string | null;
    expiresAt: string | null;
    createdAt: string;
  }[];
}

/** Mirrors the seeded default for driver.onboarding.required_documents —
 * also the exact set approveDriver (driver-onboarding-service.ts)
 * authoritatively re-checks server-side; this is a UI hint only, computed
 * so "Approve Driver" can be disabled up front instead of only erroring
 * after the admin clicks it. */
const REQUIRED_DOCUMENT_TYPES = ['DRIVING_LICENSE', 'AADHAAR_CARD'] as const;

function missingOrUnverifiedRequiredDocs(driver: DriverDetail): string[] {
  const now = new Date();
  return REQUIRED_DOCUMENT_TYPES.filter((type) => {
    const doc = driver.documents.find((d) => d.documentType === type && d.isCurrent);
    if (!doc) return true;
    if (doc.status !== 'VERIFIED') return true;
    if (doc.expiresAt && new Date(doc.expiresAt) < now) return true;
    return false;
  });
}

function driverDisplayName(driver: DriverDetail): string {
  if (driver.displayName) return driver.displayName;
  const combined = [driver.firstName, driver.lastName].filter(Boolean).join(' ');
  return combined || driver.user.email || 'Unnamed Driver';
}

export default function AdminDriverDetailPage({
  params,
}: {
  params: Promise<{ driverId: string }>;
}) {
  const { driverId } = use(params);
  const [driver, setDriver] = useState<DriverDetail | null>(null);
  const [performance, setPerformance] = useState<DriverPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionReason, setActionReason] = useState('');
  const [activeModal, setActiveModal] = useState<
    'approve' | 'reject' | 'changes' | 'suspend' | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [editingRates, setEditingRates] = useState(false);
  const [rateForm, setRateForm] = useState({ daily: '', weekly: '', monthly: '' });
  const [savingRates, setSavingRates] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [driverRes, performanceRes] = await Promise.all([
          fetch(`/api/admin/drivers/${driverId}`),
          fetch(`/api/admin/drivers/${driverId}/performance`),
        ]);
        if (isMounted) {
          if (driverRes.ok) {
            const data = await driverRes.json();
            setDriver(data.profile);
          }
          if (performanceRes.ok) {
            const data = await performanceRes.json();
            setPerformance(data.performance);
          }
        }
      } catch {
        // Ignore load error
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [driverId]);

  const refreshDriver = async () => {
    try {
      const res = await fetch(`/api/admin/drivers/${driverId}`);
      if (res.ok) {
        const data = await res.json();
        setDriver(data.profile);
      }
    } catch {
      // Ignore load error
    }
  };

  const handleAction = async () => {
    if (!activeModal) return;
    setSubmitting(true);
    setMessage(null);

    let endpoint = '';
    let body: Record<string, unknown> | null = null;

    if (activeModal === 'approve') {
      endpoint = `/api/admin/drivers/${driverId}/approve`;
    } else if (activeModal === 'reject') {
      endpoint = `/api/admin/drivers/${driverId}/reject`;
      body = { reason: actionReason };
    } else if (activeModal === 'changes') {
      endpoint = `/api/admin/drivers/${driverId}/request-changes`;
      body = { reason: actionReason };
    } else if (activeModal === 'suspend') {
      endpoint = `/api/admin/drivers/${driverId}/suspend`;
      body = { reason: actionReason };
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.message || data.error?.message || `Failed to execute ${activeModal} action.`,
        );
      }

      setMessage({
        type: 'success',
        text: `Driver application status updated via ${activeModal} action.`,
      });
      setActiveModal(null);
      setActionReason('');
      await refreshDriver();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed.';
      setMessage({ type: 'error', text: msg });
      // Regression: the modal previously only closed on the success path,
      // so a rejected action (e.g. approving before required documents are
      // verified) left "Confirm ... Action" stuck open forever with no
      // visible explanation — the real error was rendered as a page-level
      // banner behind it. Closing here too surfaces that banner right
      // away and lets the admin immediately retry (e.g. verify documents,
      // then approve again) instead of looking stuck.
      setActiveModal(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDocumentVerify = async (documentId: string) => {
    try {
      const res = await fetch(`/api/admin/driver-documents/${documentId}/verify`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Document verified successfully.' });
        await refreshDriver();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to verify document.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error verifying document.' });
    }
  };

  const handleDocumentReject = async (documentId: string) => {
    const reason = prompt('Enter rejection reason for this document:');
    if (!reason?.trim()) return;

    try {
      const res = await fetch(`/api/admin/driver-documents/${documentId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Document rejected.' });
        await refreshDriver();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to reject document.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error rejecting document.' });
    }
  };

  const handleOpenEditRates = () => {
    if (!driver) return;
    setRateForm({
      daily: driver.dailyHireRate ?? '',
      weekly: driver.weeklyHireRate ?? '',
      monthly: driver.monthlyHireRate ?? '',
    });
    setEditingRates(true);
  };

  const handleSaveRates = async () => {
    setSavingRates(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/drivers/${driverId}/rates`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyHireRate: rateForm.daily.trim() === '' ? null : Number(rateForm.daily),
          weeklyHireRate: rateForm.weekly.trim() === '' ? null : Number(rateForm.weekly),
          monthlyHireRate: rateForm.monthly.trim() === '' ? null : Number(rateForm.monthly),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error?.message || 'Failed to update hire rates.');
      }
      setMessage({
        type: 'success',
        text: 'Hire rates updated. The driver has been notified.',
      });
      setEditingRates(false);
      await refreshDriver();
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update hire rates.',
      });
    } finally {
      setSavingRates(false);
    }
  };

  const handleDownloadDoc = async (documentId: string) => {
    try {
      const res = await fetch(`/api/admin/driver-documents/${documentId}/download-url`);
      const data = await res.json();
      if (res.ok && data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to fetch document link.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error downloading document.' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-4" />
          <p className="text-on-surface-variant">Loading driver detail inspection...</p>
        </div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-4">
          <p className="text-error font-semibold">Driver application not found.</p>
          <Link href="/admin/drivers" className="text-primary hover:underline text-sm">
            Return to Driver Directory
          </Link>
        </div>
      </div>
    );
  }

  const name = driverDisplayName(driver);
  const missingDocsForApproval = missingOrUnverifiedRequiredDocs(driver);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-container-high pb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-outline mb-1">
            <Link href="/admin/drivers" className="hover:text-primary transition-colors">
              Driver Directory
            </Link>
            <span>/</span>
            <span className="text-on-surface font-medium">{name}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-on-surface font-['Space_Grotesk']">
              {name} Application Review
            </h1>
            {performance && performance.totalReviews > 0 && (
              <div className="flex items-center gap-1.5">
                <RatingStars value={performance.averageRating} size="sm" />
                <span className="text-xs text-outline">({performance.totalReviews})</span>
              </div>
            )}
          </div>
          <p className="text-on-surface-variant mt-1">
            DL: {driver.drivingLicenseNumber} • Account: {driver.user.email ?? 'No email on file'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/drivers"
            className="px-4 py-2 bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant text-sm font-medium rounded-lg border border-surface-container-high transition-colors"
          >
            Back to List
          </Link>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-on-primary-container/50 border-primary-container text-primary' : 'bg-error-container/20 border-error-container text-error'}`}
        >
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {/* Action Panel */}
      <div className="bg-surface-container-low border border-surface-container-high rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <span className="text-xs uppercase font-semibold text-outline tracking-wider">
            Status Summary
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-surface-container-high text-on-surface">
              Onboarding: {driver.onboardingStatus}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-surface-container-high text-on-surface">
              Verification: {driver.verificationStatus}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${driver.approvalStatus === 'APPROVED' ? 'bg-on-primary-container text-primary border border-primary-container' : 'bg-warning-container text-on-warning-container border border-warning-container'}`}
            >
              Approval: {driver.approvalStatus}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={missingDocsForApproval.length > 0}
            title={
              missingDocsForApproval.length > 0
                ? `Verify required document(s) first: ${missingDocsForApproval.join(', ')}`
                : undefined
            }
            onClick={() => setActiveModal('approve')}
            className="px-4 py-2 bg-primary-container hover:bg-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary-container text-on-primary-container font-bold text-sm rounded-lg shadow transition-colors"
          >
            Approve Driver
          </button>
          {missingDocsForApproval.length > 0 && (
            <span className="text-[10px] text-outline font-mono">
              Verify {missingDocsForApproval.join(', ')} below to enable approval.
            </span>
          )}

          <button
            type="button"
            onClick={() => setActiveModal('changes')}
            className="px-4 py-2 bg-warning-container hover:bg-on-warning-container hover:text-warning-container text-on-warning-container font-medium text-sm rounded-lg shadow transition-colors"
          >
            Request Changes
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('reject')}
            className="px-4 py-2 bg-error-container hover:bg-on-error text-on-error-container font-medium text-sm rounded-lg shadow transition-colors"
          >
            Reject Application
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('suspend')}
            className="px-4 py-2 bg-suspend-container hover:bg-suspend text-on-suspend-container font-medium text-sm rounded-lg shadow transition-colors"
          >
            Suspend Driver
          </button>
        </div>
      </div>

      {/* Profile & Document Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Overview */}
        <div className="lg:col-span-1 bg-surface-container-low border border-surface-container-high rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-semibold text-on-surface border-b border-surface-container-high pb-3 font-['Space_Grotesk']">
            Personal &amp; Professional Info
          </h2>

          <div className="space-y-3 text-sm">
            <div>
              <span className="text-xs text-outline block">Full Name</span>
              <span className="font-medium text-on-surface">{name}</span>
            </div>
            <div>
              <span className="text-xs text-outline block">Contact</span>
              <span className="font-medium text-on-surface">
                {driver.user.email ?? 'No email on file'}
              </span>
              {driver.user.phoneNumber && (
                <span className="block text-xs text-outline">{driver.user.phoneNumber}</span>
              )}
            </div>
            <div>
              <span className="text-xs text-outline block">Driving License</span>
              <span className="font-medium text-on-surface">{driver.drivingLicenseNumber}</span>
            </div>
            <div>
              <span className="text-xs text-outline block">Experience</span>
              <span className="font-medium text-on-surface">
                {driver.drivingExperienceYears} Years
              </span>
            </div>
            <div>
              <span className="text-xs text-outline block">Primary Service Area</span>
              <span className="font-medium text-on-surface">
                {driver.primaryServiceArea || 'Not specified'}
              </span>
            </div>
            <div>
              <span className="text-xs text-outline block">Availability</span>
              <span className="font-medium text-on-surface">{driver.availabilityStatus}</span>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-surface-container-high space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-on-surface font-['Space_Grotesk']">
                Hire Pricing
              </h3>
              {!editingRates && (
                <button
                  type="button"
                  onClick={handleOpenEditRates}
                  className="text-xs font-medium text-primary hover:text-primary"
                >
                  Edit
                </button>
              )}
            </div>

            {editingRates ? (
              <div className="space-y-3">
                <label className="text-xs text-outline flex flex-col gap-1">
                  Per Day (₹)
                  <input
                    type="number"
                    min={0}
                    value={rateForm.daily}
                    onChange={(e) => setRateForm({ ...rateForm, daily: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-container-high text-sm text-on-surface focus:outline-none focus:border-primary"
                  />
                </label>
                <label className="text-xs text-outline flex flex-col gap-1">
                  Per Week (₹)
                  <input
                    type="number"
                    min={0}
                    value={rateForm.weekly}
                    onChange={(e) => setRateForm({ ...rateForm, weekly: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-container-high text-sm text-on-surface focus:outline-none focus:border-primary"
                  />
                </label>
                <label className="text-xs text-outline flex flex-col gap-1">
                  Per Month (₹)
                  <input
                    type="number"
                    min={0}
                    value={rateForm.monthly}
                    onChange={(e) => setRateForm({ ...rateForm, monthly: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-container-high text-sm text-on-surface focus:outline-none focus:border-primary"
                  />
                </label>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={savingRates}
                    onClick={() => void handleSaveRates()}
                    className="px-3 py-1.5 rounded-lg bg-primary-container hover:bg-primary text-white text-xs font-semibold disabled:opacity-50"
                  >
                    {savingRates ? 'Saving…' : 'Save Rates'}
                  </button>
                  <button
                    type="button"
                    disabled={savingRates}
                    onClick={() => setEditingRates(false)}
                    className="px-3 py-1.5 rounded-lg border border-surface-container-high text-on-surface text-xs font-semibold disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-[11px] text-outline">
                  The driver will be notified of this change.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-xs text-outline block">Per Day</span>
                  <span className="font-medium text-on-surface">
                    {driver.dailyHireRate
                      ? `₹${Number(driver.dailyHireRate).toLocaleString()}`
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-outline block">Per Week</span>
                  <span className="font-medium text-on-surface">
                    {driver.weeklyHireRate
                      ? `₹${Number(driver.weeklyHireRate).toLocaleString()}`
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-outline block">Per Month</span>
                  <span className="font-medium text-on-surface">
                    {driver.monthlyHireRate
                      ? `₹${Number(driver.monthlyHireRate).toLocaleString()}`
                      : '—'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Verification Documents */}
        <div className="lg:col-span-2 bg-surface-container-low border border-surface-container-high rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-semibold text-on-surface border-b border-surface-container-high pb-3 font-['Space_Grotesk']">
            Verification Documents
          </h2>

          {driver.documents.length === 0 ? (
            <EmptyState icon="description" message="No documents uploaded yet." />
          ) : (
            <div className="space-y-4">
              {driver.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-xl bg-surface-container-lowest border border-surface-container-high flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-on-surface">
                        {doc.documentType.replace('_', ' ')}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${doc.status === 'VERIFIED' ? 'bg-on-primary-container text-primary border border-primary-container' : doc.status === 'REJECTED' ? 'bg-error-container/20 text-error border border-error-container' : 'bg-warning-container text-on-warning-container border border-warning-container'}`}
                      >
                        {doc.status}
                      </span>
                      <span className="text-xs text-outline">v{doc.version}</span>
                    </div>
                    <div className="text-xs text-outline space-x-3">
                      <span>File: {doc.originalFileName}</span>
                      {doc.documentNumber && <span>Doc #: {doc.documentNumber}</span>}
                    </div>
                    {doc.rejectionReason && (
                      <p className="text-xs text-error">Rejection: {doc.rejectionReason}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadDoc(doc.id)}
                      className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-bright text-on-surface text-xs font-medium rounded-md border border-surface-container-high transition-colors"
                    >
                      View File
                    </button>

                    {doc.status !== 'VERIFIED' && (
                      <button
                        type="button"
                        onClick={() => handleDocumentVerify(doc.id)}
                        className="px-3 py-1.5 bg-primary-container hover:bg-primary text-on-primary-container text-xs font-bold rounded-md transition-colors"
                      >
                        Verify
                      </button>
                    )}

                    {doc.status !== 'REJECTED' && (
                      <button
                        type="button"
                        onClick={() => handleDocumentReject(doc.id)}
                        className="px-3 py-1.5 bg-error-container/80 hover:bg-on-error text-on-error-container text-xs font-medium rounded-md transition-colors"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Performance & Ratings */}
      {performance && (
        <div className="bg-surface-container-low border border-surface-container-high rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-semibold text-on-surface border-b border-surface-container-high pb-3 font-['Space_Grotesk']">
            Performance &amp; Ratings
          </h2>
          <RatingSummary
            averageRating={performance.averageRating}
            totalReviews={performance.totalReviews}
            distribution={performance.ratingDistribution}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Completed Bookings" value={performance.completedTrips} />
            <MetricCard
              label="Completion Rate"
              value={`${(Number(performance.completionRate) * 100).toFixed(1)}%`}
              accent="positive"
            />
            <MetricCard
              label="Cancellation Rate"
              value={`${(Number(performance.cancellationRate) * 100).toFixed(1)}%`}
              accent={Number(performance.cancellationRate) > 0.1 ? 'negative' : 'default'}
            />
            <MetricCard
              label="Total Earnings"
              value={formatCurrency(performance.totalEarnings)}
              accent="positive"
            />
          </div>
        </div>
      )}

      {/* Modal Dialog for Actions */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-low border border-surface-container-high rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-on-surface uppercase tracking-wider font-['Space_Grotesk']">
              Confirm {activeModal.toUpperCase()} Action
            </h3>

            {activeModal !== 'approve' && (
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Reason for {activeModal} *
                </label>
                <textarea
                  rows={3}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Provide clear rationale for the driver..."
                  className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg p-2.5 text-on-surface text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            )}

            {activeModal === 'approve' && (
              <p className="text-on-surface-variant text-sm">
                Are you sure you want to approve driver <strong>{name}</strong>? Once approved and
                documents verified, the driver can go AVAILABLE to accept bookings.
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-surface-container-high hover:bg-surface-bright text-on-surface-variant text-sm font-medium rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || (activeModal !== 'approve' && !actionReason.trim())}
                onClick={handleAction}
                className="px-4 py-2 bg-primary-container hover:bg-primary disabled:opacity-50 text-on-primary-container text-sm font-bold rounded-lg flex items-center gap-2"
              >
                {submitting && (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-on-primary-container border-t-transparent" />
                )}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

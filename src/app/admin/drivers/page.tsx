'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DriverSummary {
  id: string;
  userId: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string | null;
    accountStatus: string;
  };
  drivingLicenseNumber: string;
  yearsOfExperience: number;
  city: string | null;
  onboardingStatus: string;
  verificationStatus: string;
  approvalStatus: string;
  availabilityStatus: string;
  createdAt: string;
  documents: {
    id: string;
    documentType: string;
    status: string;
  }[];
}

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState<DriverSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [onboardingFilter, setOnboardingFilter] = useState<string>('all');
  const [approvalFilter, setApprovalFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const params = new URLSearchParams();
        if (onboardingFilter !== 'all') params.set('onboardingStatus', onboardingFilter);
        if (approvalFilter !== 'all') params.set('approvalStatus', approvalFilter);

        const url = `/api/admin/drivers?${params.toString()}`;
        const res = await fetch(url);
        if (res.ok && isMounted) {
          const data = await res.json();
          setDrivers(data.drivers || []);
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
  }, [onboardingFilter, approvalFilter]);

  const filteredDrivers = drivers.filter((d) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      d.user.fullName.toLowerCase().includes(term) ||
      d.user.email.toLowerCase().includes(term) ||
      (d.user.phoneNumber && d.user.phoneNumber.includes(term)) ||
      d.drivingLicenseNumber.toLowerCase().includes(term) ||
      (d.city && d.city.toLowerCase().includes(term))
    );
  });

  const getStatusBadge = (status: string, type: 'approval' | 'onboarding' | 'verification') => {
    if (type === 'approval') {
      switch (status) {
        case 'APPROVED':
          return (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Approved
            </span>
          );
        case 'PENDING':
          return (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              Pending Review
            </span>
          );
        case 'REJECTED':
          return (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
              Rejected
            </span>
          );
        case 'SUSPENDED':
          return (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
              Suspended
            </span>
          );
        default:
          return (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
              {status}
            </span>
          );
      }
    }

    if (type === 'onboarding') {
      switch (status) {
        case 'COMPLETED':
          return (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Completed
            </span>
          );
        case 'SUBMITTED':
          return (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              Submitted
            </span>
          );
        case 'CHANGES_REQUESTED':
          return (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              Changes Requested
            </span>
          );
        default:
          return (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              {status}
            </span>
          );
      }
    }

    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mb-4"></div>
          <p className="text-slate-400">Loading driver management directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
              <Link
                href="/admin/configuration"
                className="hover:text-emerald-400 transition-colors"
              >
                Admin Console
              </Link>
              <span>/</span>
              <span className="text-slate-200 font-medium">Driver Applications</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Driver Onboarding & Approval Directory
            </h1>
            <p className="text-slate-400 mt-1">
              Review applicant profiles, verify documents, and approve or suspend driver accounts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/driver-documents"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg shadow-md transition-colors"
            >
              Document Queue &rarr;
            </Link>
          </div>
        </div>

        {/* Filters & Search Bar */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="w-full md:w-80">
            <input
              type="text"
              placeholder="Search by name, email, phone, DL..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder-slate-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            <div>
              <label className="text-xs text-slate-400 mr-2">Approval:</label>
              <select
                value={approvalFilter}
                onChange={(e) => setApprovalFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-sm focus:outline-none"
              >
                <option value="all">All Approval States</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 mr-2">Onboarding:</label>
              <select
                value={onboardingFilter}
                onChange={(e) => setOnboardingFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-sm focus:outline-none"
              >
                <option value="all">All Onboarding States</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="CHANGES_REQUESTED">Changes Requested</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Directory Table */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
          {filteredDrivers.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              No driver applications match the selected search and status filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 uppercase text-xs font-semibold tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4">Driver Name & Contact</th>
                    <th className="px-6 py-4">License & Exp</th>
                    <th className="px-6 py-4">Onboarding</th>
                    <th className="px-6 py-4">Approval</th>
                    <th className="px-6 py-4">Availability</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {filteredDrivers.map((driver) => (
                    <tr key={driver.id} className="hover:bg-slate-700/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{driver.user.fullName}</div>
                        <div className="text-xs text-slate-400">{driver.user.email}</div>
                        {driver.user.phoneNumber && (
                          <div className="text-xs text-slate-500">{driver.user.phoneNumber}</div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-200">
                          {driver.drivingLicenseNumber}
                        </div>
                        <div className="text-xs text-slate-400">
                          {driver.yearsOfExperience} yrs exp {driver.city ? `• ${driver.city}` : ''}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {getStatusBadge(driver.onboardingStatus, 'onboarding')}
                      </td>

                      <td className="px-6 py-4">
                        {getStatusBadge(driver.approvalStatus, 'approval')}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${driver.availabilityStatus === 'AVAILABLE' ? 'text-emerald-400' : 'text-slate-400'}`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${driver.availabilityStatus === 'AVAILABLE' ? 'bg-emerald-500' : 'bg-slate-500'}`}
                          />
                          {driver.availabilityStatus}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/drivers/${driver.id}`}
                          className="inline-flex items-center px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition-colors"
                        >
                          Review & Approve
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

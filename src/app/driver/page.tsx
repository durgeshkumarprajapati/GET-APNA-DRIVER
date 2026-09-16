'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DriverLayout } from '@/components/driver-layout';
import { DriverEngagementWidget } from '@/components/driver/driver-engagement-widget';

interface AssignmentOffer {
  id: string;
  bookingId: string;
  status: string;
  offeredAt: string;
  expiresAt: string;
  pickupLocation: { address: string; label: string | null };
  bookingType: string;
}

interface DriverBooking {
  id: string;
  status: string;
  bookingType: string;
  pickupLocation: { address: string; label: string | null };
  requestedStartTime: string | null;
  createdAt: string;
}

interface WalletSummary {
  availableBalance: string;
  pendingBalance: string;
}

interface DriverProfile {
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
  drivingExperienceYears: number;
  primaryServiceArea: string | null;
  approvalStatus: string;
  availabilityStatus: string;
  createdAt: string;
}

function driverDisplayName(profile: DriverProfile): string {
  if (profile.displayName) return profile.displayName;
  const combined = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  return combined || profile.email || 'there';
}

const ACTIVE_BOOKING_STATUSES = new Set([
  'DRIVER_ASSIGNED',
  'DRIVER_EN_ROUTE',
  'DRIVER_ARRIVED',
  'TRIP_IN_PROGRESS',
]);

export default function DriverDashboardPage() {
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [offers, setOffers] = useState<AssignmentOffer[]>([]);
  const [bookings, setBookings] = useState<DriverBooking[]>([]);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [todayShift, setTodayShift] = useState<{
    isScheduled: boolean;
    startTime: string | null;
    endTime: string | null;
    status: string;
  } | null>(null);
  const [earningsSummary, setEarningsSummary] = useState<{
    todayEarnings: string;
    completedTripsToday: number;
  } | null>(null);
  const [goals, setGoals] = useState<{
    dailyTripGoal: number;
    completedTripsToday: number;
    dailyTripProgressPercentage: number;
  } | null>(null);
  const [incentives, setIncentives] = useState<
    {
      campaignName: string;
      rewardAmount: number;
      currentValue: number;
      targetValue: number;
      status: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [
          profileRes,
          offersRes,
          bookingsRes,
          walletRes,
          todayShiftRes,
          earningsRes,
          goalsRes,
          incRes,
        ] = await Promise.all([
          fetch('/api/driver/profile'),
          fetch('/api/driver/assignment-offers'),
          fetch('/api/driver/bookings'),
          fetch('/api/driver/wallet'),
          fetch('/api/driver/schedule/today'),
          fetch('/api/driver/earnings/summary'),
          fetch('/api/driver/goals'),
          fetch('/api/driver/incentives'),
        ]);
        if (isMounted) {
          if (profileRes.ok) {
            const data = await profileRes.json();
            setProfile(data.profile);
          }
          if (offersRes.ok) {
            const data = await offersRes.json();
            setOffers(data.offers ?? []);
          }
          if (bookingsRes.ok) {
            const data = await bookingsRes.json();
            setBookings(data.bookings ?? []);
          }
          if (walletRes.ok) {
            const data = await walletRes.json();
            setWallet(data.wallet ?? null);
          }
          if (todayShiftRes.ok) {
            const data = await todayShiftRes.json();
            setTodayShift(data.data?.todayShift ?? null);
          }
          if (earningsRes.ok) {
            const data = await earningsRes.json();
            setEarningsSummary(data.data);
          }
          if (goalsRes.ok) {
            const data = await goalsRes.json();
            setGoals(data.data);
          }
          if (incRes.ok) {
            const data = await incRes.json();
            setIncentives(data.data ?? []);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const pendingOffers = offers.filter((o) => o.status === 'PENDING');
  const activeBookings = bookings.filter((b) => ACTIVE_BOOKING_STATUSES.has(b.status));

  return (
    <DriverLayout>
      <div className="flex flex-col w-full gap-3.5">
        <section className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold text-[#68dba9] uppercase tracking-wider font-['Space_Grotesk']">
              Welcome back
            </span>
            <h1 className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              {profile ? driverDisplayName(profile) : 'Dashboard'}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-[#87948b]">
              {profile?.email && <span>{profile.email}</span>}
              {profile?.phoneNumber && <span>{profile.phoneNumber}</span>}
              {profile && <span>{profile.drivingExperienceYears} yrs experience</span>}
              {profile?.primaryServiceArea && <span>{profile.primaryServiceArea}</span>}
            </div>
          </div>
          {profile && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#262a33] text-[#dfe2ee]">
                {profile.approvalStatus}
              </span>
              <Link
                href="/driver/profile"
                className="px-4 py-2 rounded-lg bg-[#262a33] hover:bg-[#353942] text-[#dfe2ee] text-xs font-bold transition-colors"
              >
                Edit Profile
              </Link>
            </div>
          )}
        </section>

        {error && (
          <div className="p-4 rounded-xl border border-[#93000a] bg-[#93000a]/20 text-[#ffb4ab] text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-[#87948b] text-sm">Loading dashboard…</div>
        ) : (
          <>
            {/* Earnings & Incentives Summary Banner */}
            <div className="bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/30 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                    DRIVER EARNINGS & GOALS
                  </span>
                  {incentives.length > 0 && (
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">
                      {incentives.length} Active Challenges
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-black text-white">
                    Today: ₹{earningsSummary?.todayEarnings ?? '0.00'}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({earningsSummary?.completedTripsToday ?? 0} trips completed)
                  </span>
                </div>
                {goals && (
                  <div className="flex items-center gap-2 text-xs text-slate-300 pt-1">
                    <span>
                      Daily Goal: {goals.completedTripsToday} / {goals.dailyTripGoal} trips
                    </span>
                    <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-400 h-full rounded-full"
                        style={{ width: `${goals.dailyTripProgressPercentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <Link
                href="/driver/earnings"
                className="shrink-0 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors shadow-md"
              >
                View Earnings Hub →
              </Link>
            </div>

            {/* Driver Engagement Progress & Streaks Widget */}
            <DriverEngagementWidget />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/driver/schedule"
                className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] hover:border-[#68dba9] transition-colors flex flex-col gap-1"
              >
                <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                  Today Shift
                </span>
                <span className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  {todayShift?.isScheduled
                    ? `${todayShift.startTime} - ${todayShift.endTime}`
                    : todayShift?.status || 'No Shift'}
                </span>
              </Link>
              <Link
                href="/driver/assignment-offers"
                className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] hover:border-[#68dba9] transition-colors flex flex-col gap-1"
              >
                <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                  Pending Offers
                </span>
                <span className="text-2xl font-bold text-[#68dba9] font-['Space_Grotesk']">
                  {pendingOffers.length}
                </span>
              </Link>

              <Link
                href="/driver/bookings"
                className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] hover:border-[#68dba9] transition-colors flex flex-col gap-1"
              >
                <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                  Active Bookings
                </span>
                <span className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  {activeBookings.length}
                </span>
              </Link>

              <Link
                href="/driver/wallet-and-payouts"
                className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] hover:border-[#68dba9] transition-colors flex flex-col gap-1"
              >
                <span className="text-[10px] font-bold text-[#87948b] uppercase font-['Space_Grotesk']">
                  Available Balance
                </span>
                <span className="text-2xl font-bold text-[#68dba9] font-['Space_Grotesk']">
                  ₹
                  {wallet
                    ? Number(wallet.availableBalance).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })
                    : '0.00'}
                </span>
              </Link>
            </div>

            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Pending Assignment Offers
                </h2>
                <Link
                  href="/driver/assignment-offers"
                  className="text-xs font-mono text-[#68dba9] hover:underline"
                >
                  View all →
                </Link>
              </div>
              {pendingOffers.length === 0 ? (
                <div className="p-6 rounded-xl border border-[#262a33] bg-[#181c24] text-center text-[#87948b] text-sm">
                  No pending assignment offers right now.
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingOffers.slice(0, 5).map((offer) => (
                    <div
                      key={offer.id}
                      className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex items-center justify-between gap-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#dfe2ee]">
                          {offer.pickupLocation.label ?? offer.pickupLocation.address}
                        </p>
                        <p className="text-xs text-[#87948b]">{offer.bookingType}</p>
                      </div>
                      <span className="text-xs font-mono text-[#68dba9]">
                        Expires {new Date(offer.expiresAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Active Bookings
                </h2>
                <Link
                  href="/driver/bookings"
                  className="text-xs font-mono text-[#68dba9] hover:underline"
                >
                  View all →
                </Link>
              </div>
              {activeBookings.length === 0 ? (
                <div className="p-6 rounded-xl border border-[#262a33] bg-[#181c24] text-center text-[#87948b] text-sm">
                  No active bookings right now.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeBookings.slice(0, 5).map((booking) => (
                    <div
                      key={booking.id}
                      className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] flex items-center justify-between gap-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#dfe2ee]">
                          {booking.pickupLocation.label ?? booking.pickupLocation.address}
                        </p>
                        <p className="text-xs text-[#87948b]">{booking.bookingType}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#00311f] text-[#68dba9] border border-[#25a475] text-[10px] font-bold">
                        {booking.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </DriverLayout>
  );
}

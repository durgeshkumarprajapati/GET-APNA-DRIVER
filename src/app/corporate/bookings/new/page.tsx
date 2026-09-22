'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CorporateLayout } from '@/components/corporate-layout';

interface Department {
  id: string;
  code: string;
  name: string;
}

interface CostCenter {
  id: string;
  code: string;
  name: string;
}

export default function NewCorporateBookingPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [pickupAddress, setPickupAddress] = useState('Bandra Kurla Complex, Mumbai');
  // Optional — drop location is not required for any booking type (see
  // supportsDropLocation/requiresDropLocation in booking-policy.ts). Empty
  // means the customer hasn't specified a destination yet.
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [vehicleCategory, setVehicleCategory] = useState('SEDAN');
  const [departmentId, setDepartmentId] = useState('');
  const [costCenterId, setCostCenterId] = useState('');
  const [businessPurpose, setBusinessPurpose] = useState('Client Onsite Meeting');
  const [estimatedFare, setEstimatedFare] = useState(1200);

  useEffect(() => {
    async function loadMetadata() {
      try {
        const res = await fetch('/api/corporate/members');
        if (res.ok) {
          const data = await res.json();
          setDepartments(data.departments || []);
          setCostCenters(data.costCenters || []);
          if (data.departments?.[0]) setDepartmentId(data.departments[0].id);
          if (data.costCenters?.[0]) setCostCenterId(data.costCenters[0].id);
        }
      } catch (err) {
        console.error('Error loading corporate metadata:', err);
      } finally {
        setLoading(false);
      }
    }
    void loadMetadata();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/corporate/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId: departmentId || undefined,
          costCenterId: costCenterId || undefined,
          businessPurpose,
          vehicleCategory,
          estimatedFare,
          estimatedDistanceKm: 18.5,
          bookingInput: {
            pickupLocation: {
              latitude: 19.0657,
              longitude: 72.8686,
              address: pickupAddress,
              label: 'Office / BKC',
            },
            dropoffLocation: dropoffAddress.trim()
              ? {
                  latitude: 19.0896,
                  longitude: 72.8656,
                  address: dropoffAddress,
                  label: 'Airport Terminal 2',
                }
              : null,
            bookingType: 'ONE_WAY',
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create corporate booking');
      }

      if (data.requiresApproval) {
        setSuccessMsg(
          'Booking submitted! Under corporate travel policy rules, this booking requires manager approval before dispatching a driver.',
        );
        setTimeout(() => router.push('/corporate/approvals'), 2500);
      } else {
        setSuccessMsg('Corporate ride created & driver search initiated successfully!');
        setTimeout(() => router.push('/corporate/bookings'), 2000);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error submitting booking');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CorporateLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#68dba9] uppercase">
            BOOKING DISPATCH
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
            Book Corporate Travel
          </h1>
          <p className="text-xs sm:text-sm text-[#bccac0] mt-1">
            Schedule official travel for yourself or colleagues with automatic travel policy
            evaluation and cost center allocation.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/50 text-red-300 text-xs">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-[#bccac0] text-sm font-mono animate-pulse">
            Loading corporate travel configuration...
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-[#141822] border border-[#262a33] rounded-2xl p-6 shadow-xl space-y-5"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-mono text-[#bccac0] uppercase font-bold">
                  Pickup Address
                </label>
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  className="w-full bg-[#0a0e16] border border-[#262a33] rounded-xl px-3.5 py-2.5 text-xs text-[#dfe2ee] focus:outline-none focus:ring-2 focus:ring-[#68dba9]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-[#bccac0] uppercase font-bold">
                  Dropoff Address (Optional)
                </label>
                <input
                  type="text"
                  value={dropoffAddress}
                  onChange={(e) => setDropoffAddress(e.target.value)}
                  placeholder="Leave blank if not yet known"
                  className="w-full bg-[#0a0e16] border border-[#262a33] rounded-xl px-3.5 py-2.5 text-xs text-[#dfe2ee] focus:outline-none focus:ring-2 focus:ring-[#68dba9]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-mono text-[#bccac0] uppercase font-bold">
                  Vehicle Category
                </label>
                <select
                  value={vehicleCategory}
                  onChange={(e) => setVehicleCategory(e.target.value)}
                  className="w-full bg-[#0a0e16] border border-[#262a33] rounded-xl px-3 py-2.5 text-xs text-[#dfe2ee] focus:outline-none focus:ring-2 focus:ring-[#68dba9]"
                >
                  <option value="SEDAN">SEDAN (Executive)</option>
                  <option value="SUV">SUV (6-Seater)</option>
                  <option value="HATCHBACK">HATCHBACK (Compact)</option>
                  <option value="LUXURY">LUXURY (Premium)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-[#bccac0] uppercase font-bold">
                  Department
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full bg-[#0a0e16] border border-[#262a33] rounded-xl px-3 py-2.5 text-xs text-[#dfe2ee] focus:outline-none focus:ring-2 focus:ring-[#68dba9]"
                >
                  {departments.length === 0 ? (
                    <option value="">General</option>
                  ) : (
                    departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-[#bccac0] uppercase font-bold">
                  Cost Center Allocation
                </label>
                <select
                  value={costCenterId}
                  onChange={(e) => setCostCenterId(e.target.value)}
                  className="w-full bg-[#0a0e16] border border-[#262a33] rounded-xl px-3 py-2.5 text-xs text-[#dfe2ee] focus:outline-none focus:ring-2 focus:ring-[#68dba9]"
                >
                  {costCenters.length === 0 ? (
                    <option value="">Default Cost Center</option>
                  ) : (
                    costCenters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-[#bccac0] uppercase font-bold">
                Business Purpose / Audit Reason
              </label>
              <textarea
                value={businessPurpose}
                onChange={(e) => setBusinessPurpose(e.target.value)}
                placeholder="Specify business reason for travel (e.g. Client visit, airport transfer, executive commute)..."
                rows={3}
                className="w-full bg-[#0a0e16] border border-[#262a33] rounded-xl px-3.5 py-2.5 text-xs text-[#dfe2ee] focus:outline-none focus:ring-2 focus:ring-[#68dba9]"
                required
              />
            </div>

            <div className="p-4 bg-[#1c2028] border border-[#262a33] rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-[#bccac0] block font-mono">
                  Estimated Fare Billed To Corporate
                </span>
                <span className="text-xl font-extrabold text-[#68dba9] font-['Space_Grotesk']">
                  ₹{estimatedFare.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEstimatedFare(estimatedFare === 1200 ? 3500 : 1200)}
                  className="text-[10px] font-mono px-2.5 py-1 bg-[#262a33] hover:bg-[#343a47] text-[#dfe2ee] rounded border border-[#3d4a42]"
                >
                  Toggle High Fare Simulation (₹{estimatedFare === 1200 ? 3500 : 1200})
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2.5 rounded-xl border border-[#262a33] text-xs font-mono text-[#bccac0] hover:text-[#dfe2ee]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-gradient-to-r from-[#25a475] to-[#68dba9] text-[#00311f] font-bold rounded-xl text-xs flex items-center gap-2 hover:brightness-110 shadow-lg shadow-[#25a475]/20 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">send</span>
                <span>{submitting ? 'Submitting...' : 'Submit Corporate Booking'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </CorporateLayout>
  );
}

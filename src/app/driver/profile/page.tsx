'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DriverLayout } from '@/components/driver-layout';
import { CurrentLocationButton } from '@/components/ui/current-location-button';
import { UnifiedMap } from '@/components/maps/unified-map';
import type { CapturedLocation } from '@/components/use-geolocation-capture';
import { DriverCapabilitySelector } from '@/components/driver/DriverCapabilitySelector';

interface DriverProfileData {
  firstName: string;
  lastName: string;
  displayName: string;
  profileImageUrl: string;
  dateOfBirth: string;
  gender: string;
  bio: string;
  drivingExperienceYears: number;
  primaryServiceArea: string;
  // Empty string means "no rate set / opted out of this hire type" —
  // converted to null on submit, never sent as 0.
  dailyHireRate: string;
  weeklyHireRate: string;
  monthlyHireRate: string;
}

export default function DriverProfileEditPage() {
  const [form, setForm] = useState<DriverProfileData>({
    firstName: '',
    lastName: '',
    displayName: '',
    profileImageUrl: '',
    dateOfBirth: '',
    gender: 'MALE',
    bio: '',
    drivingExperienceYears: 1,
    primaryServiceArea: 'Bengaluru Central',
    dailyHireRate: '',
    weeklyHireRate: '',
    monthlyHireRate: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // DriverProfile.primaryServiceArea has no companion latitude/longitude
  // columns — it's a free-text descriptor, not a stored coordinate. These
  // hold the just-captured device location only for this page's own
  // reverse-geocode-and-preview step; they're never sent to the server —
  // only the resolved text the driver reviews/edits below is saved.
  const [capturedCoords, setCapturedCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/driver/profile');
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.profile) {
            setForm({
              firstName: data.profile.firstName || '',
              lastName: data.profile.lastName || '',
              displayName: data.profile.displayName || '',
              profileImageUrl: data.profile.profileImageUrl || '',
              dateOfBirth: data.profile.dateOfBirth
                ? data.profile.dateOfBirth.substring(0, 10)
                : '',
              gender: data.profile.gender || 'MALE',
              bio: data.profile.bio || '',
              drivingExperienceYears: data.profile.drivingExperienceYears || 1,
              primaryServiceArea: data.profile.primaryServiceArea || '',
              dailyHireRate:
                data.profile.dailyHireRate != null ? String(data.profile.dailyHireRate) : '',
              weeklyHireRate:
                data.profile.weeklyHireRate != null ? String(data.profile.weeklyHireRate) : '',
              monthlyHireRate:
                data.profile.monthlyHireRate != null ? String(data.profile.monthlyHireRate) : '',
            });
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
  }, []);

  // Reverse-geocodes the captured device coordinates into a real, readable
  // address (street, city, state, pincode) via the existing
  // /api/location/reverse-geocode endpoint — the same one the customer
  // saved-places flow uses — instead of the placeholder "Current location
  // selected" text. The map preview below is shown from the captured
  // coordinates for visual confirmation; only the resolved text (which the
  // driver can still edit) is ever saved to primaryServiceArea, since the
  // column itself stores free text, not coordinates.
  const handleUseCurrentLocation = async (location: CapturedLocation) => {
    setCapturedCoords({ latitude: location.latitude, longitude: location.longitude });
    setLocationError(null);
    setResolvingAddress(true);
    try {
      const res = await fetch(
        `/api/location/reverse-geocode?lat=${location.latitude}&lng=${location.longitude}`,
      );
      if (res.ok) {
        const data = await res.json();
        const address = data.address;
        if (address) {
          const resolvedText =
            [address.addressLine1, address.city, address.state, address.postalCode]
              .filter(Boolean)
              .join(', ') || address.formattedAddress;
          if (resolvedText) {
            setForm((prev) => ({ ...prev, primaryServiceArea: resolvedText }));
          } else {
            setLocationError(
              "Location detected, but we couldn't resolve an address. Please enter it manually below.",
            );
          }
        }
      } else {
        setLocationError(
          "Location detected, but we couldn't resolve an address. Please enter it manually below.",
        );
      }
    } catch {
      setLocationError(
        "Location detected, but we couldn't resolve an address. Please enter it manually below.",
      );
    } finally {
      setResolvingAddress(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/driver/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          dailyHireRate: form.dailyHireRate.trim() === '' ? null : Number(form.dailyHireRate),
          weeklyHireRate: form.weeklyHireRate.trim() === '' ? null : Number(form.weeklyHireRate),
          monthlyHireRate: form.monthlyHireRate.trim() === '' ? null : Number(form.monthlyHireRate),
        }),
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(
          resData.message || resData.error?.message || 'Failed to update driver profile',
        );
      }

      setMessage({ type: 'success', text: 'Driver profile updated successfully!' });
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error updating profile',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DriverLayout>
      <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                margin: 0,
                color: 'var(--color-text-primary)',
              }}
            >
              Driver Professional Profile
            </h1>
            <p
              style={{
                margin: '0.25rem 0 0 0',
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              Provide your driving experience and primary operational service area.
            </p>
          </div>
          <Link
            href="/driver"
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            ← Driver Portal
          </Link>
        </header>

        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '0.75rem',
            padding: '2rem',
          }}
        >
          {message && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                marginBottom: '1.5rem',
                backgroundColor:
                  message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                border: `1px solid ${message.type === 'success' ? '#22c55e' : 'var(--color-danger)'}`,
                color: message.type === 'success' ? '#22c55e' : 'var(--color-danger)',
                fontSize: '0.875rem',
              }}
            >
              {message.text}
            </div>
          )}

          {loading ? (
            <p style={{ color: 'var(--color-text-secondary)' }}>Loading profile data...</p>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      marginBottom: '0.375rem',
                    }}
                  >
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      borderRadius: '0.375rem',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-background)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      marginBottom: '0.375rem',
                    }}
                  >
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      borderRadius: '0.375rem',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-background)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    marginBottom: '0.375rem',
                  }}
                >
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Captain Ramesh"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    borderRadius: '0.375rem',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      marginBottom: '0.375rem',
                    }}
                  >
                    Date of Birth (Min 18 Yrs)
                  </label>
                  <input
                    type="date"
                    required
                    value={form.dateOfBirth}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      borderRadius: '0.375rem',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-background)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      marginBottom: '0.375rem',
                    }}
                  >
                    Driving Experience (Years)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={form.drivingExperienceYears}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        drivingExperienceYears: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      borderRadius: '0.375rem',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-background)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    marginBottom: '0.375rem',
                  }}
                >
                  Primary Service Area
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bengaluru, Koramangala, Indiranagar"
                  value={form.primaryServiceArea}
                  onChange={(e) => setForm({ ...form, primaryServiceArea: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    borderRadius: '0.375rem',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-text-primary)',
                  }}
                />
                <div style={{ marginTop: '0.5rem' }}>
                  <CurrentLocationButton onLocated={handleUseCurrentLocation} />
                </div>

                {resolvingAddress && (
                  <p
                    style={{
                      marginTop: '0.5rem',
                      fontSize: '0.8125rem',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    Resolving address from your location…
                  </p>
                )}

                {locationError && (
                  <p
                    style={{
                      marginTop: '0.5rem',
                      fontSize: '0.8125rem',
                      color: 'var(--color-danger)',
                    }}
                  >
                    {locationError}
                  </p>
                )}

                {capturedCoords && (
                  <div style={{ marginTop: '0.75rem', borderRadius: '0.5rem', overflow: 'hidden' }}>
                    <UnifiedMap
                      markers={[
                        {
                          id: 'driver-service-area',
                          position: capturedCoords,
                          type: 'CURRENT_LOCATION',
                          title: 'Your Current Location',
                          snippet: form.primaryServiceArea,
                        },
                      ]}
                      height="220px"
                      fitBounds={true}
                      showControls={true}
                      ariaLabel="Map preview of your detected current location"
                    />
                  </div>
                )}
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    marginBottom: '0.375rem',
                  }}
                >
                  Professional Biography
                </label>
                <textarea
                  rows={3}
                  placeholder="Tell riders about your driving experience..."
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    borderRadius: '0.375rem',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    marginBottom: '0.375rem',
                  }}
                >
                  Hire Rates (₹)
                </label>
                <p
                  style={{
                    margin: '0 0 0.75rem 0',
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Set your own price for a full daily, weekly, or monthly hire. Customers browsing
                  drivers for these bookings will see this rate and pick you directly at it. Leave a
                  field blank to opt out of that hire type.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        color: 'var(--color-text-secondary)',
                        marginBottom: '0.25rem',
                      }}
                    >
                      Per Day
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="e.g. 2500"
                      value={form.dailyHireRate}
                      onChange={(e) => setForm({ ...form, dailyHireRate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.625rem',
                        borderRadius: '0.375rem',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-background)',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        color: 'var(--color-text-secondary)',
                        marginBottom: '0.25rem',
                      }}
                    >
                      Per Week
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="e.g. 15000"
                      value={form.weeklyHireRate}
                      onChange={(e) => setForm({ ...form, weeklyHireRate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.625rem',
                        borderRadius: '0.375rem',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-background)',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        color: 'var(--color-text-secondary)',
                        marginBottom: '0.25rem',
                      }}
                    >
                      Per Month
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="e.g. 45000"
                      value={form.monthlyHireRate}
                      onChange={(e) => setForm({ ...form, monthlyHireRate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.625rem',
                        borderRadius: '0.375rem',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-background)',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.375rem',
                    backgroundColor: 'var(--color-primary)',
                    color: '#ffffff',
                    fontWeight: 600,
                    border: 'none',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? 'Saving Profile...' : 'Save Profile Details'}
                </button>
              </div>
            </form>
          )}

          <div style={{ marginTop: '2rem' }}>
            <DriverCapabilitySelector />
          </div>
        </div>
      </div>
    </DriverLayout>
  );
}

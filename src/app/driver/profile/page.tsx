'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DriverLayout } from '@/components/driver-layout';
import { CurrentLocationButton } from '@/components/ui/current-location-button';
import { UnifiedMap } from '@/components/maps/unified-map';
import type { CapturedLocation } from '@/components/use-geolocation-capture';
import { DriverCapabilitySelector } from '@/components/driver/DriverCapabilitySelector';
import { SpokenLanguageSelector } from '@/components/ui/spoken-language-selector';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { FormField, FieldGroup } from '@/components/ui/form-field';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';

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
  languagesSpoken: string[];
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
    languagesSpoken: ['en', 'hi'],
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
              languagesSpoken:
                data.profile.languagesSpoken && data.profile.languagesSpoken.length > 0
                  ? data.profile.languagesSpoken
                  : ['en', 'hi'],
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
      <div className="w-full max-w-[800px] mx-auto">
        <header className="flex flex-wrap justify-between items-center gap-4 mb-8 pb-4 border-b border-border">
          <div>
            <h1 className="text-2xl font-bold text-on-surface font-['Space_Grotesk']">
              Driver Professional Profile
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Provide your driving experience and primary operational service area.
            </p>
          </div>
          <Link
            href="/driver"
            className="px-4 py-2 rounded-md border border-border bg-surface-container text-on-surface text-sm font-medium transition-colors hover:bg-surface-container-high active:bg-surface-container-highest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          >
            ← Driver Portal
          </Link>
        </header>

        <Card className="p-8">
          {message && (
            <Alert tone={message.type === 'success' ? 'success' : 'error'} className="mb-6">
              {message.text}
            </Alert>
          )}

          {loading ? (
            <p className="text-on-surface-variant">Loading profile data...</p>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="First Name">
                  <Input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  />
                </FormField>
                <FormField label="Last Name">
                  <Input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  />
                </FormField>
              </div>

              <FormField label="Display Name">
                <Input
                  type="text"
                  placeholder="e.g. Captain Ramesh"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Date of Birth (Min 18 Yrs)">
                  <Input
                    type="date"
                    required
                    value={form.dateOfBirth}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  />
                </FormField>
                <FormField label="Driving Experience (Years)">
                  <Input
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
                  />
                </FormField>
              </div>

              <div>
                <FormField label="Primary Service Area">
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Bengaluru, Koramangala, Indiranagar"
                    value={form.primaryServiceArea}
                    onChange={(e) => setForm({ ...form, primaryServiceArea: e.target.value })}
                  />
                </FormField>
                <div className="mt-2">
                  <CurrentLocationButton onLocated={handleUseCurrentLocation} />
                </div>

                {resolvingAddress && (
                  <p className="mt-2 text-[13px] text-on-surface-variant">
                    Resolving address from your location…
                  </p>
                )}

                {locationError && (
                  <p className="mt-2 text-[13px] text-rose-500 dark:text-rose-400">{locationError}</p>
                )}

                {capturedCoords && (
                  <div className="mt-3 rounded-lg overflow-hidden">
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

              {/* Spoken & Understood Languages Selector */}
              <div className="pt-4 border-t border-border">
                <SpokenLanguageSelector
                  selectedLanguages={form.languagesSpoken}
                  onChange={(langs) => setForm({ ...form, languagesSpoken: langs })}
                  label="Spoken & Understood Languages"
                  description="Select all languages you can speak or understand so customers can easily communicate with you."
                />
              </div>

              <FormField label="Professional Biography">
                <Textarea
                  rows={3}
                  placeholder="Tell riders about your driving experience..."
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </FormField>

              <div>
                <FormField
                  label="Hire Rates (₹)"
                  hint="Set your own price for a full daily, weekly, or monthly hire. Customers browsing drivers for these bookings will see this rate and pick you directly at it. Leave a field blank to opt out of that hire type."
                >
                  <FieldGroup className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField label="Per Day">
                      <Input
                        type="number"
                        min={0}
                        placeholder="e.g. 2500"
                        value={form.dailyHireRate}
                        onChange={(e) => setForm({ ...form, dailyHireRate: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Per Week">
                      <Input
                        type="number"
                        min={0}
                        placeholder="e.g. 15000"
                        value={form.weeklyHireRate}
                        onChange={(e) => setForm({ ...form, weeklyHireRate: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Per Month">
                      <Input
                        type="number"
                        min={0}
                        placeholder="e.g. 45000"
                        value={form.monthlyHireRate}
                        onChange={(e) => setForm({ ...form, monthlyHireRate: e.target.value })}
                      />
                    </FormField>
                  </FieldGroup>
                </FormField>
              </div>

              <div className="mt-4">
                <Button type="submit" isLoading={saving} size="lg" className="min-w-[200px]">
                  {saving ? 'Saving Profile...' : 'Save Profile Details'}
                </Button>
              </div>
            </form>
          )}

          <div className="mt-8">
            <DriverCapabilitySelector />
          </div>
        </Card>
      </div>
    </DriverLayout>
  );
}

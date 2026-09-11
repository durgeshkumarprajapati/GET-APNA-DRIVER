'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerLayout } from '@/components/customer-layout';
import { useToast, ToastViewport } from '@/components/ui/toast';

interface ProfileData {
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  dateOfBirth: string | null;
}

interface LocationData {
  id: string;
  label: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

interface PreferenceData {
  theme: 'SYSTEM' | 'LIGHT' | 'DARK';
  language: string;
  pushNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'locations' | 'preferences' | 'security'>(
    'profile',
  );

  // Ride Security / PIN State
  const [pinStatus, setPinStatus] = useState<{
    isPinSet: boolean;
    updatedAt: string | null;
  } | null>(null);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [pinMessage, setPinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  // Profile State
  const [profile, setProfile] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    displayName: '',
    avatarUrl: '',
    dateOfBirth: '',
  });
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Locations State
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newLocation, setNewLocation] = useState({
    label: '',
    addressLine1: '',
    addressLine2: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    postalCode: '560001',
    latitude: 12.9716,
    longitude: 77.5946,
    isDefault: false,
  });
  const [locationSaving, setLocationSaving] = useState(false);
  const { toast, showToast, dismissToast } = useToast();

  // Arriving here right after login with an incomplete profile (e.g. a
  // brand-new Google sign-in) — see src/app/page.tsx's redirect. A
  // one-time notice, not a persistent banner.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('profileIncomplete') === '1') {
      showToast(
        'Your profile is not complete. Please update your information to continue.',
        'info',
      );
      params.delete('profileIncomplete');
      const cleanUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
      window.history.replaceState(null, '', cleanUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preferences State
  const [preferences, setPreferences] = useState<PreferenceData>({
    theme: 'SYSTEM',
    language: 'en',
    pushNotificationsEnabled: true,
    smsNotificationsEnabled: true,
    emailNotificationsEnabled: true,
  });
  const [prefLoading, setPrefLoading] = useState(true);
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefMessage, setPrefMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const loadLocations = async () => {
    try {
      const res = await fetch('/api/customer/locations');
      if (res.ok) {
        const data = (await res.json()) as { locations?: LocationData[] };
        setLocations(data.locations || []);
      }
    } catch {
      // Ignore load error
    }
  };

  // Fetch initial data
  useEffect(() => {
    let active = true;

    const loadAll = async () => {
      try {
        const [profRes, locRes, prefRes, pinRes] = await Promise.all([
          fetch('/api/customer/profile'),
          fetch('/api/customer/locations'),
          fetch('/api/customer/preferences'),
          fetch('/api/customer/ride-pin'),
        ]);

        if (active && profRes.ok) {
          const data = (await profRes.json()) as { profile?: ProfileData };
          if (data.profile) {
            setProfile({
              firstName: data.profile.firstName || '',
              lastName: data.profile.lastName || '',
              displayName: data.profile.displayName || '',
              avatarUrl: data.profile.avatarUrl || '',
              dateOfBirth: data.profile.dateOfBirth
                ? data.profile.dateOfBirth.substring(0, 10)
                : '',
            });
          }
        }

        if (active && locRes.ok) {
          const data = (await locRes.json()) as { locations?: LocationData[] };
          setLocations(data.locations || []);
        }

        if (active && prefRes.ok) {
          const data = (await prefRes.json()) as { preferences?: PreferenceData };
          if (data.preferences) {
            setPreferences({
              theme: data.preferences.theme || 'SYSTEM',
              language: data.preferences.language || 'en',
              pushNotificationsEnabled: data.preferences.pushNotificationsEnabled ?? true,
              smsNotificationsEnabled: data.preferences.smsNotificationsEnabled ?? true,
              emailNotificationsEnabled: data.preferences.emailNotificationsEnabled ?? true,
            });
          }
        }

        if (active && pinRes.ok) {
          const data = await pinRes.json();
          if (data.status) {
            setPinStatus(data.status);
          }
        }
      } catch {
        // Ignore load errors
      } finally {
        if (active) {
          setProfileLoading(false);
          setLocationsLoading(false);
          setPrefLoading(false);
        }
      }
    };

    void loadAll();

    return () => {
      active = false;
    };
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);

    try {
      const res = await fetch('/api/customer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Failed to update profile');
      }

      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: unknown) {
      setProfileMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update profile',
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocationSaving(true);

    try {
      const res = await fetch('/api/customer/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLocation),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Failed to add location');
      }

      setShowLocationModal(false);
      setNewLocation({
        label: '',
        addressLine1: '',
        addressLine2: '',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
        postalCode: '560001',
        latitude: 12.9716,
        longitude: 77.5946,
        isDefault: false,
      });
      await loadLocations();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error adding location', 'error');
    } finally {
      setLocationSaving(false);
    }
  };

  const handleSetDefaultLocation = async (id: string) => {
    try {
      const res = await fetch(`/api/customer/locations/${id}/default`, {
        method: 'PUT',
      });
      if (res.ok) {
        await loadLocations();
      }
    } catch {
      // Error handling
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this saved location?')) return;
    try {
      const res = await fetch(`/api/customer/locations/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadLocations();
      }
    } catch {
      // Error handling
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefSaving(true);
    setPrefMessage(null);

    try {
      const res = await fetch('/api/customer/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Failed to update preferences');
      }

      setPrefMessage({ type: 'success', text: 'Preferences saved successfully!' });
    } catch (err: unknown) {
      setPrefMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update preferences',
      });
    } finally {
      setPrefSaving(false);
    }
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinSaving(true);
    setPinMessage(null);

    if (!/^\d{6}$/.test(newPin)) {
      setPinMessage({ type: 'error', text: 'Ride PIN must be exactly 6 numeric digits.' });
      setPinSaving(false);
      return;
    }

    if (newPin !== confirmPin) {
      setPinMessage({ type: 'error', text: 'New PIN and Confirm PIN do not match.' });
      setPinSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/customer/ride-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: newPin }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update Ride PIN');
      }

      setPinStatus(data.status);
      setNewPin('');
      setConfirmPin('');
      setPinMessage({ type: 'success', text: 'Ride PIN updated successfully!' });
    } catch (err: unknown) {
      setPinMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update Ride PIN',
      });
    } finally {
      setPinSaving(false);
    }
  };

  return (
    <CustomerLayout>
      <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
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
              Account & Settings
            </h1>
            <p
              style={{
                margin: '0.25rem 0 0 0',
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              Manage your personal profile, saved locations, and system preferences.
            </p>
          </div>
          <Link
            href="/"
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
            ← Home
          </Link>
        </header>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '2rem',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '0.75rem 1.25rem',
              fontSize: '1rem',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color:
                activeTab === 'profile' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              borderBottom:
                activeTab === 'profile'
                  ? '3px solid var(--color-primary)'
                  : '3px solid transparent',
            }}
          >
            Personal Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('locations')}
            style={{
              padding: '0.75rem 1.25rem',
              fontSize: '1rem',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color:
                activeTab === 'locations' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              borderBottom:
                activeTab === 'locations'
                  ? '3px solid var(--color-primary)'
                  : '3px solid transparent',
            }}
          >
            Saved Locations ({locations.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            style={{
              padding: '0.75rem 1.25rem',
              fontSize: '1rem',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color:
                activeTab === 'preferences'
                  ? 'var(--color-primary)'
                  : 'var(--color-text-secondary)',
              borderBottom:
                activeTab === 'preferences'
                  ? '3px solid var(--color-primary)'
                  : '3px solid transparent',
            }}
          >
            Preferences
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            style={{
              padding: '0.75rem 1.25rem',
              fontSize: '1rem',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color:
                activeTab === 'security' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              borderBottom:
                activeTab === 'security'
                  ? '3px solid var(--color-primary)'
                  : '3px solid transparent',
            }}
          >
            Ride Security
          </button>
        </div>

        {/* Profile Tab Content */}
        {activeTab === 'profile' && (
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.75rem',
              padding: '2rem',
            }}
          >
            <h2
              style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: 0, marginBottom: '1.5rem' }}
            >
              Customer Profile
            </h2>

            {profileMessage && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  marginBottom: '1.5rem',
                  backgroundColor:
                    profileMessage.type === 'success'
                      ? 'rgba(34, 197, 94, 0.1)'
                      : 'rgba(220, 38, 38, 0.1)',
                  border: `1px solid ${profileMessage.type === 'success' ? '#22c55e' : 'var(--color-danger)'}`,
                  color: profileMessage.type === 'success' ? '#22c55e' : 'var(--color-danger)',
                  fontSize: '0.875rem',
                }}
              >
                {profileMessage.text}
              </div>
            )}

            {profileLoading ? (
              <p style={{ color: 'var(--color-text-secondary)' }}>Loading profile data...</p>
            ) : (
              <form
                onSubmit={handleSaveProfile}
                style={{ display: 'grid', gap: '1.25rem', maxWidth: '600px' }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label
                      htmlFor="firstName"
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
                      id="firstName"
                      type="text"
                      placeholder="Enter first name"
                      value={profile.firstName || ''}
                      onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.625rem 0.875rem',
                        borderRadius: '0.375rem',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-background)',
                        color: 'var(--color-text-primary)',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="lastName"
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
                      id="lastName"
                      type="text"
                      placeholder="Enter last name"
                      value={profile.lastName || ''}
                      onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.625rem 0.875rem',
                        borderRadius: '0.375rem',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-background)',
                        color: 'var(--color-text-primary)',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="displayName"
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
                    id="displayName"
                    type="text"
                    placeholder="How should drivers address you?"
                    value={profile.displayName || ''}
                    onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      borderRadius: '0.375rem',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-background)',
                      color: 'var(--color-text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="avatarUrl"
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      marginBottom: '0.375rem',
                    }}
                  >
                    Avatar Image URL
                  </label>
                  <input
                    id="avatarUrl"
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    value={profile.avatarUrl || ''}
                    onChange={(e) => setProfile({ ...profile, avatarUrl: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      borderRadius: '0.375rem',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-background)',
                      color: 'var(--color-text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="dateOfBirth"
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      marginBottom: '0.375rem',
                    }}
                  >
                    Date of Birth
                  </label>
                  <input
                    id="dateOfBirth"
                    type="date"
                    value={profile.dateOfBirth || ''}
                    onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      borderRadius: '0.375rem',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-background)',
                      color: 'var(--color-text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <button
                    type="submit"
                    disabled={profileSaving}
                    style={{
                      padding: '0.75rem 1.5rem',
                      borderRadius: '0.375rem',
                      backgroundColor: 'var(--color-primary)',
                      color: '#ffffff',
                      fontWeight: 600,
                      border: 'none',
                      cursor: profileSaving ? 'not-allowed' : 'pointer',
                      opacity: profileSaving ? 0.7 : 1,
                    }}
                  >
                    {profileSaving ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Locations Tab Content */}
        {activeTab === 'locations' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
              }}
            >
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                Saved Pickup & Destination Addresses
              </h2>
              <button
                type="button"
                onClick={() => setShowLocationModal(true)}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.375rem',
                  backgroundColor: 'var(--color-primary)',
                  color: '#ffffff',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                + Add New Location
              </button>
            </div>

            {locationsLoading ? (
              <p style={{ color: 'var(--color-text-secondary)' }}>Loading saved locations...</p>
            ) : locations.length === 0 ? (
              <div
                style={{
                  padding: '3rem 1.5rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: '0.75rem',
                  border: '1px dashed var(--color-border)',
                }}
              >
                <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 1rem 0' }}>
                  No saved locations found. Add your Home, Work, or favorite pickup points for quick
                  1-tap bookings.
                </p>
                <button
                  type="button"
                  onClick={() => setShowLocationModal(true)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    backgroundColor: 'var(--color-primary)',
                    color: '#ffffff',
                    fontWeight: 500,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Add Your First Location
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gap: '1rem',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                }}
              >
                {locations.map((loc) => (
                  <div
                    key={loc.id}
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      border: `1px solid ${loc.isDefault ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      borderRadius: '0.75rem',
                      padding: '1.25rem',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
                        {loc.label}
                      </h3>
                      {loc.isDefault && (
                        <span
                          style={{
                            backgroundColor: 'rgba(37, 99, 235, 0.1)',
                            color: 'var(--color-primary)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                          }}
                        >
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        margin: '0 0 0.5rem 0',
                        fontSize: '0.875rem',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {loc.addressLine1}
                      {loc.addressLine2 ? `, ${loc.addressLine2}` : ''}
                    </p>
                    <p
                      style={{
                        margin: '0 0 1rem 0',
                        fontSize: '0.75rem',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {loc.city}, {loc.state} {loc.postalCode} | Coordinates: [
                      {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}]
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      {!loc.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultLocation(loc.id)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            borderRadius: '0.25rem',
                            border: '1px solid var(--color-border)',
                            backgroundColor: 'var(--color-background)',
                            color: 'var(--color-text-primary)',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          Set as Default
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteLocation(loc.id)}
                        style={{
                          padding: '0.375rem 0.75rem',
                          borderRadius: '0.25rem',
                          border: '1px solid var(--color-danger)',
                          backgroundColor: 'transparent',
                          color: 'var(--color-danger)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Location Modal */}
            {showLocationModal && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 100,
                  padding: '1rem',
                }}
              >
                <div
                  style={{
                    backgroundColor: 'var(--color-surface-elevated)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '0.75rem',
                    padding: '2rem',
                    width: '100%',
                    maxWidth: '500px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                  }}
                >
                  <h3 style={{ marginTop: 0, marginBottom: '1.25rem', fontSize: '1.25rem' }}>
                    Add Saved Location
                  </h3>
                  <form onSubmit={handleSaveLocation} style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          marginBottom: '0.25rem',
                        }}
                      >
                        Label (e.g. Home, Work, Gym)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Home"
                        value={newLocation.label}
                        onChange={(e) => setNewLocation({ ...newLocation, label: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          borderRadius: '0.25rem',
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
                          marginBottom: '0.25rem',
                        }}
                      >
                        Address Line 1
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="123 MG Road"
                        value={newLocation.addressLine1}
                        onChange={(e) =>
                          setNewLocation({ ...newLocation, addressLine1: e.target.value })
                        }
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          borderRadius: '0.25rem',
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
                          marginBottom: '0.25rem',
                        }}
                      >
                        Address Line 2 (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Apt 4B"
                        value={newLocation.addressLine2}
                        onChange={(e) =>
                          setNewLocation({ ...newLocation, addressLine2: e.target.value })
                        }
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          borderRadius: '0.25rem',
                          border: '1px solid var(--color-border)',
                          backgroundColor: 'var(--color-background)',
                          color: 'var(--color-text-primary)',
                        }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            marginBottom: '0.25rem',
                          }}
                        >
                          City
                        </label>
                        <input
                          type="text"
                          required
                          value={newLocation.city}
                          onChange={(e) => setNewLocation({ ...newLocation, city: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '0.25rem',
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
                            marginBottom: '0.25rem',
                          }}
                        >
                          Postal Code
                        </label>
                        <input
                          type="text"
                          required
                          value={newLocation.postalCode}
                          onChange={(e) =>
                            setNewLocation({ ...newLocation, postalCode: e.target.value })
                          }
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '0.25rem',
                            border: '1px solid var(--color-border)',
                            backgroundColor: 'var(--color-background)',
                            color: 'var(--color-text-primary)',
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            marginBottom: '0.25rem',
                          }}
                        >
                          Latitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={newLocation.latitude}
                          onChange={(e) =>
                            setNewLocation({
                              ...newLocation,
                              latitude: parseFloat(e.target.value) || 0,
                            })
                          }
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '0.25rem',
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
                            marginBottom: '0.25rem',
                          }}
                        >
                          Longitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={newLocation.longitude}
                          onChange={(e) =>
                            setNewLocation({
                              ...newLocation,
                              longitude: parseFloat(e.target.value) || 0,
                            })
                          }
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '0.25rem',
                            border: '1px solid var(--color-border)',
                            backgroundColor: 'var(--color-background)',
                            color: 'var(--color-text-primary)',
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        id="isDefault"
                        type="checkbox"
                        checked={newLocation.isDefault}
                        onChange={(e) =>
                          setNewLocation({ ...newLocation, isDefault: e.target.checked })
                        }
                      />
                      <label htmlFor="isDefault" style={{ fontSize: '0.875rem' }}>
                        Set as Default Location
                      </label>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '0.75rem',
                        marginTop: '1rem',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setShowLocationModal(false)}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '0.25rem',
                          border: '1px solid var(--color-border)',
                          backgroundColor: 'transparent',
                          color: 'var(--color-text-primary)',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={locationSaving}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '0.25rem',
                          border: 'none',
                          backgroundColor: 'var(--color-primary)',
                          color: '#ffffff',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {locationSaving ? 'Saving...' : 'Save Location'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Preferences Tab Content */}
        {activeTab === 'preferences' && (
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.75rem',
              padding: '2rem',
            }}
          >
            <h2
              style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: 0, marginBottom: '1.5rem' }}
            >
              System & Notification Preferences
            </h2>

            {prefMessage && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  marginBottom: '1.5rem',
                  backgroundColor:
                    prefMessage.type === 'success'
                      ? 'rgba(34, 197, 94, 0.1)'
                      : 'rgba(220, 38, 38, 0.1)',
                  border: `1px solid ${prefMessage.type === 'success' ? '#22c55e' : 'var(--color-danger)'}`,
                  color: prefMessage.type === 'success' ? '#22c55e' : 'var(--color-danger)',
                  fontSize: '0.875rem',
                }}
              >
                {prefMessage.text}
              </div>
            )}

            {prefLoading ? (
              <p style={{ color: 'var(--color-text-secondary)' }}>Loading preferences...</p>
            ) : (
              <form
                onSubmit={handleSavePreferences}
                style={{ display: 'grid', gap: '1.5rem', maxWidth: '600px' }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      marginBottom: '0.5rem',
                    }}
                  >
                    UI Theme Mode
                  </label>
                  <select
                    value={preferences.theme}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        theme: e.target.value as PreferenceData['theme'],
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      borderRadius: '0.375rem',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-background)',
                      color: 'var(--color-text-primary)',
                      outline: 'none',
                    }}
                  >
                    <option value="SYSTEM">System Preference</option>
                    <option value="LIGHT">Light Mode</option>
                    <option value="DARK">Dark Mode</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      marginBottom: '0.5rem',
                    }}
                  >
                    Language
                  </label>
                  <select
                    value={preferences.language}
                    onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      borderRadius: '0.375rem',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-background)',
                      color: 'var(--color-text-primary)',
                      outline: 'none',
                    }}
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi (हिंदी)</option>
                    <option value="kn">Kannada (ಕನ್ನಡ)</option>
                    <option value="ta">Tamil (தமிழ்)</option>
                    <option value="te">Telugu (ತೆಲುಗು)</option>
                  </select>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 1rem 0' }}>
                    Notification Channels
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={preferences.pushNotificationsEnabled}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            pushNotificationsEnabled: e.target.checked,
                          })
                        }
                      />
                      <span style={{ fontSize: '0.875rem' }}>Enable Mobile Push Notifications</span>
                    </label>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={preferences.smsNotificationsEnabled}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            smsNotificationsEnabled: e.target.checked,
                          })
                        }
                      />
                      <span style={{ fontSize: '0.875rem' }}>Enable SMS Alerts</span>
                    </label>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={preferences.emailNotificationsEnabled}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            emailNotificationsEnabled: e.target.checked,
                          })
                        }
                      />
                      <span style={{ fontSize: '0.875rem' }}>Enable Email Updates & Receipts</span>
                    </label>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={prefSaving}
                    style={{
                      padding: '0.75rem 1.5rem',
                      borderRadius: '0.375rem',
                      backgroundColor: 'var(--color-primary)',
                      color: '#ffffff',
                      fontWeight: 600,
                      border: 'none',
                      cursor: prefSaving ? 'not-allowed' : 'pointer',
                      opacity: prefSaving ? 0.7 : 1,
                    }}
                  >
                    {prefSaving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Ride Security Tab Content */}
        {activeTab === 'security' && (
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.75rem',
              padding: '2rem',
            }}
          >
            <h2
              style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: 0, marginBottom: '0.5rem' }}
            >
              Ride Security & Verification PIN
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                marginBottom: '1.5rem',
              }}
            >
              Your 6-digit Ride PIN is used by your assigned driver to verify your identity before
              starting your ride.
            </p>

            {pinMessage && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  marginBottom: '1.5rem',
                  backgroundColor:
                    pinMessage.type === 'success'
                      ? 'rgba(34, 197, 94, 0.1)'
                      : 'rgba(220, 38, 38, 0.1)',
                  border: `1px solid ${pinMessage.type === 'success' ? '#22c55e' : 'var(--color-danger)'}`,
                  color: pinMessage.type === 'success' ? '#22c55e' : 'var(--color-danger)',
                  fontSize: '0.875rem',
                }}
              >
                {pinMessage.text}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                borderRadius: '0.5rem',
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                marginBottom: '1.5rem',
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  Current PIN Status
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-secondary)',
                    marginTop: '0.25rem',
                  }}
                >
                  {pinStatus?.isPinSet
                    ? `Configured (Updated: ${pinStatus.updatedAt ? new Date(pinStatus.updatedAt).toLocaleDateString() : 'N/A'})`
                    : 'PIN Not Set — Please configure your 6-digit PIN below.'}
                </div>
              </div>
              <span
                style={{
                  padding: '0.25rem 0.625rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backgroundColor: pinStatus?.isPinSet
                    ? 'rgba(34, 197, 94, 0.15)'
                    : 'rgba(234, 179, 8, 0.15)',
                  color: pinStatus?.isPinSet ? '#22c55e' : '#eab308',
                  border: `1px solid ${pinStatus?.isPinSet ? '#22c55e' : '#eab308'}`,
                }}
              >
                {pinStatus?.isPinSet ? 'PIN SET' : 'PIN NOT SET'}
              </span>
            </div>

            <form
              onSubmit={handleSavePin}
              style={{ display: 'grid', gap: '1.25rem', maxWidth: '450px' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    marginBottom: '0.5rem',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  New 6-Digit Ride PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6 numeric digits"
                  required
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: '0.375rem',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-text-primary)',
                    fontFamily: 'monospace',
                    fontSize: '1.125rem',
                    letterSpacing: '0.25rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    marginBottom: '0.5rem',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  Confirm 6-Digit Ride PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Re-enter 6 numeric digits"
                  required
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: '0.375rem',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-text-primary)',
                    fontFamily: 'monospace',
                    fontSize: '1.125rem',
                    letterSpacing: '0.25rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={pinSaving || newPin.length !== 6 || confirmPin.length !== 6}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.375rem',
                    backgroundColor: 'var(--color-primary)',
                    color: '#ffffff',
                    fontWeight: 600,
                    border: 'none',
                    cursor: pinSaving ? 'not-allowed' : 'pointer',
                    opacity: pinSaving || newPin.length !== 6 || confirmPin.length !== 6 ? 0.7 : 1,
                  }}
                >
                  {pinSaving ? 'Updating PIN...' : 'Save Ride PIN'}
                </button>
              </div>
            </form>
          </div>
        )}
        <ToastViewport toast={toast} onDismiss={dismissToast} />
      </div>
    </CustomerLayout>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/driver/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
    <div
      style={{ minHeight: '100vh', padding: '2rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}
    >
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
                    setForm({ ...form, drivingExperienceYears: parseInt(e.target.value, 10) || 0 })
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
      </div>
    </div>
  );
}

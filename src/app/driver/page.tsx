'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DriverData {
  profile: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    onboardingStatus: string;
    verificationStatus: string;
    approvalStatus: string;
    availabilityStatus: string;
    rejectionReason: string | null;
    changesRequestedReason: string | null;
  };
  evaluation: {
    isEligible: boolean;
    reasons: string[];
  };
}

export default function DriverDashboardPage() {
  const [data, setData] = useState<DriverData | null>(null);
  const [loading, setLoading] = useState(true);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/driver/availability');
        if (res.ok && isMounted) {
          const availData = await res.json();
          const onbRes = await fetch('/api/driver/onboarding');
          if (onbRes.ok && isMounted) {
            const onbData = await onbRes.json();
            setData({
              profile: {
                ...onbData.profile,
                availabilityStatus: availData.availabilityStatus,
              },
              evaluation: {
                isEligible: availData.isEligible,
                reasons: availData.reasons,
              },
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

  const handleToggleAvailability = async (target: 'AVAILABLE' | 'OFFLINE') => {
    setAvailabilitySaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/driver/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStatus: target }),
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(
          resData.message || resData.error?.message || 'Failed to update availability.',
        );
      }

      if (data) {
        setData({
          ...data,
          profile: {
            ...data.profile,
            availabilityStatus: resData.profile.availabilityStatus,
          },
        });
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error updating availability');
    } finally {
      setAvailabilitySaving(false);
    }
  };

  return (
    <div
      style={{ minHeight: '100vh', padding: '2rem 1.5rem', maxWidth: '1000px', margin: '0 auto' }}
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
            Driver Partner Portal
          </h1>
          <p
            style={{
              margin: '0.25rem 0 0 0',
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
            }}
          >
            Manage your onboarding status, documents, and duty availability.
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

      {loading ? (
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading driver profile status...</p>
      ) : data ? (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Availability Control Card */}
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: `2px solid ${
                data.profile.availabilityStatus === 'AVAILABLE' ? '#22c55e' : 'var(--color-border)'
              }`,
              borderRadius: '0.75rem',
              padding: '1.75rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.625rem',
                    borderRadius: '1rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    backgroundColor:
                      data.profile.availabilityStatus === 'AVAILABLE'
                        ? 'rgba(34, 197, 94, 0.15)'
                        : 'rgba(100, 116, 139, 0.15)',
                    color:
                      data.profile.availabilityStatus === 'AVAILABLE'
                        ? '#22c55e'
                        : 'var(--color-text-secondary)',
                    marginBottom: '0.5rem',
                  }}
                >
                  Status: {data.profile.availabilityStatus}
                </span>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 600 }}>
                  Duty Availability
                </h2>
                <p
                  style={{
                    margin: '0.25rem 0 0 0',
                    fontSize: '0.875rem',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {data.profile.availabilityStatus === 'AVAILABLE'
                    ? 'You are online and eligible for instant customer trip assignments.'
                    : 'You are currently offline and will not receive customer trip requests.'}
                </p>
              </div>

              <div>
                {data.profile.availabilityStatus === 'AVAILABLE' ? (
                  <button
                    type="button"
                    disabled={availabilitySaving}
                    onClick={() => handleToggleAvailability('OFFLINE')}
                    style={{
                      padding: '0.75rem 1.5rem',
                      borderRadius: '0.375rem',
                      backgroundColor: 'var(--color-danger)',
                      color: '#ffffff',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {availabilitySaving ? 'Updating...' : 'Go Offline'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={availabilitySaving || !data.evaluation.isEligible}
                    onClick={() => handleToggleAvailability('AVAILABLE')}
                    style={{
                      padding: '0.75rem 1.5rem',
                      borderRadius: '0.375rem',
                      backgroundColor: '#22c55e',
                      color: '#ffffff',
                      fontWeight: 600,
                      border: 'none',
                      cursor: data.evaluation.isEligible ? 'pointer' : 'not-allowed',
                      opacity: data.evaluation.isEligible ? 1 : 0.6,
                    }}
                  >
                    {availabilitySaving ? 'Updating...' : 'Go Available'}
                  </button>
                )}
              </div>
            </div>

            {errorMsg && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.375rem',
                  backgroundColor: 'rgba(220, 38, 38, 0.1)',
                  border: '1px solid var(--color-danger)',
                  color: 'var(--color-danger)',
                  fontSize: '0.875rem',
                }}
              >
                {errorMsg}
              </div>
            )}

            {!data.evaluation.isEligible && (
              <div
                style={{
                  marginTop: '1.25rem',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  backgroundColor: 'rgba(234, 179, 8, 0.1)',
                  border: '1px solid #eab308',
                }}
              >
                <h4
                  style={{
                    margin: '0 0 0.5rem 0',
                    color: '#eab308',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                >
                  Why can&apos;t I go available?
                </h4>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: '1.25rem',
                    fontSize: '0.875rem',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {data.evaluation.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Quick Action Navigation Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            <Link
              href="/driver/profile"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '0.75rem',
                padding: '1.25rem',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <h3
                style={{
                  margin: '0 0 0.25rem 0',
                  fontSize: '1.1rem',
                  color: 'var(--color-primary)',
                }}
              >
                Driver Profile →
              </h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                Update experience, bio, and service area.
              </p>
            </Link>

            <Link
              href="/driver/onboarding"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '0.75rem',
                padding: '1.25rem',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <h3
                style={{
                  margin: '0 0 0.25rem 0',
                  fontSize: '1.1rem',
                  color: 'var(--color-primary)',
                }}
              >
                Onboarding Status →
              </h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                Current step: {data.profile.onboardingStatus}
              </p>
            </Link>

            <Link
              href="/driver/documents"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '0.75rem',
                padding: '1.25rem',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <h3
                style={{
                  margin: '0 0 0.25rem 0',
                  fontSize: '1.1rem',
                  color: 'var(--color-primary)',
                }}
              >
                Document Center →
              </h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                Upload Driving License & Aadhaar Card.
              </p>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

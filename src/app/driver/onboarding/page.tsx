'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OnboardingData {
  profile: {
    id: string;
    onboardingStatus: string;
    verificationStatus: string;
    approvalStatus: string;
    rejectionReason: string | null;
    changesRequestedReason: string | null;
  };
  evaluation: {
    isEligible: boolean;
    reasons: string[];
  };
}

export default function DriverOnboardingPage() {
  const [data, setData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/driver/onboarding');
        if (res.ok && isMounted) {
          const resData = await res.json();
          setData(resData);
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

  const handleSubmitOnboarding = async () => {
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/driver/onboarding/submit', {
        method: 'POST',
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(
          resData.message || resData.error?.message || 'Failed to submit onboarding.',
        );
      }

      setMessage({
        type: 'success',
        text: 'Onboarding application submitted for administrative review!',
      });
      const refreshRes = await fetch('/api/driver/onboarding');
      if (refreshRes.ok) {
        setData(await refreshRes.json());
      }
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error submitting onboarding',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { label: 'Profile Details', statusKey: 'profile' },
    { label: 'Document Uploads', statusKey: 'documents' },
    { label: 'Admin Review', statusKey: 'review' },
    { label: 'Duty Approval', statusKey: 'approval' },
  ];

  return (
    <div
      style={{ minHeight: '100vh', padding: '2rem 1.5rem', maxWidth: '900px', margin: '0 auto' }}
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
            Driver Onboarding Lifecycle
          </h1>
          <p
            style={{
              margin: '0.25rem 0 0 0',
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
            }}
          >
            Track your onboarding verification steps and administrative approval status.
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
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading onboarding status...</p>
      ) : data ? (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Status Alert Banner */}
          {data.profile.changesRequestedReason && (
            <div
              style={{
                padding: '1.25rem',
                borderRadius: '0.75rem',
                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                border: '1px solid #eab308',
              }}
            >
              <h3
                style={{
                  margin: '0 0 0.5rem 0',
                  color: '#eab308',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                }}
              >
                ⚠️ Changes Requested by Administrator
              </h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
                {data.profile.changesRequestedReason}
              </p>
            </div>
          )}

          {data.profile.rejectionReason && (
            <div
              style={{
                padding: '1.25rem',
                borderRadius: '0.75rem',
                backgroundColor: 'rgba(220, 38, 38, 0.1)',
                border: '1px solid var(--color-danger)',
              }}
            >
              <h3
                style={{
                  margin: '0 0 0.5rem 0',
                  color: 'var(--color-danger)',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                }}
              >
                ❌ Application Decision Feedback
              </h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
                {data.profile.rejectionReason}
              </p>
            </div>
          )}

          {/* Stepper Card */}
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.75rem',
              padding: '1.75rem',
            }}
          >
            <h2
              style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: 0, marginBottom: '1.5rem' }}
            >
              Onboarding Progress
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem',
              }}
            >
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    STEP {idx + 1}
                  </span>
                  <h4 style={{ margin: '0.25rem 0 0 0', fontSize: '0.95rem', fontWeight: 600 }}>
                    {step.label}
                  </h4>
                </div>
              ))}
            </div>

            {/* Status Details */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  ONBOARDING STATUS
                </span>
                <p
                  style={{
                    margin: '0.25rem 0 0 0',
                    fontWeight: 600,
                    color: 'var(--color-primary)',
                  }}
                >
                  {data.profile.onboardingStatus}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  DOCUMENT VERIFICATION
                </span>
                <p style={{ margin: '0.25rem 0 0 0', fontWeight: 600, color: '#eab308' }}>
                  {data.profile.verificationStatus}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  ADMIN APPROVAL
                </span>
                <p
                  style={{
                    margin: '0.25rem 0 0 0',
                    fontWeight: 600,
                    color:
                      data.profile.approvalStatus === 'APPROVED'
                        ? '#22c55e'
                        : 'var(--color-text-primary)',
                  }}
                >
                  {data.profile.approvalStatus}
                </p>
              </div>
            </div>

            {/* Submit Action */}
            {(data.profile.onboardingStatus === 'IN_PROGRESS' ||
              data.profile.onboardingStatus === 'CHANGES_REQUESTED') && (
              <div
                style={{
                  borderTop: '1px solid var(--color-border)',
                  paddingTop: '1.25rem',
                  marginTop: '1rem',
                }}
              >
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmitOnboarding}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.375rem',
                    backgroundColor: 'var(--color-primary)',
                    color: '#ffffff',
                    fontWeight: 600,
                    border: 'none',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Submitting...' : 'Submit Application For Review'}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

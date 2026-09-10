'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DriverLayout } from '@/components/driver-layout';
import { PageHeader } from '@/components/ui/page-header';
import { LoadingState } from '@/components/ui/loading-state';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/status-badge';
import { useToast, ToastViewport } from '@/components/ui/toast';
import { CurrentLocationButton } from '@/components/ui/current-location-button';
import type { CapturedLocation } from '@/components/use-geolocation-capture';

interface DriverProfile {
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  bio: string | null;
  drivingExperienceYears: number;
  primaryServiceArea: string | null;
  onboardingStatus: string;
  verificationStatus: string;
  approvalStatus: string;
}

interface DriverDocument {
  id: string;
  documentType: string;
  status: string;
  originalFileName: string;
  rejectionReason: string | null;
}

/** Mirrors the seeded default for driver.onboarding.required_documents (see prisma/seed.ts) —
 * a UI hint only; the server re-validates independently in submitOnboarding and is authoritative. */
const REQUIRED_DOCUMENT_TYPES = ['DRIVING_LICENSE', 'AADHAAR_CARD'] as const;

const ALL_DOCUMENT_TYPES = [
  'DRIVING_LICENSE',
  'AADHAAR_CARD',
  'PROFILE_PHOTO',
  'BACKGROUND_VERIFICATION',
  'POLICE_VERIFICATION',
  'ADDRESS_PROOF',
] as const;

const DOCUMENT_LABELS: Record<string, string> = {
  DRIVING_LICENSE: 'Driving License',
  AADHAAR_CARD: 'Aadhaar Card',
  PROFILE_PHOTO: 'Profile Photo',
  BACKGROUND_VERIFICATION: 'Background Verification',
  POLICE_VERIFICATION: 'Police Verification Certificate',
  ADDRESS_PROOF: 'Address Proof',
};

const DOC_STATUS_TONE: Record<string, StatusBadgeTone> = {
  UPLOADED: 'neutral',
  PENDING_VERIFICATION: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
  EXPIRED: 'danger',
};

function isProfileComplete(p: DriverProfile | null): boolean {
  return Boolean(
    p &&
    p.firstName &&
    p.lastName &&
    p.dateOfBirth &&
    p.primaryServiceArea &&
    p.drivingExperienceYears > 0,
  );
}

export default function DriverOnboardingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [bio, setBio] = useState('');
  const [drivingExperienceYears, setDrivingExperienceYears] = useState(0);
  const [primaryServiceArea, setPrimaryServiceArea] = useState('');

  // DriverProfile has no latitude/longitude columns — primaryServiceArea is
  // a free-text descriptor, and there is no client-facing reverse-geocoding
  // provider (the only one in the codebase is a server-only dev mock), so a
  // successful capture is labeled honestly rather than fabricating a
  // resolved place name; the driver can still edit the text afterward.
  const handleUseCurrentLocation = (_location: CapturedLocation) => {
    setPrimaryServiceArea('Current location selected');
  };

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { toast, showToast, dismissToast } = useToast();

  // Arriving here right after login with onboarding incomplete (e.g. a
  // brand-new Google sign-in that selected Driver) — see
  // src/app/page.tsx's redirect. A one-time notice, not a persistent banner.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('profileIncomplete') === '1') {
      showToast(
        'Your driver profile is not complete. Please complete your information before continuing.',
        'info',
      );
      params.delete('profileIncomplete');
      const cleanUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
      window.history.replaceState(null, '', cleanUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/driver/onboarding');
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setDocuments(data.documents ?? []);
        setFirstName(data.profile.firstName ?? '');
        setLastName(data.profile.lastName ?? '');
        setDateOfBirth(data.profile.dateOfBirth ? data.profile.dateOfBirth.slice(0, 10) : '');
        setGender(data.profile.gender ?? '');
        setBio(data.profile.bio ?? '');
        setDrivingExperienceYears(data.profile.drivingExperienceYears ?? 0);
        setPrimaryServiceArea(data.profile.primaryServiceArea ?? '');
        if (data.profile.onboardingStatus === 'NOT_STARTED' && isProfileComplete(data.profile)) {
          setStep(2);
        } else if (data.profile.onboardingStatus !== 'NOT_STARTED') {
          setStep(3);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileError(null);
    try {
      const res = await fetch('/api/driver/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          dateOfBirth: dateOfBirth || null,
          gender: gender || null,
          bio: bio || null,
          drivingExperienceYears,
          primaryServiceArea,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? 'Failed to save profile details.');
      }
      setProfile(data.profile);
      setStep(2);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to save profile details.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpload = async (documentType: string, file: File) => {
    setUploadingType(documentType);
    setUploadError(null);
    try {
      const uploadUrlRes = await fetch('/api/driver/documents/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType,
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          fileSizeBytes: file.size,
        }),
      });
      const uploadUrlData = await uploadUrlRes.json();
      if (!uploadUrlRes.ok) {
        throw new Error(
          uploadUrlData.message ?? uploadUrlData.error ?? 'Failed to prepare upload.',
        );
      }
      const { uploadUrl, storageKey } = uploadUrlData;

      const putRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!putRes.ok) {
        const putData = await putRes.json().catch(() => ({}));
        throw new Error(putData.error ?? 'File upload failed.');
      }

      const registerRes = await fetch('/api/driver/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType,
          storageKey,
          originalFileName: file.name,
          contentType: file.type || 'application/octet-stream',
          fileSizeBytes: file.size,
        }),
      });
      const registerData = await registerRes.json();
      if (!registerRes.ok) {
        throw new Error(registerData.message ?? 'Failed to register uploaded document.');
      }

      await load();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload document.');
    } finally {
      setUploadingType(null);
    }
  };

  const handleSubmitOnboarding = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/driver/onboarding/submit', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? 'Submission failed. Please review the requirements below.');
      }
      setProfile(data.profile);
      router.push('/driver');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasCurrentDocument = (type: string) =>
    documents.some(
      (d) => d.documentType === type && d.status !== 'REJECTED' && d.status !== 'EXPIRED',
    );
  const missingRequiredDocs = REQUIRED_DOCUMENT_TYPES.filter((t) => !hasCurrentDocument(t));

  if (loading) {
    return (
      <DriverLayout>
        <LoadingState message="Loading your onboarding progress…" />
      </DriverLayout>
    );
  }

  if (
    profile &&
    profile.onboardingStatus !== 'NOT_STARTED' &&
    profile.onboardingStatus !== 'IN_PROGRESS' &&
    profile.onboardingStatus !== 'CHANGES_REQUESTED'
  ) {
    return (
      <DriverLayout>
        <div className="flex flex-col w-full px-6 py-6 gap-6">
          <PageHeader eyebrow="Driver Onboarding" title="Application Submitted" />
          <div className="p-8 rounded-xl bg-[#181c24] border border-[#262a33] text-center space-y-3">
            <span className="material-symbols-outlined text-4xl text-[#68dba9]">task_alt</span>
            <p className="text-sm text-[#dfe2ee]">
              Your application is <StatusBadge label={profile.onboardingStatus} tone="info" /> and
              your documents are <StatusBadge label={profile.verificationStatus} tone="warning" />.
            </p>
            <p className="text-xs text-[#87948b]">
              You&apos;ll be notified once our verification team reviews your submission. Dispatch
              access is granted only after approval.
            </p>
          </div>
        </div>
      </DriverLayout>
    );
  }

  return (
    <DriverLayout>
      <div className="flex flex-col w-full px-6 py-6 gap-6">
        <PageHeader
          eyebrow="Driver Onboarding"
          title="Complete Your Driver Application"
          subtitle="All three steps are required before your application can be submitted for verification."
        />

        <div className="flex items-center gap-2 text-xs font-mono">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full ${step >= s ? 'bg-[#68dba9]' : 'bg-[#262a33]'}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="p-6 rounded-xl bg-[#181c24] border border-[#262a33] space-y-4 max-w-xl">
            <h2 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              1. Personal & Profile Information
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-[#87948b] flex flex-col gap-1">
                First Name
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[#0a0e16] border border-[#262a33] text-sm text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
                />
              </label>
              <label className="text-xs text-[#87948b] flex flex-col gap-1">
                Last Name
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[#0a0e16] border border-[#262a33] text-sm text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
                />
              </label>
              <label className="text-xs text-[#87948b] flex flex-col gap-1">
                Date of Birth
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[#0a0e16] border border-[#262a33] text-sm text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
                />
              </label>
              <label className="text-xs text-[#87948b] flex flex-col gap-1">
                Gender
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[#0a0e16] border border-[#262a33] text-sm text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
                >
                  <option value="">Prefer not to say</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
              <label className="text-xs text-[#87948b] flex flex-col gap-1">
                Driving Experience (years)
                <input
                  type="number"
                  min={0}
                  value={drivingExperienceYears}
                  onChange={(e) => setDrivingExperienceYears(Number(e.target.value))}
                  className="px-3 py-2 rounded-lg bg-[#0a0e16] border border-[#262a33] text-sm text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
                />
              </label>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#87948b] flex flex-col gap-1">
                  Primary Service Area
                  <input
                    value={primaryServiceArea}
                    onChange={(e) => setPrimaryServiceArea(e.target.value)}
                    placeholder="e.g. South Delhi"
                    className="px-3 py-2 rounded-lg bg-[#0a0e16] border border-[#262a33] text-sm text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
                  />
                </label>
                <CurrentLocationButton onLocated={handleUseCurrentLocation} />
              </div>
            </div>
            <label className="text-xs text-[#87948b] flex flex-col gap-1">
              Bio (optional)
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="px-3 py-2 rounded-lg bg-[#0a0e16] border border-[#262a33] text-sm text-[#dfe2ee] h-20 focus:outline-none focus:border-[#68dba9]"
              />
            </label>
            {profileError && <p className="text-xs text-[#ffb4ab]">{profileError}</p>}
            <button
              type="button"
              disabled={savingProfile}
              onClick={() => void handleSaveProfile()}
              className="px-5 py-2 rounded-lg bg-[#68dba9] hover:bg-[#85f8c4] text-[#003825] text-sm font-bold disabled:opacity-50 transition-colors"
            >
              {savingProfile ? 'Saving…' : 'Save & Continue'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="p-6 rounded-xl bg-[#181c24] border border-[#262a33] space-y-4 max-w-xl">
            <h2 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              2. Required Documents
            </h2>
            {uploadError && <p className="text-xs text-[#ffb4ab]">{uploadError}</p>}
            <div className="space-y-3">
              {ALL_DOCUMENT_TYPES.map((type) => {
                const existing = documents.find((d) => d.documentType === type);
                const required = (REQUIRED_DOCUMENT_TYPES as readonly string[]).includes(type);
                return (
                  <div
                    key={type}
                    className="p-3 rounded-lg bg-[#0a0e16] border border-[#262a33] flex items-center justify-between gap-3 flex-wrap"
                  >
                    <div>
                      <span className="text-sm text-[#dfe2ee] font-medium">
                        {DOCUMENT_LABELS[type]}
                        {required && <span className="text-[#ffb4ab]"> *</span>}
                      </span>
                      {existing && (
                        <div className="mt-1">
                          <StatusBadge
                            label={existing.status}
                            tone={DOC_STATUS_TONE[existing.status] ?? 'neutral'}
                          />
                          {existing.rejectionReason && (
                            <p className="text-[10px] text-[#ffb4ab] mt-1">
                              {existing.rejectionReason}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <label className="px-3 py-1.5 rounded-lg bg-[#262a33] hover:bg-[#3d4a42] text-xs font-bold text-[#dfe2ee] cursor-pointer transition-colors">
                      {uploadingType === type ? 'Uploading…' : existing ? 'Replace' : 'Upload'}
                      <input
                        type="file"
                        className="hidden"
                        disabled={uploadingType !== null}
                        accept="image/jpeg,image/png,application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleUpload(type, file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-lg bg-[#262a33] hover:bg-[#3d4a42] text-xs font-bold text-[#dfe2ee] transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                disabled={missingRequiredDocs.length > 0}
                onClick={() => setStep(3)}
                className="px-5 py-2 rounded-lg bg-[#68dba9] hover:bg-[#85f8c4] disabled:opacity-40 text-[#003825] text-sm font-bold transition-colors"
              >
                Continue
              </button>
              {missingRequiredDocs.length > 0 && (
                <span className="text-[10px] text-[#87948b]">
                  Upload all required (*) documents to continue.
                </span>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="p-6 rounded-xl bg-[#181c24] border border-[#262a33] space-y-4 max-w-xl">
            <h2 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
              3. Review & Submit
            </h2>
            <div className="text-xs text-[#bccac0] space-y-1">
              <p>
                {profile?.firstName} {profile?.lastName} • {profile?.drivingExperienceYears} yrs
                experience • {profile?.primaryServiceArea}
              </p>
              <p>{documents.length} document(s) on file</p>
            </div>
            {submitError && <p className="text-xs text-[#ffb4ab]">{submitError}</p>}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded-lg bg-[#262a33] hover:bg-[#3d4a42] text-xs font-bold text-[#dfe2ee] transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleSubmitOnboarding()}
                className="px-5 py-2 rounded-lg bg-[#68dba9] hover:bg-[#85f8c4] disabled:opacity-50 text-[#003825] text-sm font-bold transition-colors"
              >
                {submitting ? 'Submitting…' : 'Submit Application'}
              </button>
            </div>
          </div>
        )}
      </div>
      <ToastViewport toast={toast} onDismiss={dismissToast} />
    </DriverLayout>
  );
}

import { redirect } from 'next/navigation';

/**
 * Was a fully fabricated driver-verification page — hardcoded fake DL/
 * Aadhaar/police-verification data, a fake countdown timer, and eight
 * alert() calls simulating actions that never touched the backend. The
 * real, ownership-checked verification status already exists per-document
 * at /driver/documents (backed by DriverDocument/DriverProfile and the
 * admin verification-queue), so this redirects there instead of
 * maintaining a second, fake verification system — the same pattern
 * already established for /driver/document-vault.
 */
export default function VerificationStatusRedirect() {
  redirect('/driver/documents');
}

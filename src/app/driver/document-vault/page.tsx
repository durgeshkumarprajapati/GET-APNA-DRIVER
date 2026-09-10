import { redirect } from 'next/navigation';

/**
 * Was a fully mocked duplicate of the real, ownership-checked document
 * system at /driver/documents (fabricated document list, no API calls).
 * Redirects to the authoritative implementation instead of maintaining two
 * separate document systems.
 */
export default function DriverDocumentVaultRedirect() {
  redirect('/driver/documents');
}

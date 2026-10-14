'use client';

import { useRef, useState } from 'react';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Button } from '@/components/ui/button';

export interface AvatarUploadFieldProps {
  currentUrl: string | null;
  uploadEndpoint: string;
  displayName?: string | null;
  onUploaded: (url: string) => void;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Real profile-picture upload control — picks a local image file, previews
 * it, and POSTs the raw bytes to the given upload endpoint (see
 * /api/driver/profile/avatar and /api/customer/profile/avatar). Shared
 * between the driver and customer profile pages, which previously had no
 * working upload control at all (driver side) or only a "paste an external
 * URL" text field (customer side).
 */
export function AvatarUploadField({
  currentUrl,
  uploadEndpoint,
  displayName,
  onUploaded,
}: AvatarUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Please choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError('Image must be 5MB or smaller.');
      return;
    }

    setUploading(true);
    try {
      const res = await fetch(uploadEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to upload image.');
      }
      onUploaded(data.profileImageUrl || data.avatarUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload image.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <UserAvatar src={currentUrl} name={displayName} size={64} />
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={handleFileSelected}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          isLoading={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? 'Uploading...' : currentUrl ? 'Change Photo' : 'Upload Photo'}
        </Button>
        <p className="mt-1 text-[11px] text-on-surface-variant">JPEG, PNG, or WebP. Max 5MB.</p>
        {error && <p className="mt-1 text-[11px] text-rose-500 dark:text-rose-400">{error}</p>}
      </div>
    </div>
  );
}

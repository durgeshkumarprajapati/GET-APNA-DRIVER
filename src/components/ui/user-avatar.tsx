'use client';

import { useState } from 'react';
import Image from 'next/image';

export interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
  isAuthenticated?: boolean;
}

const DEFAULT_AVATAR = '/profile.png';

/**
 * Reusable, centralized UserAvatar component.
 * Fallback Policy:
 * - Unauthenticated user → /profile.png
 * - Authenticated user without custom image → /profile.png
 * - Authenticated user with custom image → custom image (or /profile.png on error)
 */
export function UserAvatar({
  src,
  name,
  size = 32,
  className = '',
  isAuthenticated = true,
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);

  const effectiveSrc = !isAuthenticated || !src || imageError ? DEFAULT_AVATAR : src;

  const displayName = name || 'User Profile';

  return (
    <div
      className={`relative inline-block overflow-hidden rounded-full shrink-0 bg-[#262a33] ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={effectiveSrc}
        alt={displayName}
        width={size}
        height={size}
        unoptimized
        onError={() => setImageError(true)}
        className="object-cover w-full h-full rounded-full"
      />
    </div>
  );
}

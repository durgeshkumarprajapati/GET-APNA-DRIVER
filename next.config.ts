import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Hides the Next.js dev-mode indicator badge (the "N" icon shown in a
  // corner during `next dev`). Dev-only UI, has no effect on production
  // builds either way.
  devIndicators: false,
};

export default nextConfig;

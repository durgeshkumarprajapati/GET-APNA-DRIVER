import type { NextConfig } from 'next';

/**
 * Content-Security-Policy is deployed Report-Only for now: it reports
 * violations (visible in the browser console / a configured report-uri)
 * without blocking anything, so it can be verified against real traffic
 * before being flipped to an enforcing `Content-Security-Policy` header.
 * Flipping it without that verification risks silently breaking the
 * Razorpay checkout script, Google Fonts, or Next.js's own hydration —
 * exactly what the project's Phase 17 rules say not to do blind.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com",
  "connect-src 'self' wss: ws: https://api.razorpay.com https://lumberjack.razorpay.com *.trycloudflare.com",
  'frame-src https://api.razorpay.com https://checkout.razorpay.com',
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
].join('; ');

const nextConfig: NextConfig = {
  // Hides the Next.js dev-mode indicator badge (the "N" icon shown in a
  // corner during `next dev`). Dev-only UI, has no effect on production
  // builds either way.
  devIndicators: false,

  // Allows Cloudflare Tunnels and local proxies for Next.js dev server & Server Actions
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '127.0.0.1:3000', '*.trycloudflare.com'],
    },
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Enforced (not report-only): all four are low-risk, standard
          // defaults that no page in this app relies on violating.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Nothing in this app is designed to be embedded in a third-party
          // iframe, so disallowing framing outright is safe.
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // geolocation=(self) is required — customer/driver live location
          // capture is a core feature, not a third-party embed concern.
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(self), camera=(), microphone=(), payment=(self)',
          },
          ...(process.env.NODE_ENV === 'production'
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains',
                },
              ]
            : []),
          { key: 'Content-Security-Policy-Report-Only', value: CONTENT_SECURITY_POLICY },
        ],
      },
    ];
  },
};

export default nextConfig;

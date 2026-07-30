import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['reflect-metadata', 'oracledb', 'typeorm'],
  allowedDevOrigins: ['trinity-paramedic-reviver.ngrok-free.dev'],

  eslint: {
    ignoreDuringBuilds: true,
  },


  // Disable Next.js Dev Indicator overlay badge (circular Next logo button)
  devIndicators: false,

  // Enable large file upload payload sizes (up to 500MB) for official server deployment
  // [SEC-12] Known accepted risk: large body limit is intentional for report file uploads.
  // Mitigated by per-file size validation in /api/reports/files/route.ts (MAX_FILE_SIZE_BYTES = 100MB).
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },

  // Remove X-Powered-By header to avoid leaking server technology
  poweredByHeader: false,

  // Security headers for production deployment
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Existing headers
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },

          // [SEC-11] Strict-Transport-Security: enforce HTTPS for 1 year, including subdomains
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },

          // [SEC-11] Permissions-Policy: restrict access to sensitive browser APIs
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },

          // [SEC-11] Content-Security-Policy: prevent XSS and content injection
          // 'unsafe-inline' on script-src is needed for Next.js inline scripts;
          // 'unsafe-eval' is needed for Next.js dev mode (removed in production ideally).
          // Adjust as needed based on your CDN/analytics usage.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requirement
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob:",
              "connect-src 'self'",
              "frame-ancestors 'self'",
              "form-action 'self'",
              "base-uri 'self'",
              "object-src 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;


import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['reflect-metadata', 'oracledb', 'typeorm'],
  allowedDevOrigins: ['trinity-paramedic-reviver.ngrok-free.dev'],

  // Remove X-Powered-By header to avoid leaking server technology
  poweredByHeader: false,

  // Security headers for production deployment
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

export default nextConfig;

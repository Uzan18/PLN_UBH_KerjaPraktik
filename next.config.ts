import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['reflect-metadata', 'oracledb', 'typeorm'],
};

export default nextConfig;

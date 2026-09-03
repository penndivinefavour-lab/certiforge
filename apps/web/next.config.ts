import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@certiforge/database", "@certiforge/types", "@certiforge/config"],
  outputFileTracingRoot: __dirname,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/lib/db': path.resolve(__dirname, '../../packages/database/src/client.ts'),
      '@/lib/auth': path.resolve(__dirname, '../../packages/database/src/auth.ts'),
      '@/lib/certificates': path.resolve(__dirname, '../../packages/database/src/certificates.ts'),
      '@/lib/generation': path.resolve(__dirname, '../../packages/database/src/generation.ts'),
      '@/lib/organizations': path.resolve(__dirname, '../../packages/database/src/organizations.ts'),
      '@/lib/recipients': path.resolve(__dirname, '../../packages/database/src/recipients.ts'),
    };
    return config;
  },
  experimental: {
    webpackBuildWorker: false,
  },
};

export default nextConfig;

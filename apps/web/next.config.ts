import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@certiforge/database",
    "@certiforge/types",
    "@certiforge/config",
    "@certiforge/certificate-engine",
    "@certiforge/qr",
    "@certiforge/open-studio",
    "certificate-engine",
    "qr",
    "open-studio"
  ],
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
      // Map package imports to actual paths
      '@certiforge/certificate-engine': path.resolve(__dirname, '../../packages/certificate-engine/src/index.ts'),
      '@certiforge/qr': path.resolve(__dirname, '../../packages/qr/src/index.ts'),
      '@certiforge/open-studio': path.resolve(__dirname, '../../packages/open-studio/src/index.ts'),
      'certificate-engine': path.resolve(__dirname, '../../packages/certificate-engine/src/index.ts'),
      'qr': path.resolve(__dirname, '../../packages/qr/src/index.ts'),
      'open-studio': path.resolve(__dirname, '../../packages/open-studio/src/index.ts'),
      // Keep existing aliases
      '@/lib/db': path.resolve(__dirname, './src/lib/db.ts'),
      '@/lib/auth': path.resolve(__dirname, './src/lib/auth.ts'),
    };
    return config;
  },
  experimental: {
    webpackBuildWorker: false,
  },
};

export default nextConfig;

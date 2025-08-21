/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.mjs");

import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  // Only include webpack config for production builds
  ...(process.env.NODE_ENV === 'production' && {
    webpack: (config) => {
      // Suppress webpack warnings about dynamic imports in @supabase/realtime-js
      config.module.exprContextCritical = false;
      return config;
    },
  }),
};

export default withBundleAnalyzer(config);

/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.mjs");

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  webpack: (config) => {
    // Suppress webpack warnings about dynamic imports in @supabase/realtime-js
    config.module.exprContextCritical = false;
    return config;
  },
};

export default config;

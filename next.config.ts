import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

// ---------------------------------------------------------------------------
// Security Headers — applied to every route
// ---------------------------------------------------------------------------
const productionOrigin = process.env.NEXT_PUBLIC_APP_URL ?? "https://tutormate.app";

const securityHeaders = [
  // Prevent the page from being loaded in a frame/iframe (clickjacking)
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // Prevent MIME-type sniffing
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Control referrer information sent with requests
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Disable browser features not used by TutorMate
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
  // Enforce HTTPS for 1 year (enable once TLS is confirmed on production)
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  // Content Security Policy
  // - default-src 'self'  →  everything defaults to same-origin
  // - script-src          →  allows Next.js runtime chunks + inline scripts Next.js injects
  // - style-src           →  allows inline styles that Tailwind injects
  // - img-src             →  allow same-origin, data URIs, and Supabase storage CDN
  // - connect-src         →  allow Supabase API + Upstash + Gemini API + self
  // - frame-ancestors     →  CSP equivalent of X-Frame-Options: DENY
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-inline' + 'unsafe-eval' needed for Next.js App Router dev mode;
      // for production, replace with nonce-based approach.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      `img-src 'self' data: blob: https://*.supabase.co ${productionOrigin}`,
      [
        "connect-src 'self'",
        "https://*.supabase.co",
        "https://*.upstash.io",
        "https://generativelanguage.googleapis.com",
        productionOrigin,
      ].join(" "),
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // -------------------------------------------------------------------------
  // Security headers applied to all routes
  // -------------------------------------------------------------------------
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Source map বন্ধ করলে compile অনেক দ্রুত হয়
      config.devtool = false;

      // Filesystem cache — পরবর্তী restart এ অনেক দ্রুত
      config.cache = {
        type: "filesystem",
      };

      // Parallel compilation
      config.parallelism = 4;
    }

    return config;
  },

  // TypeScript type-check কে background এ পাঠাও (hot reload block করবে না)
  typescript: {
    ignoreBuildErrors: false,
  },

  // React strict mode বন্ধ রাখলে double-render কমবে dev এ
  reactStrictMode: false,

  // Silence Vercel Turbopack build error by explicitly passing an empty turbopack config
  turbopack: {},
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "jahid-hasan-qw",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});

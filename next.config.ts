import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;

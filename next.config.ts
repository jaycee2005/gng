import type { NextConfig } from "next";

// cacheComponents is intentionally off: almost every page here is
// session-gated and reads live DB data, so the standard dynamic model is simpler.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  redirects() {
    return [
      { source: "/tag/50s-style", destination: "/style-by-age", permanent: true },
      { source: "/tag/60s-style", destination: "/style-by-age", permanent: true },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async redirects() {
    return [
      {
        source: '/profile',
        destination: '/settings?tab=user',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard/create',
        permanent: false,
        has: [
          {
            type: 'cookie',
            key: 'sb-access-token',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

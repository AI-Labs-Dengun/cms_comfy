import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', '@supabase/auth-helpers-nextjs']
  },
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
  // Otimizações para melhorar performance
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  // Configurações para resolver problemas de fontes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          }
        ]
      }
    ]
  }
};

export default nextConfig;

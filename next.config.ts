import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  // Sevalla non fa redirect tra domini: www → apex lo fa l'app (308, query compresa)
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.qdp.link' }],
        destination: 'https://qdp.link/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

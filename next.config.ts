import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  env: {
    IS_DEV_MODE: process.env.IS_DEV_MODE === 'true' ? 'true' : 'false',
  },
  async redirects() {
    return [
      { source: '/launches/:path*', destination: '/projects/:path*', permanent: true },
      { source: '/launch/:slug', destination: '/projects/:slug', permanent: true },
      { source: '/trade/:slug', destination: '/projects/:slug', permanent: true },
    ];
  },
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
};

export default nextConfig;

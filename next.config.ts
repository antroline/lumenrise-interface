import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: '/trade/:slug', destination: '/launch/:slug', permanent: true }]
  },
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
}

export default nextConfig

import { configureRuntimeEnv } from 'next-runtime-env/build/configure.js'

configureRuntimeEnv()

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['utils', 'models'],
  async redirects() {
    return [
      {
        source: '/mozbot-lib',
        destination: 'https://unpkg.com/mozbot-js@2.0.21/dist/index.umd.min.js',
        permanent: true,
      },
      {
        source: '/mozbot-lib/v2',
        destination: 'https://unpkg.com/mozbot-js@2.1.3/dist/index.umd.min.js',
        permanent: true,
      },
      {
        source: '/discord',
        destination: 'https://discord.gg/xjyQczWAXV',
        permanent: true,
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/healthz',
        destination: '/api/health',
      },
    ]
  },
}

export default nextConfig

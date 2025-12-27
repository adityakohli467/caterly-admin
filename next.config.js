/** @type {import('next').NextConfig} */

// Fallback is REQUIRED for Docker & CI builds
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'

const nextConfig = {
  reactStrictMode: true,

  // Required for Docker standalone build
  output: 'standalone',

  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', '@tanstack/react-query'],
  },

  // Faster dev navigation
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },

  // Image configuration
  images: {
    domains: ['localhost', 'caterly.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.railway.app',
      },
      {
        protocol: 'https',
        hostname: '**.s3.ap-southeast-2.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'caterly-uploads-unique-id.s3.ap-southeast-2.amazonaws.com',
      },
    ],
  },

  // API proxy (CRITICAL FIX)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/:path*`,
      },
    ]
  },
}

module.exports = nextConfig

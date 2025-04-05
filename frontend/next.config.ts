/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React's strict mode for development
  reactStrictMode: true,
  // Enable experimental features
  output: 'standalone', // Use standalone output for better performance
  experimental: {
    // Termasuk folder node_modules yang dibutuhkan oleh build output
    outputFileTracingRoot: undefined, // penting untuk termasuk semua node_modules
    outputFileTracingExcludes: {},
  },
  // Headers configuration
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ]
  },
  
  // Rewrites configuration for API proxy
  async rewrites() {
    return [
      {
        source: '/api/notification/v1/:path*',
        destination: 'http://getstok-notification:8081/api/v1/:path*' // Nama container notification service
      },
      {
        source: '/api/:path*',
        destination: 'http://getstok_api:8080/api/:path*' // Nama container backend
      }
    ]
  }
}

module.exports = nextConfig
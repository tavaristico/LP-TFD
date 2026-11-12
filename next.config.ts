import type { NextConfig } from 'next'
import { CSP_REPORT_ONLY, PERMISSIONS_POLICY } from './lib/seguranca'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',         value: 'DENY' },
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'Referrer-Policy',          value: 'origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control',  value: 'on' },
          { key: 'Content-Security-Policy-Report-Only', value: CSP_REPORT_ONLY },
          { key: 'Permissions-Policy',      value: PERMISSIONS_POLICY },
        ],
      },
    ]
  },
}

export default nextConfig

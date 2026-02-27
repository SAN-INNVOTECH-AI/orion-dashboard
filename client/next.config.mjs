/** @type {import('next').NextConfig} */
const API_TARGET = process.env.ORION_API_TARGET || 'http://127.0.0.1:3001'

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_TARGET}/:path*`,
      },
    ]
  },
}

export default nextConfig;

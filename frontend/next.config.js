// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  images: {
    domains: [
      'image.tmdb.org',
      'your-cdn.com',
    ],
    formats: ['image/avif', 'image/webp'],
  },

  async rewrites() {
    return [
      {
        source: '/sitemap.xml',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/v1/sitemap`,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

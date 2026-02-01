/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    optimizePackageImports: ['pdfjs-dist'],
  },
  webpack: (config, { isServer }) => {
    // Handle PDF.js worker
    if (!isServer) {
      config.optimization.minimize = true;
    }
    return config;
  },
  headers: async () => {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=0',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

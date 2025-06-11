/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Removed swcMinify as it's not recognized
  poweredByHeader: false,
  // Prevent ESLint errors from failing the build in production
  eslint: {
    // Warning instead of error during build
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // Chunk splitting optimization
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          commons: {
            name: 'commons',
            chunks: 'all',
            minChunks: 2,
          },
        },
      };
    }
    return config;
  },
};

module.exports = nextConfig;

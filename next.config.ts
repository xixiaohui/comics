import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from any domain (for proxied API images)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    // Disable optimization for locally served images
    unoptimized: true,
  },
  // Increase body size limit for image uploads (50MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;

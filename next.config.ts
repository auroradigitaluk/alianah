import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Email-safe paths (no space) so logo loads in donation confirmation etc.
      { source: "/logo-light.png", destination: "/logo%20light.png" },
      { source: "/logo-dark.png", destination: "/logo%20dark.png" },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "sp-ao.shortpixel.ai",
      },
      {
        protocol: "https",
        hostname: "alianah.org",
      },
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

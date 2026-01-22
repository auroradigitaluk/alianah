import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ],
  },
};

export default nextConfig;

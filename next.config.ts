import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Spotify profile pictures
      { protocol: "https", hostname: "i.scdn.co" },
      // Spotify uses this CDN for some profile images too
      { protocol: "https", hostname: "platform-lookaside.fbsbx.com" },
    ],
  },
};

export default nextConfig;

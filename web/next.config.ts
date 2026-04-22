import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["svg-captcha", "@prisma/client", "prisma", "bcryptjs"],
  rewrites: async () => {
    return [
      {
        source: '/tts_api/:path*',
        destination: 'http://127.0.0.1:8808/api/tts/:path*'
      }
    ]
  }
};

export default nextConfig;

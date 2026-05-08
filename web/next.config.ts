import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["svg-captcha", "@prisma/client", "prisma", "bcryptjs"],
  allowedDevOrigins: ["103.214.9.83"],
  rewrites: async () => {
    return [
      {
        source: '/tts_api/:path*',
        destination: 'http://127.0.0.1:8808/api/tts/:path*'
      },
      {
        source: '/api/tts/file/:path*',
        destination: 'http://127.0.0.1:8808/api/tts/file/:path*'
      }
    ]
  }
};

export default nextConfig;

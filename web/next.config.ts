import type { NextConfig } from "next";

const TTS_BACKEND = process.env.TTS_BACKEND_URL || "http://127.0.0.1:8808";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["svg-captcha", "@prisma/client", "prisma", "bcryptjs"],
  rewrites: async () => {
    return [
      {
        source: '/tts_api/:path*',
        destination: `${TTS_BACKEND}/api/tts/:path*`
      }
    ]
  }
};

export default nextConfig;

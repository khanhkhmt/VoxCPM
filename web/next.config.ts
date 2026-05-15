import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["svg-captcha", "@prisma/client", "prisma", "bcryptjs"],
  allowedDevOrigins: ["103.214.9.83"],
  rewrites: async () => {
    const backendBaseUrl = process.env.BACKEND_API_BASE_URL || "http://127.0.0.1:8808";
    return [
      {
        source: '/tts_api/:path*',
        destination: `${backendBaseUrl}/api/tts/:path*`
      },
      {
        source: '/api/tts/file/:path*',
        destination: `${backendBaseUrl}/api/tts/file/:path*`
      }
    ]
  },
  async headers() {
    return [
      {
        source: "/api/v1/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
        ]
      }
    ]
  }
};

export default nextConfig;

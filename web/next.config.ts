import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["svg-captcha", "@prisma/client", "prisma", "bcryptjs"],
  rewrites: async () => {
    return [
      {
        source: '/gradio_api/:path*',
        destination: 'http://127.0.0.1:8808/gradio_api/:path*'
      }
    ]
  }
};

export default nextConfig;

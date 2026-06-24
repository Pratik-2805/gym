import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/uploads/:path*`,
      },
      {
        source: "/webhook",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/webhook`,
      },
    ];
  },
};

export default nextConfig;

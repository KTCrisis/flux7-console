import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    const meshUrl = process.env.MESH_URL ?? "http://localhost:9090";
    const mem7Url = process.env.MEM7_URL ?? "http://localhost:9070";
    return [
      {
        source: "/api/mesh/:path*",
        destination: `${meshUrl}/:path*`,
      },
      {
        source: "/api/mem7/:path*",
        destination: `${mem7Url}/:path*`,
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

// /api/mesh/* and /api/mem7/* are served by route handlers
// (src/app/api/{mesh,mem7}/[...path]/route.ts) so the admin token can be
// injected server-side — a rewrite cannot add headers.
const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;

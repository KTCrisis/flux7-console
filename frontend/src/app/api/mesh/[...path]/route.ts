import { makeUpstreamProxy } from "@/lib/server/upstream-proxy";

// mesh7 control plane. MESH_ADMIN_TOKEN matches the mesh `auth.admin_token`
// (or its MESH_ADMIN_TOKEN env override). Empty = loopback-only mesh, no header.
const proxy = makeUpstreamProxy(
  process.env.MESH_URL ?? "http://localhost:9090",
  process.env.MESH_ADMIN_TOKEN ?? ""
);

export { proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE };

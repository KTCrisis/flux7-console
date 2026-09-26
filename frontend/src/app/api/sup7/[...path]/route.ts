import { makeUpstreamProxy } from "@/lib/server/upstream-proxy";

// sup7 admin API (status, config, decisions, pause/resume). SUP7_ADMIN_TOKEN
// matches `admin.token` in sup7.yaml. Empty = loopback-only sup7, no header.
const proxy = makeUpstreamProxy(
  process.env.SUP7_URL ?? "http://localhost:9096",
  process.env.SUP7_ADMIN_TOKEN ?? ""
);

export { proxy as GET, proxy as POST };

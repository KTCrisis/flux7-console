import { makeUpstreamProxy } from "@/lib/server/upstream-proxy";

// mem7 daemon. MEM7_TOKEN is optional — mem7 runs open on loopback by default.
const proxy = makeUpstreamProxy(
  process.env.MEM7_URL ?? "http://localhost:9070",
  process.env.MEM7_TOKEN ?? ""
);

export { proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE };

import { NextRequest } from "next/server";

// Server-side proxy to an upstream (mesh7 control plane, mem7).
// Injects the Bearer token here — it never reaches the browser.
export function makeUpstreamProxy(baseUrl: string, token: string) {
  return async function proxy(
    req: NextRequest,
    ctx: { params: Promise<{ path: string[] }> }
  ): Promise<Response> {
    const { path } = await ctx.params;
    const url = `${baseUrl}/${path.join("/")}${req.nextUrl.search}`;

    const headers = new Headers();
    const contentType = req.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);
    if (token) headers.set("authorization", `Bearer ${token}`);

    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const res = await fetch(url, {
      method: req.method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
      cache: "no-store",
    });

    return new Response(res.body, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/json",
      },
    });
  };
}

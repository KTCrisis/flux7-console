import { NextResponse } from "next/server";
import { readdir } from "fs/promises";
import { join } from "path";

const POLICY_DIR =
  process.env.POLICY_DIR ?? "/home/fluxart/flux7-mesh/policies";

export async function GET() {
  try {
    const entries = await readdir(POLICY_DIR);
    const files = entries
      .filter((f) => f.endsWith(".yaml"))
      .map((f) => f.replace(/\.yaml$/, ""));
    return NextResponse.json(files);
  } catch {
    return NextResponse.json({ error: "Cannot read policy dir" }, { status: 500 });
  }
}

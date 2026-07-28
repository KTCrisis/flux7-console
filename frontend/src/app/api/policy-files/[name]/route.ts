import { NextRequest, NextResponse } from "next/server";
import { access, readFile, writeFile } from "fs/promises";
import { join, basename } from "path";

const POLICY_DIR =
  process.env.POLICY_DIR ?? "/home/fluxart/flux7-mesh/policies";

function safePath(name: string): string | null {
  const clean = basename(name.replace(/\.yaml$/, ""));
  if (!clean || clean.startsWith(".") || clean.includes("/")) return null;
  return join(POLICY_DIR, `${clean}.yaml`);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const path = safePath(name);
  if (!path) return NextResponse.json({ error: "Invalid name" }, { status: 400 });

  try {
    const content = await readFile(path, "utf-8");
    return new NextResponse(content, {
      headers: { "Content-Type": "text/yaml; charset=utf-8" },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const path = safePath(name);
  if (!path) return NextResponse.json({ error: "Invalid name" }, { status: 400 });

  const body = await req.text();
  if (!body.trim()) {
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }

  // Only overwrite a file that already exists. Creating one here would add a
  // second policy to policy_dir, and two files declaring the same `name:` both
  // get loaded — the editor is for editing, not for spawning policies.
  try {
    await access(path);
  } catch {
    return NextResponse.json(
      { error: "No such policy file — create it in policy_dir first" },
      { status: 404 }
    );
  }

  try {
    await writeFile(path, body, "utf-8");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: `Write failed: ${err}` },
      { status: 500 }
    );
  }
}

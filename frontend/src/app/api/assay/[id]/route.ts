import { NextResponse } from "next/server";
import { readReport } from "../reports";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await readReport(id);
  if (!report) return NextResponse.json({ error: "no such run" }, { status: 404 });
  return NextResponse.json(report);
}

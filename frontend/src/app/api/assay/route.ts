import { NextResponse } from "next/server";
import { listReportFiles, readReport, REPORTS_DIR } from "./reports";

// GET /api/assay: the runs, newest first, without their results.
export async function GET() {
  const ids = (await listReportFiles()).slice(0, 100);
  const runs = [];
  for (const id of ids) {
    const r = (await readReport(id)) as Record<string, unknown> | null;
    if (!r) continue;
    const { results, ...head } = r;
    const agents = new Set(
      (Array.isArray(results) ? results : [])
        .map((x: { agent?: string | null }) => x.agent)
        .filter(Boolean),
    );
    runs.push({ ...head, agents: [...agents] });
  }
  return NextResponse.json({ dir: REPORTS_DIR, runs });
}

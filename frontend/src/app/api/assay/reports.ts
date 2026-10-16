import { readdir, readFile, stat } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

// Where `assay7 run --reports-dir` writes. The console only reads: a verdict
// is assay7's, never recomputed here.
export const REPORTS_DIR =
  process.env.ASSAY_REPORTS_DIR ?? join(homedir(), ".local/state/assay7/reports");

// Run ids are what assay7 mints (20261016T144521Z-598936). Anything else is
// refused before touching the filesystem.
export const RUN_ID = /^[0-9]{8}T[0-9]{6}Z-[0-9a-f]{6}$/;

export async function listReportFiles(): Promise<string[]> {
  const entries = await readdir(REPORTS_DIR).catch(() => [] as string[]);
  const ids = entries.filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
  return ids.filter((id) => RUN_ID.test(id)).sort().reverse();
}

export async function readReport(id: string): Promise<unknown | null> {
  if (!RUN_ID.test(id)) return null;
  const path = join(REPORTS_DIR, `${id}.json`);
  try {
    await stat(path);
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

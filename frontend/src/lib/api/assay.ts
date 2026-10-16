// Reports written by assay7 (schemas/report.schema.json in flux7-assay).

export type AssayStatus = "pass" | "fail" | "xfail" | "xpass" | "skip" | "error";
export type AssayAxis = "security" | "context" | "supply" | "traces" | "guard" | "eval";

export interface AssayResult {
  id: string;
  axis: AssayAxis;
  status: AssayStatus;
  detail: string;
  agent: string | null;
  xfail: string | null;
  evidence: Record<string, unknown>;
}

export interface AssayRunHead {
  report_version: number;
  assay_version: string;
  run_id: string;
  suite: string;
  mode: "live" | "spawn";
  profile: string | null;
  mesh: { url: string; version: string | null };
  started_at: string;
  finished_at: string | null;
  ok: boolean;
  summary: Record<AssayStatus, number>;
  agents: string[];
}

export interface AssayReport extends Omit<AssayRunHead, "agents"> {
  results: AssayResult[];
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`/api/assay${path}`);
  if (!res.ok) throw new Error(`assay ${path}: HTTP ${res.status}`);
  return res.json();
}

export const fetchAssayRuns = () => get<{ dir: string; runs: AssayRunHead[] }>("");
export const fetchAssayRun = (id: string) => get<AssayReport>(`/${id}`);

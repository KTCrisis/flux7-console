const SUP7_BASE = "/api/sup7";

export type ProviderState = "ok" | "failing" | "skipped";

export interface Sup7Provider {
  name: string;
  state: ProviderState;
  consecutive_failures: number;
  skipped_for_s: number;
  detail: string;
}

export interface Sup7Status {
  version: string;
  state: "running" | "paused";
  uptime_s: number;
  mesh: { url: string; reachable: boolean };
  memory: { enabled: boolean };
  evaluator: { mode: "single" | "chain"; providers: Sup7Provider[] };
  decisions: { approved: number; denied: number; escalated: number; last_at: string | null };
}

export interface Sup7Rule {
  name: string;
  condition: string | null;
  action: "approve" | "deny" | "escalate";
  confidence: number;
}

export interface Sup7Config {
  rules: Sup7Rule[];
  evaluator: {
    confidence_threshold: number;
    breaker_failures: number;
    breaker_cooldown_s: number;
    providers: Array<Record<string, string | number | string[]>>;
  };
  poll_interval_s: number;
  project_dirs: string[];
  scope?: { tool_scopes: string[] };
  questions?: Sup7QuestionSet[];
}

export interface Sup7Question {
  name: string;
  type: "noul" | "choice" | "score";
  group: "danger" | "context" | "manipulation";
  role: string;
  threshold: number | null;
  ignore_when: { question: string; option: string; min?: number } | null;
  instructions: string;
  criteria: Record<string, string>;
}

export interface Sup7QuestionSet {
  provider: string;
  error?: string;
  files?: string[];
  sha_all?: string | null;
  packs?: Array<{ name: string; applies_to: string[]; source: string; questions: Sup7Question[] }>;
}

export interface Sup7File {
  id: string;
  kind: "config" | "questions";
  path: string;
  sha: string | null;
}

export interface Sup7WriteResult {
  file: string;
  sha_before: string | null;
  sha_after: string;
  backup: string | null;
  restart_required: string[];
}

export interface BenchSet {
  name: string;
  cases: number;
  labels: Record<string, number>;
}

export interface BenchEstimate {
  set: string;
  cases: number;
  recompute: { available: boolean; from_run: string | null; reason: string; cost_usd: number; seconds: number };
  replay: { tokens: number; cost_usd: number; seconds: number };
}

export interface BenchSummary {
  id: string;
  set: string;
  mode: "recompute" | "replay";
  status: "running" | "done" | "failed";
  started_at: string;
  finished_at?: string;
  error?: string;
  threshold: number;
  project_dirs?: string[];
  jev?: Record<string, unknown>;
  cases?: number;
  danger_approved?: number;
  dangers?: number;
  normal_approved?: number;
  normal?: number;
  deny_ok?: number;
  denies?: number;
  errors?: number;
  to_review?: number;
  matrix?: Record<string, number>;
  latency_ms?: { median: number; p95: number } | null;
  questions?: string[];
  compared_to?: string;
  from_run?: string | null;
  delta?: { danger_approved: number; normal_approved: number };
}

export interface BenchResult {
  trace_id: string;
  agent_id?: string;
  tool: string;
  params: unknown;
  label: "approve" | "escalate" | "deny";
  final: "approve" | "escalate" | "deny" | "error";
  confidence: number | null;
  signals: Record<string, number>;
  reasoning: string | null;
  review: string | null;
}

export interface Sup7Decision {
  timestamp: string;
  approval_id: string;
  agent_id: string;
  tool: string;
  decision: "approved" | "denied" | "escalated";
  rule_matched: string | null;
  reasoning: string;
  confidence: number;
  evaluation_ms: number;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${SUP7_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`sup7 ${path}: HTTP ${res.status}`);
  return res.json();
}

export const fetchSup7Status = () => get<Sup7Status>("/status");
export const fetchSup7Config = () => get<Sup7Config>("/config");
export const fetchSup7Decisions = (limit = 30) =>
  get<{ decisions: Sup7Decision[] }>(`/decisions?limit=${limit}`).then((r) => r.decisions);

async function send<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${SUP7_BASE}${path}`, { cache: "no-store", ...init });
  const body = await res.json().catch(() => ({}));
  // sup7 answers {"error": "..."} with the reason: shown as is in the console
  if (!res.ok) throw new Error(body.error ?? `sup7 ${path}: HTTP ${res.status}`);
  return body as T;
}

export const fetchSup7Files = () => get<{ files: Sup7File[] }>("/files").then((r) => r.files);

export async function fetchSup7File(id: string): Promise<{ text: string; sha: string }> {
  const res = await fetch(`${SUP7_BASE}/files/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
  return { text: await res.text(), sha: res.headers.get("etag") ?? "" };
}

export const saveSup7File = (id: string, text: string, ifMatch: string) =>
  send<Sup7WriteResult>(`/files/${id}`, {
    method: "PUT",
    headers: { "content-type": "text/yaml", "if-match": ifMatch },
    body: text,
  });

export const fetchBenchSets = () => get<{ sets: BenchSet[] }>("/bench/sets").then((r) => r.sets);
export const fetchBenchRuns = () => get<{ runs: BenchSummary[] }>("/bench/runs").then((r) => r.runs);
export const fetchBenchRun = (id: string) => get<BenchSummary & { results: BenchResult[] }>(`/bench/runs/${id}`);
export const fetchBenchEstimate = (set: string) => get<BenchEstimate>(`/bench/estimate?set=${encodeURIComponent(set)}`);
export const fetchBenchProgress = () => get<{ id?: string; done?: number; total?: number; running: boolean }>("/bench/progress");
export const startBenchRun = (set: string, mode: "recompute" | "replay") =>
  send<BenchSummary>("/bench/runs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ set, mode }),
  });

export async function setSup7Paused(paused: boolean): Promise<Sup7Status> {
  const res = await fetch(`${SUP7_BASE}/${paused ? "pause" : "resume"}`, { method: "POST" });
  if (!res.ok) throw new Error(`sup7 ${paused ? "pause" : "resume"}: HTTP ${res.status}`);
  return res.json();
}

/**
 * Split a decision reasoning into who decided and the probabilities, e.g.
 * "[ollama, jev skipped] Jev: approve (approve 0.92 · destructive 0.03)".
 */
export function parseReasoning(reasoning: string): {
  providers: string | null;
  text: string;
  signals: Array<{ name: string; value: number }>;
} {
  let text = reasoning;
  let providers: string | null = null;
  const head = text.match(/^\[([^\]]+)\]\s*/);
  if (head) {
    providers = head[1];
    text = text.slice(head[0].length);
  }
  const signals: Array<{ name: string; value: number }> = [];
  const group = text.match(/\(([^)]*)\)\s*$/);
  if (group) {
    for (const part of group[1].split("·")) {
      const m = part.trim().match(/^([a-z_]+)\s+([0-9.]+)$/i);
      if (m) signals.push({ name: m[1], value: Number(m[2]) });
    }
    if (signals.length) text = text.slice(0, group.index).trim();
  }
  return { providers, text, signals };
}

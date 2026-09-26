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

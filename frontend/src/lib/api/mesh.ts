const MESH_BASE = "/api/mesh";

export interface TraceEntry {
  trace_id: string;
  session_id: string;
  agent_id: string;
  // The human the agent acted for, when its credential carried one
  // (mesh7 auth.jwt.user_claim). Absent on agent-only calls.
  user_id?: string;
  tool: string;
  params: Record<string, unknown>;
  policy: string;
  policy_rule: string;
  status_code: number;
  latency_ms: number;
  error: string;
  approval_id: string;
  approval_status: string;
  approved_by: string;
  approval_ms: number;
  estimated_input_tokens: number;
  estimated_output_tokens: number;
  timestamp: string;
  // Lineage: the temporal grant that let the call through, and the call that
  // motivated that grant (when the grant recorded an origin).
  grant_id?: string;
  parent_trace_id?: string;
  // W3C span of the call, and the caller's span when it sent a traceparent.
  span_id?: string;
  parent_span_id?: string;
  supervisor_reasoning?: string;
  supervisor_confidence?: number;
  // Number of updates appended after the first record (approval outcome…).
  revision?: number;
}

export interface TraceWhy {
  trace_id: string;
  chain_length: number;
  // Oldest first; the requested call is last.
  chain: TraceEntry[];
}

// Hash chain of mesh7's trace file (GET /traces/verify). mesh7 holds the
// key and runs the check; the console only reports it.
export interface ChainStatus {
  persistent: boolean;
  files?: string[];
  hmac: boolean;
  verified_at: string;
  lines: number;
  unchained: number;
  chained: number;
  first_seq?: number;
  last_seq?: number;
  anchor?: string;
  head?: string;
  alg?: string;
  break?: { file: string; line: number; seq?: number; reason: string };
}

export async function fetchTraceVerify(): Promise<ChainStatus> {
  const res = await fetch(`${MESH_BASE}/traces/verify`);
  if (!res.ok) throw new Error(`Chain check unavailable: ${res.status}`);
  return res.json();
}

export async function fetchTraceWhy(id: string, depth = 10): Promise<TraceWhy> {
  const res = await fetch(
    `${MESH_BASE}/traces/${encodeURIComponent(id)}/why?depth=${depth}`
  );
  if (!res.ok) throw new Error(`Failed to fetch trace chain: ${res.status}`);
  return res.json();
}

export interface ApprovalSummary {
  id: string;
  agent_id: string;
  tool: string;
  params: Record<string, unknown>;
  status: string;
  created_at: string;
}

export interface ApprovalDetail extends ApprovalSummary {
  recent_traces: TraceEntry[];
  active_grants: unknown[];
  injection_risk: boolean;
}

export async function fetchTraces(opts?: {
  agent?: string;
  tool?: string;
  limit?: number;
}): Promise<TraceEntry[]> {
  const params = new URLSearchParams();
  if (opts?.agent) params.set("agent", opts.agent);
  if (opts?.tool) params.set("tool", opts.tool);
  if (opts?.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  const res = await fetch(`${MESH_BASE}/traces${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Failed to fetch traces: ${res.status}`);
  return res.json();
}

export async function fetchApprovals(opts?: {
  status?: string;
  tool?: string;
}): Promise<ApprovalSummary[]> {
  const params = new URLSearchParams();
  if (opts?.status) params.set("status", opts.status);
  if (opts?.tool) params.set("tool", opts.tool);
  const qs = params.toString();
  const res = await fetch(`${MESH_BASE}/approvals${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Failed to fetch approvals: ${res.status}`);
  return res.json();
}

export async function fetchApprovalDetail(
  id: string
): Promise<ApprovalDetail> {
  const res = await fetch(`${MESH_BASE}/approvals/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch approval: ${res.status}`);
  return res.json();
}

export async function resolveApproval(
  id: string,
  decision: "approve" | "deny",
  reasoning?: string
): Promise<void> {
  const res = await fetch(`${MESH_BASE}/approvals/${id}/${decision}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reasoning }),
  });
  if (!res.ok) throw new Error(`Failed to ${decision} approval: ${res.status}`);
}

export interface HealthData {
  status: string;
  tools: number;
  traces: {
    total: number;
    allowed: number;
    denied: number;
    errors: number;
    human_approval: number;
  };
  version?: string;
}

export async function fetchHealth(): Promise<HealthData> {
  const res = await fetch(`${MESH_BASE}/health`);
  if (!res.ok) throw new Error(`Failed to fetch health: ${res.status}`);
  return res.json();
}

// ───────────────────────────────────────────────────────────
// Sessions
// ───────────────────────────────────────────────────────────

export interface SessionSummary {
  session_id: string;
  agent_id: string;
  event_count: number;
  first_seen: string;
  last_seen: string;
  tools: string[];
}

export async function fetchSessions(opts?: {
  limit?: number;
}): Promise<SessionSummary[]> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  const res = await fetch(`${MESH_BASE}/sessions${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Failed to fetch sessions: ${res.status}`);
  return res.json();
}

export async function fetchSessionEvents(
  id: string,
  opts?: { limit?: number }
): Promise<TraceEntry[]> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  const res = await fetch(
    `${MESH_BASE}/sessions/${encodeURIComponent(id)}${qs ? `?${qs}` : ""}`
  );
  if (!res.ok) throw new Error(`Failed to fetch session events: ${res.status}`);
  return res.json();
}

// ───────────────────────────────────────────────────────────
// OTLP / OpenTelemetry types
// ───────────────────────────────────────────────────────────

export interface OtlpKV {
  key: string;
  value: { stringValue?: string; intValue?: string };
}

export interface OtlpSpan {
  traceId: string;
  spanId: string;
  name: string;
  kind: number;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: OtlpKV[];
  status: { code: number; message?: string };
}

export interface OtlpScopeSpan {
  scope: { name: string; version?: string };
  spans: OtlpSpan[];
}

export interface OtlpResourceSpan {
  resource: { attributes: OtlpKV[] };
  scopeSpans: OtlpScopeSpan[];
}

export interface OtlpExport {
  resourceSpans: OtlpResourceSpan[];
}

export async function fetchOtelTraces(opts?: {
  agent?: string;
  tool?: string;
  limit?: number;
}): Promise<OtlpExport> {
  const params = new URLSearchParams();
  if (opts?.agent) params.set("agent", opts.agent);
  if (opts?.tool) params.set("tool", opts.tool);
  if (opts?.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  const res = await fetch(`${MESH_BASE}/otel-traces${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Failed to fetch OTEL traces: ${res.status}`);
  return res.json();
}

// Helper: flatten an OTLP export into a list of spans with attributes as a map.
export interface FlatSpan {
  traceId: string;
  spanId: string;
  name: string;
  startNs: bigint;
  endNs: bigint;
  durationMs: number;
  statusCode: number;
  statusMessage: string;
  attrs: Record<string, string>;
}

export function flattenOtlp(exp: OtlpExport): FlatSpan[] {
  const out: FlatSpan[] = [];
  for (const rs of exp.resourceSpans ?? []) {
    for (const ss of rs.scopeSpans ?? []) {
      for (const s of ss.spans ?? []) {
        const attrs: Record<string, string> = {};
        for (const kv of s.attributes ?? []) {
          attrs[kv.key] = kv.value.stringValue ?? kv.value.intValue ?? "";
        }
        const startNs = BigInt(s.startTimeUnixNano || "0");
        const endNs = BigInt(s.endTimeUnixNano || "0");
        const durationMs = Number((endNs - startNs) / BigInt(1000000));
        out.push({
          traceId: s.traceId,
          spanId: s.spanId,
          name: s.name,
          startNs,
          endNs,
          durationMs,
          statusCode: s.status?.code ?? 0,
          statusMessage: s.status?.message ?? "",
          attrs,
        });
      }
    }
  }
  return out;
}

// ───────────────────────────────────────────────────────────
// Policies
// ───────────────────────────────────────────────────────────

export interface PolicyRule {
  tools: string[];
  action: string;
}

export interface Policy {
  name: string;
  agent: string;
  rules: PolicyRule[];
  /**
   * File this policy was read from, relative to policy_dir. Absent when the
   * policy is declared inline in config.yaml — there is then no file to edit.
   *
   * A policy's name and its file name are different things: claude.local.yaml
   * declares `name: claude`. Deriving one from the other opened an empty editor
   * and, on save, would have written a second file with a duplicate name.
   */
  source_file?: string;
}

export async function fetchPolicies(): Promise<Policy[]> {
  const res = await fetch(`${MESH_BASE}/policies`);
  if (!res.ok) throw new Error(`Failed to fetch policies: ${res.status}`);
  return res.json();
}

export async function fetchPolicyFiles(): Promise<string[]> {
  const res = await fetch("/api/policy-files");
  if (!res.ok) throw new Error(`Failed to list policy files: ${res.status}`);
  return res.json();
}

export async function fetchPolicyYaml(name: string): Promise<string> {
  const res = await fetch(`/api/policy-files/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`Failed to read policy: ${res.status}`);
  return res.text();
}

export async function savePolicyYaml(
  name: string,
  content: string
): Promise<void> {
  const res = await fetch(`/api/policy-files/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "Content-Type": "text/yaml" },
    body: content,
  });
  if (!res.ok) throw new Error(`Failed to save policy: ${res.status}`);
}

// ───────────────────────────────────────────────────────────
// Tool Catalog
// ───────────────────────────────────────────────────────────

export interface ToolParam {
  name: string;
  in: string;
  type: string;
  required: boolean;
}

export interface CliMeta {
  bin: string;
  command: string;
  timeout: number;
  strict: boolean;
  default_action: string;
  is_catch_all: boolean;
}

export interface ToolEntry {
  name: string;
  description: string;
  method: string;
  path: string;
  base_url: string;
  params: ToolParam[];
  source: string;
  mcp_server?: string;
  cli_meta?: CliMeta;
  /** The mesh's reading of the tool, from declared metadata only. */
  classification?: ToolClassification;
}

/**
 * Where the meaning of a call lives (see flux7-mesh registry/classify.go).
 * named: the name states the effect. generic: an interpreter (SQL, shell,
 * code, CLI dispatcher), the argument decides.
 */
export interface ToolClassification {
  family: "named" | "generic";
  access: "read" | "write" | "unknown";
  reasons: string[];
}

export interface ConditionalRule {
  action: string;
  rule: string;
  field: string;
  operator: string;
}

/** One row of GET /tools/decisions: the policy's answer before any call. */
export interface ToolDecision {
  name: string;
  source: string;
  mcp_server?: string;
  classification: ToolClassification;
  action: string;
  rule: string;
  conditional?: ConditionalRule[];
  /** Policy file of the deciding rule; absent for inline policies and the default deny. */
  source_file?: string;
  rule_index: number;
  /** Pin status of an upstream MCP tool when mesh7 runs with pin_tools; absent otherwise. */
  pin?: PinStatus;
}

export type PinStatus = "pinned" | "new" | "changed";

/** An upstream tool held back by pin_tools: added or changed since it was accepted. */
export interface PendingPin {
  tool: string;
  server: string;
  status: PinStatus;
  pinned_description?: string;
  current_description: string;
  pinned_at?: string;
  fingerprint: string;
}

/** GET /tools/pins. Returns null when mesh7 runs without pin_tools (501). */
export async function fetchPendingPins(): Promise<PendingPin[] | null> {
  const res = await fetch(`${MESH_BASE}/tools/pins`);
  if (res.status === 501) return null;
  if (!res.ok) throw new Error(`Failed to fetch pins: ${res.status}`);
  return res.json();
}

/** POST /tools/pins/accept: pin the current version of these tools, or of every pending tool of a server. */
export async function acceptPins(target: { tools?: string[]; server?: string }): Promise<void> {
  const res = await fetch(`${MESH_BASE}/tools/pins/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...target, by: "console" }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to accept: ${res.status}`);
  }
}

export type ToolAction = "allow" | "deny" | "human_approval" | "inherit";

/**
 * Set one tool's action for one agent. mesh7 edits the agent's policy file,
 * re-validates, applies at once and records the edit in the trace. "inherit"
 * removes a rule set from the console; hand-written rules are refused (409).
 */
export async function setToolAction(agent: string, tool: string, action: ToolAction): Promise<void> {
  const res = await fetch(
    `${MESH_BASE}/policies/${encodeURIComponent(agent)}/tools/${encodeURIComponent(tool)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, by: "console" }),
    }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to set action: ${res.status}`);
  }
}

export async function fetchToolDecisions(agent: string): Promise<ToolDecision[]> {
  const res = await fetch(`${MESH_BASE}/tools/decisions?agent=${encodeURIComponent(agent)}`);
  if (!res.ok) throw new Error(`Failed to fetch tool decisions: ${res.status}`);
  return res.json();
}

export async function fetchTools(): Promise<ToolEntry[]> {
  const res = await fetch(`${MESH_BASE}/tools`);
  if (!res.ok) throw new Error(`Failed to fetch tools: ${res.status}`);
  return res.json();
}

export interface McpServer {
  name: string;
  transport: string;
  status: string;
  tools: string[];
}

export async function fetchMcpServers(): Promise<McpServer[]> {
  const res = await fetch(`${MESH_BASE}/mcp-servers`);
  if (!res.ok) throw new Error(`Failed to fetch MCP servers: ${res.status}`);
  return res.json();
}

// ───────────────────────────────────────────────────────────
// Grants
// ───────────────────────────────────────────────────────────

export interface Grant {
  id: string;
  agent: string;
  tools: string;
  expires_at: string;
  remaining: string;
  granted_by: string;
}

export async function fetchGrants(): Promise<Grant[]> {
  const res = await fetch(`${MESH_BASE}/grants`);
  if (!res.ok) throw new Error(`Failed to fetch grants: ${res.status}`);
  return res.json();
}

export async function createGrant(opts: {
  agent: string;
  tools: string;
  duration: string;
}): Promise<Grant> {
  const res = await fetch(`${MESH_BASE}/grants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  if (!res.ok) throw new Error(`Failed to create grant: ${res.status}`);
  return res.json();
}

export async function revokeGrant(id: string): Promise<void> {
  const res = await fetch(`${MESH_BASE}/grants/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to revoke grant: ${res.status}`);
}

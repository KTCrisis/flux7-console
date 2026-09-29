"use client";

import { Pause, Play, PlugZap, ArrowRight, User } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { DecisionBadge } from "@/components/ui/decision-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSup7Status, useSup7Config, useSup7Decisions, useSetSup7Paused } from "@/lib/hooks/use-sup7";
import { parseReasoning, type Sup7Provider } from "@/lib/api/sup7";

const providerTone: Record<Sup7Provider["state"], string> = {
  ok: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  failing: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  skipped: "border-red-500/30 bg-red-500/10 text-red-400",
};

function uptime(s: number): string {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}

// Signals where a high value is reassuring; every other one (a harm, an
// injection) is red when high.
const SAFE_SIGNALS = new Set(["in_scope", "project", "approve", "mission_fit"]);

// Probability chip: the bar shows the value, the label names the signal.
export function Signal({ name, value }: { name: string; value: number }) {
  const risky = !SAFE_SIGNALS.has(name);
  const tone = risky
    ? value >= 0.5 ? "bg-red-400/70" : "bg-red-400/25"
    : value >= 0.5 ? "bg-emerald-400/70" : "bg-emerald-400/25";
  return (
    <span className="inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">
      <span className="text-muted-foreground">{name}</span>
      <span className="relative h-1.5 w-8 overflow-hidden rounded-sm bg-secondary/60">
        <span className={cn("absolute inset-y-0 left-0", tone)} style={{ width: `${Math.round(value * 100)}%` }} />
      </span>
      <span className="tabular-nums">{value.toFixed(2)}</span>
    </span>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{children}</span>;
}

export function Sup7ControlPanel() {
  const status = useSup7Status();
  const config = useSup7Config();
  const decisions = useSup7Decisions(30);
  const setPaused = useSetSup7Paused();

  if (status.isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-48" />
      </div>
    );
  }

  if (status.isError || !status.data) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 flex gap-3">
        <PlugZap className="h-5 w-5 text-muted-foreground/60 shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="text-sm font-medium text-foreground">sup7 admin API not reachable</p>
          <p>
            Enable it in the supervisor config (<span className="font-mono">admin.enabled: true</span>, default port
            9096) and point the console at it with <span className="font-mono">SUP7_URL</span> and{" "}
            <span className="font-mono">SUP7_ADMIN_TOKEN</span>. The statistics below still come from mesh7 traces.
          </p>
        </div>
      </div>
    );
  }

  const s = status.data;
  const paused = s.state === "paused";

  return (
    <div className="space-y-4">
      {/* State and control */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className={cn("h-0.5", paused ? "bg-amber-500" : "bg-emerald-500")} />
        <div className="p-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div>
            <Label>sup7</Label>
            <div className="mt-1 flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", paused ? "bg-amber-400" : "bg-emerald-400 animate-pulse")} />
              <span className={cn("text-sm font-semibold", paused ? "text-amber-400" : "text-emerald-400")}>
                {paused ? "Paused" : "Running"}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">v{s.version} · up {uptime(s.uptime_s)}</span>
            </div>
          </div>
          <div>
            <Label>mesh7</Label>
            <p className={cn("mt-1 text-xs font-mono", s.mesh.reachable ? "text-foreground" : "text-red-400")}>
              {s.mesh.reachable ? "connected" : "unreachable"}
            </p>
          </div>
          <div>
            <Label>Since start</Label>
            <p className="mt-1 text-xs font-mono tabular-nums">
              <span className="text-emerald-400">{s.decisions.approved}</span> approved ·{" "}
              <span className="text-red-400">{s.decisions.denied}</span> denied ·{" "}
              <span className="text-amber-400">{s.decisions.escalated}</span> escalated
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {paused && (
              <span className="text-[11px] text-amber-400/80 max-w-56">
                Every pending approval goes to a human until resumed.
              </span>
            )}
            <button
              type="button"
              onClick={() => setPaused.mutate(!paused)}
              disabled={setPaused.isPending}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50",
                paused
                  ? "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                  : "border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
              )}
            >
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              {paused ? "Resume" : "Pause"}
            </button>
          </div>
        </div>
        {setPaused.isError && (
          <p className="px-4 pb-3 text-[11px] text-red-400">Could not change the state: {String(setPaused.error)}</p>
        )}
      </div>

      {/* Evaluator chain */}
      <div className="rounded-lg border border-border bg-card p-4">
        <Label>Evaluators · {s.evaluator.mode === "chain" ? "tried in order, next on failure" : "single provider"}</Label>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="rounded border border-border bg-secondary/50 px-2.5 py-1.5">rules</span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          {s.evaluator.providers.map((p) => (
            <span key={p.name} className="contents">
              <span className={cn("rounded border px-2.5 py-1.5", providerTone[p.state])}>
                {p.name}
                <span className="ml-1.5 opacity-60">{p.detail}</span>
                {p.state === "skipped" && <span className="ml-1.5">· skipped {p.skipped_for_s}s</span>}
                {p.state === "failing" && <span className="ml-1.5">· {p.consecutive_failures} failed</span>}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
          ))}
          <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 px-2.5 py-1.5">
            <User className="h-3 w-3" /> human
          </span>
        </div>
      </div>

      {/* Rules and thresholds */}
      {config.data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-lg border border-border bg-card overflow-x-auto">
            <div className="px-4 pt-3"><Label>Rules · first match wins</Label></div>
            <table className="mt-2 w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-left text-[11px] text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-2 font-medium">Rule</th>
                  <th className="px-4 py-2 font-medium">Condition</th>
                  <th className="px-4 py-2 font-medium">Action</th>
                  <th className="px-4 py-2 font-medium text-right">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {config.data.rules.map((r) => (
                  <tr key={r.name} className="border-b border-border/30">
                    <td className="px-4 py-2 font-mono">{r.name}</td>
                    <td className="px-4 py-2 font-mono text-muted-foreground">{r.condition ?? "anything else → evaluators"}</td>
                    <td className="px-4 py-2 font-mono">{r.action}</td>
                    <td className="px-4 py-2 font-mono tabular-nums text-right">{r.confidence.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 space-y-2 text-xs">
            <Label>Thresholds</Label>
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 font-mono">
              {config.data.evaluator.providers.map((p) => (
                <span key={`t-${p.provider}`} className="contents">
                  <dt className="text-muted-foreground">{String(p.provider)} decides above</dt>
                  <dd className="tabular-nums text-right">
                    {String(p.confidence_threshold ?? config.data!.evaluator.confidence_threshold)}
                  </dd>
                </span>
              ))}
              <dt className="text-muted-foreground">breaker</dt>
              <dd className="tabular-nums text-right">
                {config.data.evaluator.breaker_failures} fails · {config.data.evaluator.breaker_cooldown_s}s
              </dd>
              {config.data.evaluator.providers
                .filter((p) => p.provider === "jev")
                .map((p) => (
                  <span key="jev" className="contents">
                    <dt className="text-muted-foreground">jev destructive ≤</dt>
                    <dd className="tabular-nums text-right">{String(p.destructive_max)}</dd>
                    <dt className="text-muted-foreground">jev in scope ≥</dt>
                    <dd className="tabular-nums text-right">{String(p.in_scope_min)}</dd>
                    <dt className="text-muted-foreground">jev deny ≥ … if in scope &lt;</dt>
                    <dd className="tabular-nums text-right">{String(p.deny_min)} · {String(p.deny_in_scope_max ?? "")}</dd>
                    <dt className="text-muted-foreground">jev project ≥</dt>
                    <dd className="tabular-nums text-right">{String(p.project_min ?? "")}</dd>
                  </span>
                ))}
            </dl>
          </div>
        </div>
      )}

      {/* Recent decisions */}
      <div>
        <Label>Recent sup7 decisions · with the evaluator&apos;s signals</Label>
        <div className="mt-2 rounded-lg border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30 text-left text-[11px] text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-2.5 font-medium">Time</th>
                <th className="px-4 py-2.5 font-medium">Agent · tool</th>
                <th className="px-4 py-2.5 font-medium">Decision</th>
                <th className="px-4 py-2.5 font-medium">Decided by</th>
                <th className="px-4 py-2.5 font-medium">Why</th>
              </tr>
            </thead>
            <tbody>
              {(decisions.data ?? []).map((d) => {
                const r = parseReasoning(d.reasoning);
                return (
                  <tr key={`${d.approval_id}-${d.timestamp}`} className="border-b border-border/30 align-top">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{timeAgo(d.timestamp)}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-sm">{d.agent_id}</span>
                      <span className="block font-mono text-[11px] text-muted-foreground">{d.tool}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <DecisionBadge status={d.decision} />
                      <span className="block mt-1 font-mono text-[10px] text-muted-foreground tabular-nums">
                        {d.confidence.toFixed(2)} · {d.evaluation_ms} ms
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
                      {d.rule_matched ? `rule ${d.rule_matched}` : r.providers ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {r.signals.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {r.signals.map((sig) => <Signal key={sig.name} {...sig} />)}
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground">{r.text}</span>
                    </td>
                  </tr>
                );
              })}
              {decisions.data && decisions.data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-xs text-muted-foreground">
                    No decision since sup7 started{s.decisions.last_at ? "" : " — pending approvals will appear here once evaluated"}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

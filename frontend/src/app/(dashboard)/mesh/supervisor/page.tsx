"use client";

import { useMemo } from "react";
import { useTraces } from "@/lib/hooks/use-mesh";
import { cn, timeAgo } from "@/lib/utils";
import { DecisionBadge } from "@/components/ui/decision-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Bot, TrendingUp, TrendingDown, Minus } from "lucide-react";

function isL1Resolution(approvedBy: string): boolean {
  if (!approvedBy) return false;
  const v = approvedBy.toLowerCase();
  return v.startsWith("supervisor:") || v.startsWith("auto:") || v.startsWith("bot:");
}

export default function SupervisorPage() {
  const { data: traces, isLoading } = useTraces({ limit: 500 });

  const stats = useMemo(() => {
    if (!traces) return null;

    const l1Traces = traces.filter((t) => isL1Resolution(t.approved_by));
    const l2Traces = traces.filter(
      (t) => t.approval_status && t.approval_status !== "pending" && t.approved_by && !isL1Resolution(t.approved_by)
    );
    const escalated = traces.filter(
      (t) => t.approval_status === "pending" || (t.approval_status && !t.approved_by)
    );

    const l1Approved = l1Traces.filter((t) => t.approval_status === "approved").length;
    const l1Denied = l1Traces.filter((t) => t.approval_status === "denied").length;

    const supervisors = Array.from(
      new Set(l1Traces.map((t) => t.approved_by).filter(Boolean))
    ).sort();

    const agentsCovered = Array.from(
      new Set(l1Traces.map((t) => t.agent_id).filter(Boolean))
    ).sort();

    const toolsHandled: Record<string, number> = {};
    for (const t of l1Traces) {
      toolsHandled[t.tool] = (toolsHandled[t.tool] || 0) + 1;
    }

    const lastActivity = l1Traces.length > 0 ? l1Traces[0].timestamp : null;

    const totalApprovalTraces = l1Traces.length + l2Traces.length + escalated.length;
    const automationRate = totalApprovalTraces > 0
      ? Math.round((l1Traces.length / totalApprovalTraces) * 100)
      : 0;

    return {
      active: l1Traces.length > 0,
      total: l1Traces.length,
      approved: l1Approved,
      denied: l1Denied,
      escalatedCount: escalated.length,
      l2Count: l2Traces.length,
      supervisors,
      agentsCovered,
      toolsHandled,
      lastActivity,
      automationRate,
    };
  }, [traces]);

  const topTools = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.toolsHandled)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);
  }, [stats]);

  const recentL1 = useMemo(() => {
    if (!traces) return [];
    return traces.filter((t) => isL1Resolution(t.approved_by)).slice(0, 20);
  }, [traces]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
          <ShieldCheck className="h-4 w-4 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Supervisor</h1>
          <p className="text-xs text-muted-foreground">
            L1 automated evaluation — derived from mesh7 traces
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </div>
      ) : !stats?.active ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center space-y-3">
          <Bot className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">No L1 supervisor detected</p>
            <p className="text-xs text-muted-foreground/70 mt-1 max-w-md mx-auto">
              All approval requests go directly to L2 (human). Connect a supervisor agent
              that resolves approvals via the mesh API to enable automated evaluation.
            </p>
          </div>
          <div className="pt-2">
            <div className="inline-flex items-center gap-4 rounded-md border border-border bg-background px-4 py-2.5 text-xs text-muted-foreground font-mono">
              <span className="text-foreground">L0</span>
              <span className="text-border">→</span>
              <span className="text-foreground">mesh7 policy</span>
              <span className="text-border">→</span>
              <span className="text-amber-400">L1 ?</span>
              <span className="text-border">→</span>
              <span className="text-foreground">L2 human</span>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="h-0.5 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
              <div className="p-4">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)] animate-pulse" />
                  <span className="text-sm font-semibold text-emerald-400">Active</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {stats.lastActivity ? timeAgo(stats.lastActivity) : "—"}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="h-0.5 bg-primary shadow-[0_0_8px_rgba(34,211,238,0.4)]" />
              <div className="p-4">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Automation rate</span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xl font-mono font-semibold tabular-nums">{stats.automationRate}%</span>
                  {stats.automationRate >= 50 ? (
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                  ) : stats.automationRate > 0 ? (
                    <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {stats.total} L1 · {stats.l2Count} L2
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="h-0.5 bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
              <div className="p-4">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Auto-resolved</span>
                <div className="mt-1 flex items-center gap-3">
                  <span className="text-xl font-mono font-semibold tabular-nums text-emerald-400">{stats.approved}</span>
                  <span className="text-[10px] text-muted-foreground">approved</span>
                  <span className="text-xl font-mono font-semibold tabular-nums text-red-400">{stats.denied}</span>
                  <span className="text-[10px] text-muted-foreground">denied</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="h-0.5 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
              <div className="p-4">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Escalated to L2</span>
                <span className="mt-1 block text-xl font-mono font-semibold tabular-nums">{stats.escalatedCount}</span>
                <p className="text-[10px] text-muted-foreground mt-1">
                  requires human review
                </p>
              </div>
            </div>
          </div>

          {/* Flow diagram */}
          <div className="rounded-lg border border-border bg-card p-4">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Evaluation flow</span>
            <div className="mt-3 flex items-center gap-3 text-xs font-mono overflow-x-auto">
              <span className="shrink-0 rounded border border-border bg-secondary/50 px-2.5 py-1.5">L0 mesh7 policy</span>
              <span className="text-muted-foreground shrink-0">→</span>
              <span className="shrink-0 rounded border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 px-2.5 py-1.5">
                L1 supervisor
                <span className="ml-1.5 text-[10px] text-indigo-400/60">
                  ({stats.supervisors.map((s) => s.split(":")[1] || s).join(", ")})
                </span>
              </span>
              <span className="text-muted-foreground shrink-0">→</span>
              <span className="shrink-0 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 px-2.5 py-1.5">L2 human console</span>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Supervised agents */}
            <div className="rounded-lg border border-border bg-card p-4">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Supervised agents</span>
              <div className="mt-2 space-y-1">
                {stats.agentsCovered.map((a) => (
                  <div key={a} className="flex items-center gap-2 text-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                    <span className="font-mono text-xs">{a}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top tools auto-handled */}
            <div className="lg:col-span-2 rounded-lg border border-border bg-card p-4">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Top auto-resolved tools</span>
              <div className="mt-2 space-y-1.5">
                {topTools.map(([tool, count]) => {
                  const max = topTools[0]?.[1] ?? 1;
                  const pct = Math.round((count / max) * 100);
                  return (
                    <div key={tool} className="flex items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground w-48 truncate shrink-0">{tool}</span>
                      <div className="flex-1 h-4 rounded-sm bg-secondary/30 overflow-hidden">
                        <div
                          className="h-full rounded-sm bg-indigo-500/30"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground w-8 text-right shrink-0">{count}</span>
                    </div>
                  );
                })}
                {topTools.length === 0 && (
                  <p className="text-xs text-muted-foreground">No tools auto-resolved yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent L1 decisions */}
          {recentL1.length > 0 && (
            <div>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Recent L1 decisions
              </span>
              <div className="mt-2 rounded-lg border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Agent</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Tool</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Decision</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Resolved by</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentL1.map((t) => (
                      <tr key={t.trace_id} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-2.5 text-sm">{t.agent_id}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{t.tool}</td>
                        <td className="px-4 py-2.5"><DecisionBadge status={t.approval_status} /></td>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{t.approved_by}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{timeAgo(t.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

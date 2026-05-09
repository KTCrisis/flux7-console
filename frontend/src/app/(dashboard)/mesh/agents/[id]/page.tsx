"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTraces, useGrants, useApprovals, useTools, useMcpServers } from "@/lib/hooks/use-mesh";
import { cn, timeAgo } from "@/lib/utils";
import { DecisionBadge } from "@/components/ui/decision-badge";
import { PolicyBadge } from "@/components/ui/policy-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Cpu,
  ArrowLeft,
  Activity,
  Shield,
  Key,
  Wrench,
  Server,
  ArrowRight,
} from "lucide-react";

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const agentId = decodeURIComponent(id);

  const { data: allTraces, isLoading } = useTraces({ limit: 1000 });
  const { data: allGrants } = useGrants();
  const { data: allApprovals } = useApprovals();
  const { data: allTools } = useTools();
  const { data: mcpServers } = useMcpServers();

  const traces = useMemo(
    () => (allTraces ?? []).filter((t) => t.agent_id === agentId),
    [allTraces, agentId]
  );

  const grants = useMemo(
    () => (allGrants ?? []).filter((g) => g.agent === agentId),
    [allGrants, agentId]
  );

  const approvals = useMemo(
    () => (allApprovals ?? []).filter((a) => a.agent_id === agentId),
    [allApprovals, agentId]
  );

  const stats = useMemo(() => {
    const toolUsage: Record<string, { count: number; allowed: number; denied: number; approval: number }> = {};
    const policyHits: Record<string, number> = {};

    for (const t of traces) {
      if (!toolUsage[t.tool]) {
        toolUsage[t.tool] = { count: 0, allowed: 0, denied: 0, approval: 0 };
      }
      toolUsage[t.tool].count++;
      if (t.policy === "deny") toolUsage[t.tool].denied++;
      else if (t.policy === "approval") toolUsage[t.tool].approval++;
      else toolUsage[t.tool].allowed++;

      if (t.policy_rule) {
        policyHits[t.policy_rule] = (policyHits[t.policy_rule] || 0) + 1;
      }
    }

    const denied = traces.filter((t) => t.policy === "deny").length;
    const allowed = traces.filter((t) => t.policy !== "deny").length;
    const pending = approvals.filter((a) => a.status === "pending").length;
    const avgLatency = traces.length
      ? Math.round(traces.reduce((s, t) => s + t.latency_ms, 0) / traces.length)
      : 0;

    return { toolUsage, policyHits, denied, allowed, pending, avgLatency };
  }, [traces, approvals]);

  const depGraph = useMemo(() => {
    const toolNames = Object.keys(stats.toolUsage);
    const toolToServer = new Map<string, string>();

    for (const tool of allTools ?? []) {
      if (toolNames.includes(tool.name) && tool.mcp_server) {
        toolToServer.set(tool.name, tool.mcp_server);
      }
    }

    const servers = new Map<string, string[]>();
    for (const [tool, server] of toolToServer) {
      if (!servers.has(server)) servers.set(server, []);
      servers.get(server)!.push(tool);
    }

    const directTools = toolNames.filter((t) => !toolToServer.has(t));

    return { servers, directTools, toolToServer };
  }, [stats.toolUsage, allTools]);

  const sortedTools = useMemo(
    () => Object.entries(stats.toolUsage).sort(([, a], [, b]) => b.count - a.count),
    [stats.toolUsage]
  );

  const sortedPolicies = useMemo(
    () => Object.entries(stats.policyHits).sort(([, a], [, b]) => b - a),
    [stats.policyHits]
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/mesh/agents"
          className="h-8 w-8 rounded-lg bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
          <Cpu className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight font-mono">{agentId}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {traces.length} traces · {Object.keys(stats.toolUsage).length} tools · last seen {traces[0] ? timeAgo(traces[0].timestamp) : "—"}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Traces", value: traces.length, color: "bg-primary" },
          { label: "Allowed", value: stats.allowed, color: "bg-emerald-500" },
          { label: "Denied", value: stats.denied, color: "bg-red-500" },
          { label: "Pending", value: stats.pending, color: "bg-amber-500" },
          { label: "Avg latency", value: `${stats.avgLatency}ms`, color: "bg-primary" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-lg border border-border bg-card overflow-hidden">
            <div className={cn("h-0.5", kpi.color)} />
            <div className="p-3">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
              <span className="mt-1 block text-lg font-mono font-semibold tabular-nums">{kpi.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Dependency graph */}
      <div className="rounded-lg border border-border bg-card p-5">
        <span className="text-[10px] font-mono font-semibold text-muted-foreground/60 uppercase tracking-[0.2em]">
          Dependencies
        </span>
        <div className="mt-4 flex items-start gap-4 overflow-x-auto pb-2">
          {/* Agent node */}
          <div className="shrink-0 flex flex-col items-center gap-2">
            <div className="rounded-lg border-2 border-primary/40 bg-primary/10 px-4 py-3 text-center">
              <Cpu className="h-4 w-4 text-primary mx-auto mb-1" />
              <span className="text-xs font-mono font-semibold text-primary">{agentId}</span>
            </div>
          </div>

          {/* Arrow */}
          <div className="shrink-0 flex items-center self-center text-muted-foreground/40">
            <div className="w-8 h-px bg-border" />
            <ArrowRight className="h-3 w-3 -ml-1" />
          </div>

          {/* Tools column */}
          <div className="shrink-0 space-y-1.5">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-mono">Tools</span>
            {sortedTools.map(([tool, usage]) => (
              <div
                key={tool}
                className={cn(
                  "rounded border px-3 py-1.5 text-xs font-mono flex items-center gap-2",
                  usage.denied > 0
                    ? "border-red-500/30 bg-red-500/5 text-red-300"
                    : "border-border bg-secondary/30 text-foreground"
                )}
              >
                <Wrench className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                <span className="truncate max-w-48">{tool}</span>
                <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">{usage.count}x</span>
              </div>
            ))}
          </div>

          {/* Arrow */}
          {(depGraph.servers.size > 0) && (
            <>
              <div className="shrink-0 flex items-center self-center text-muted-foreground/40">
                <div className="w-8 h-px bg-border" />
                <ArrowRight className="h-3 w-3 -ml-1" />
              </div>

              {/* MCP Servers column */}
              <div className="shrink-0 space-y-1.5">
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-mono">Upstream</span>
                {Array.from(depGraph.servers.entries()).map(([server, tools]) => {
                  const serverInfo = (mcpServers ?? []).find((s) => s.name === server);
                  return (
                    <div key={server} className="rounded border border-border bg-secondary/20 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Server className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                        <span className="text-xs font-mono font-medium">{server}</span>
                        {serverInfo && (
                          <span className={cn(
                            "h-1.5 w-1.5 rounded-full ml-auto shrink-0",
                            serverInfo.status === "ready" ? "bg-emerald-400" : "bg-red-400"
                          )} />
                        )}
                      </div>
                      <div className="mt-1 text-[10px] text-muted-foreground font-mono">
                        {tools.length} tool{tools.length !== 1 ? "s" : ""}
                        {serverInfo && <> · {serverInfo.transport}</>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Two-column: grants + policies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active grants */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Key className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[10px] font-mono font-semibold text-muted-foreground/60 uppercase tracking-[0.2em]">
              Active grants
            </span>
          </div>
          {grants.length > 0 ? (
            <div className="space-y-2">
              {grants.map((g) => (
                <div key={g.id} className="flex items-center justify-between rounded border border-border bg-secondary/20 px-3 py-2 text-xs">
                  <span className="font-mono">{g.tools}</span>
                  <span className="text-muted-foreground font-mono tabular-nums">{g.remaining}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No active grants</p>
          )}
        </div>

        {/* Policy rules hit */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[10px] font-mono font-semibold text-muted-foreground/60 uppercase tracking-[0.2em]">
              Policy rules applied
            </span>
          </div>
          {sortedPolicies.length > 0 ? (
            <div className="space-y-2">
              {sortedPolicies.map(([rule, count]) => (
                <div key={rule} className="flex items-center justify-between rounded border border-border bg-secondary/20 px-3 py-2 text-xs">
                  <span className="font-mono text-muted-foreground">{rule}</span>
                  <span className="font-mono tabular-nums">{count}x</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No policy rules recorded</p>
          )}
        </div>
      </div>

      {/* Recent traces */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-mono font-semibold text-muted-foreground/60 uppercase tracking-[0.2em]">
            Recent traces
          </span>
        </div>
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Tool</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Policy</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Approval</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Latency</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody>
              {traces.slice(0, 20).map((t) => (
                <tr key={t.trace_id} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs">{t.tool}</td>
                  <td className="px-4 py-2.5"><PolicyBadge policy={t.policy} /></td>
                  <td className="px-4 py-2.5">
                    {t.approval_status ? (
                      <DecisionBadge status={t.approval_status} />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground tabular-nums">{t.latency_ms}ms</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{timeAgo(t.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

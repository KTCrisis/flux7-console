"use client";

import { useState } from "react";
import {
  useTraces,
  useApprovals,
  useApprovalDetail,
  useResolveApproval,
  useHealth,
} from "@/lib/hooks/use-mesh";
import {
  Activity,
  Shield,
  Clock,
  Cpu,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  LayoutDashboard,
} from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { PolicyBadge } from "@/components/ui/policy-badge";
import { KPI } from "@/components/ui/stat";
import { KPISkeleton, TableSkeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function MeshOverview() {
  const { data: rawTraces, error, isLoading } = useTraces({ limit: 100 });
  const { data: rawApprovals } = useApprovals();
  const traces = rawTraces ?? [];
  const approvals = rawApprovals ?? [];
  const { data: health } = useHealth();

  if (error) {
    return (
      <div className="mt-20 flex flex-col items-center gap-3 text-center">
        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <p className="text-sm font-medium">flux7-mesh unreachable</p>
          <p className="text-xs text-muted-foreground mt-1">
            Make sure mesh7 is running on localhost:9090
          </p>
        </div>
      </div>
    );
  }

  const uniqueAgents = [...new Set(traces.map((t) => t.agent_id))];
  const denied = traces.filter((t) => t.policy === "deny").length;
  const pending = approvals.filter((a) => a.status === "pending");
  const avgLatency = traces.length
    ? Math.round(traces.reduce((s, t) => s + t.latency_ms, 0) / traces.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
          <LayoutDashboard className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Overview</h1>
          {health && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {health.tools} tools registered &middot; {health.traces.total} total calls
              {health.version && (
                <> &middot; flux7-mesh <span className="font-mono">{health.version}</span></>
              )}
            </p>
          )}
        </div>
      </div>

      {/* KPI row */}
      {isLoading ? (
        <KPISkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPI icon={Cpu} label="Agents" value={uniqueAgents.length} />
          <KPI icon={Activity} label="Traces" value={traces.length} />
          <Link href="/mesh/approvals">
            <KPI
              icon={Shield}
              label="Pending"
              value={pending.length}
              accent={pending.length > 0 ? "primary" : undefined}
            />
          </Link>
          <KPI icon={Clock} label="Avg latency" value={`${avgLatency}ms`} />
        </div>
      )}

      {/* Pending approvals — inline action zone */}
      {pending.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.03] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-amber-500/10">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">
                Pending approvals ({pending.length})
              </span>
            </div>
            <Link
              href="/mesh/approvals"
              className="flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-amber-500/10">
            {pending.slice(0, 5).map((a) => (
              <PendingApprovalRow key={a.id} approval={a} />
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <TableSkeleton rows={3} cols={2} />
          </div>
          <div className="lg:col-span-3">
            <TableSkeleton rows={5} cols={3} />
          </div>
        </div>
      ) : (
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Agents — 2 cols */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Agents
            </span>
          </div>
          <div className="p-2 space-y-0.5">
            {uniqueAgents.length === 0 && (
              <p className="px-2 py-4 text-xs text-muted-foreground text-center">
                No activity yet
              </p>
            )}
            {uniqueAgents.map((agent) => {
              const at = traces.filter((t) => t.agent_id === agent);
              const d = at.filter((t) => t.policy === "deny").length;
              const last = at[0];
              return (
                <div
                  key={agent}
                  className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-secondary/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-sm font-medium">{agent}</span>
                    <span className="text-xs text-muted-foreground font-mono">{at.length}</span>
                    {d > 0 && (
                      <span className="text-[10px] text-red-400 bg-red-400/10 rounded px-1.5 py-0.5 font-mono">
                        {d} denied
                      </span>
                    )}
                  </div>
                  {last && (
                    <span className="text-[11px] text-muted-foreground">
                      {timeAgo(last.timestamp)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent — 3 cols */}
        <div className="lg:col-span-3 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Recent activity
            </span>
            <Link
              href="/mesh/traces"
              className="flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-border/50">
            {traces.slice(0, 10).map((t) => (
              <div
                key={t.trace_id}
                className="flex items-center justify-between px-4 py-2.5 text-xs"
              >
                <div className="flex items-center gap-3">
                  <PolicyBadge policy={t.policy} />
                  <span className="text-muted-foreground w-20 truncate">{t.agent_id}</span>
                  <span className="font-mono text-[11px]">{t.tool}</span>
                </div>
                <span className="text-muted-foreground">{timeAgo(t.timestamp)}</span>
              </div>
            ))}
            {traces.length === 0 && (
              <p className="px-4 py-6 text-xs text-muted-foreground text-center">
                No traces yet
              </p>
            )}
          </div>
        </div>
      </div>

      )}

      {/* Denials */}
      {denied > 0 && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5">
          <div className="px-4 py-3 border-b border-red-500/10">
            <span className="text-xs font-medium text-red-400 uppercase tracking-wider">
              Denials ({denied})
            </span>
          </div>
          <div className="divide-y divide-red-500/10">
            {traces
              .filter((t) => t.policy === "deny")
              .slice(0, 5)
              .map((t) => (
                <div
                  key={t.trace_id}
                  className="flex items-center justify-between px-4 py-2.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t.agent_id}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-mono text-[11px]">{t.tool}</span>
                    {t.policy_rule && (
                      <span className="text-[10px] text-red-400/70 font-mono bg-red-500/5 rounded px-1.5 py-0.5">
                        {t.policy_rule}
                      </span>
                    )}
                  </div>
                  <span className="text-muted-foreground shrink-0 ml-3">{timeAgo(t.timestamp)}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PendingApprovalRow({
  approval,
}: {
  approval: { id: string; agent_id: string; tool: string; created_at: string };
}) {
  const [expanded, setExpanded] = useState(false);
  const [reasoning, setReasoning] = useState("");
  const { data: detail } = useApprovalDetail(expanded ? approval.id : null);
  const resolve = useResolveApproval();

  function handleResolve(decision: "approve" | "deny") {
    resolve.mutate(
      { id: approval.id, decision, reasoning: reasoning || undefined },
      { onSuccess: () => setReasoning("") }
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <span className="text-sm font-medium">{approval.agent_id}</span>
          <span className="font-mono text-xs text-muted-foreground">{approval.tool}</span>
          <span className="text-[11px] text-muted-foreground">{timeAgo(approval.created_at)}</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Reason"
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            className="w-36 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={() => handleResolve("approve")}
            disabled={resolve.isPending}
            className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            <CheckCircle className="h-3 w-3" />
            Approve
          </button>
          <button
            onClick={() => handleResolve("deny")}
            disabled={resolve.isPending}
            className="flex items-center gap-1 rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
          >
            <XCircle className="h-3 w-3" />
            Deny
          </button>
        </div>
      </div>
      {expanded && detail && (
        <div className="px-4 pb-3 pt-0">
          <div className="rounded-md bg-background border border-border p-3">
            {detail.injection_risk && (
              <div className="flex items-center gap-2 mb-2 text-xs text-red-400">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                Potential prompt injection detected
              </div>
            )}
            <pre className="text-[11px] font-mono leading-relaxed overflow-x-auto max-h-32 text-muted-foreground">
              {JSON.stringify(detail.params, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

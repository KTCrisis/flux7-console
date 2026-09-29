"use client";

import { useMemo, useState } from "react";
import {
  useApprovals,
  useApprovalDetail,
  useResolveApproval,
  useTraces,
} from "@/lib/hooks/use-mesh";
import { resolverOf, type Resolver } from "@/lib/api/mesh";
import { Precedents } from "@/components/approvals/precedents";
import { ApprovalSettingsPanel } from "@/components/approvals/settings";
import { cn, timeAgo } from "@/lib/utils";
import { PolicyMini } from "@/components/ui/policy-badge";
import { DecisionBadge } from "@/components/ui/decision-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Shield,
} from "lucide-react";

export default function ApprovalsPage() {
  const { data: rawApprovals, isLoading } = useApprovals();
  const approvals = rawApprovals ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reasoningMap, setReasoningMap] = useState<Record<string, string>>({});

  const { data: detail } = useApprovalDetail(selectedId);
  const resolve = useResolveApproval();

  const pending = approvals.filter((a) => a.status === "pending");
  const [who, setWho] = useState<Resolver | "all">("all");
  // mem7 precedents approve without opening an approval: they only show in traces
  const { data: traces } = useTraces({ limit: 500 });

  const history = useMemo(() => {
    const rows: HistoryRow[] = approvals
      .filter((a) => a.status !== "pending")
      .map((a) => ({
        id: a.id, agent: a.agent_id, tool: a.tool, status: a.status,
        at: a.resolved_at ?? a.created_at, resolver: resolverOf(a.resolved_by, a.status),
        by: a.resolved_by ?? "", why: a.reasoning ?? "",
        ms: a.resolved_at ? new Date(a.resolved_at).getTime() - new Date(a.created_at).getTime() : null,
      }));
    for (const t of traces ?? []) {
      if (t.policy_rule !== "supervisor:mem7") continue;
      rows.push({ id: t.trace_id, agent: t.agent_id, tool: t.tool, status: "approved", at: t.timestamp,
        resolver: "mem7", by: "supervisor:mem7", why: "precedents in mem7", ms: null });
    }
    return rows.sort((a, b) => b.at.localeCompare(a.at));
  }, [approvals, traces]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { sup7: 0, human: 0, mem7: 0, timeout: 0 };
    for (const r of history) c[r.resolver] = (c[r.resolver] ?? 0) + 1;
    return c;
  }, [history]);
  const resolved = history.filter((r) => who === "all" || r.resolver === who);
  const total = history.length || 1;

  function handleResolve(id: string, decision: "approve" | "deny") {
    resolve.mutate(
      { id, decision, reasoning: reasoningMap[id] || undefined },
      {
        onSuccess: () => {
          setSelectedId(null);
          setReasoningMap((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
          <Shield className="h-4 w-4 text-amber-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Approvals</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pending.length} pending &middot; {resolved.length} resolved
          </p>
        </div>
      </div>

      {/* Pending */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-border px-4 py-4 space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      ) : pending.length > 0 ? (
        <div className="space-y-2">
          {pending.map((a) => {
            const isOpen = selectedId === a.id;
            return (
              <div
                key={a.id}
                className="rounded-lg border border-amber-500/20 bg-amber-500/[0.03] overflow-hidden"
              >
                <button
                  onClick={() => setSelectedId(isOpen ? null : a.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-amber-500/[0.05] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{a.agent_id}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {a.tool}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-muted-foreground">
                      {timeAgo(a.created_at)}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {isOpen && detail && (
                  <div className="border-t border-amber-500/10 px-4 py-4 space-y-4">
                    {detail.injection_risk && (
                      <div className="flex items-center gap-2 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        Potential prompt injection detected in parameters
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          Parameters
                        </span>
                        <pre className="mt-1 rounded-md bg-background border border-border p-3 text-[11px] leading-relaxed overflow-x-auto max-h-48">
                          {JSON.stringify(detail.params, null, 2)}
                        </pre>
                      </div>

                      {detail.recent_traces.length > 0 && (
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Recent from {a.agent_id}
                          </span>
                          <div className="mt-1 rounded-md border border-border divide-y divide-border/50">
                            {detail.recent_traces.slice(0, 6).map((t) => (
                              <div
                                key={t.trace_id}
                                className="flex justify-between px-3 py-1.5 text-[11px]"
                              >
                                <span className="font-mono text-muted-foreground truncate">
                                  {t.tool}
                                </span>
                                <PolicyMini policy={t.policy} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Reasoning (optional)"
                        value={reasoningMap[a.id] ?? ""}
                        onChange={(e) => setReasoningMap((prev) => ({ ...prev, [a.id]: e.target.value }))}
                        className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        onClick={() => handleResolve(a.id, "approve")}
                        disabled={resolve.isPending}
                        className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleResolve(a.id, "deny")}
                        disabled={resolve.isPending}
                        className="flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Deny
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-border py-12 text-center">
          <CheckCircle className="mx-auto h-8 w-8 text-emerald-400/60 mb-2" />
          <p className="text-sm text-muted-foreground">All clear</p>
        </div>
      )}

      {/* History: who settled what */}
      {history.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {RESOLVERS.map((r) => (
              <button
                key={r.key}
                onClick={() => setWho(who === r.key ? "all" : r.key)}
                className={cn(
                  "rounded-lg border bg-card p-3 text-left transition-colors",
                  who === r.key ? "border-primary/40" : "border-border hover:border-border/80"
                )}
              >
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{r.label}</span>
                <div className={cn("text-xl font-semibold tabular-nums mt-0.5", r.tone)}>
                  {counts[r.key] ?? 0}
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    {Math.round(((counts[r.key] ?? 0) / total) * 100)} %
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">{r.hint}</div>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">History</span>
            {who !== "all" && (
              <button onClick={() => setWho("all")} className="text-[11px] text-primary">
                {RESOLVERS.find((r) => r.key === who)?.label} only · show all
              </button>
            )}
          </div>
          <div className="rounded-lg border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  {["Agent", "Tool", "Decision", "Decided by", "Why", "Time"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resolved.slice(0, 200).map((a) => {
                  const r = RESOLVERS.find((x) => x.key === a.resolver);
                  return (
                    <tr key={a.id} className="border-b border-border/30 align-top">
                      <td className="px-4 py-2.5 text-sm">{a.agent}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{a.tool}</td>
                      <td className="px-4 py-2.5"><DecisionBadge status={a.status} /></td>
                      <td className="px-4 py-2.5">
                        <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-mono", r?.chip)}>{r?.label}</span>
                        <span className="block mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {a.by}{a.ms != null ? ` · ${a.ms < 1000 ? `${a.ms} ms` : `${Math.round(a.ms / 1000)} s`}` : ""}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-md">
                        <span className="line-clamp-2" title={a.why}>{a.why}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{timeAgo(a.at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Precedents />
      <ApprovalSettingsPanel />
    </div>
  );
}

interface HistoryRow {
  id: string;
  agent: string;
  tool: string;
  status: string;
  at: string;
  resolver: Resolver;
  by: string;
  why: string;
  ms: number | null;
}

const RESOLVERS: Array<{ key: Exclude<Resolver, "pending">; label: string; hint: string; tone: string; chip: string }> = [
  { key: "sup7", label: "sup7", hint: "rules or Jev, automatic", tone: "text-sky-400",
    chip: "border-sky-500/30 bg-sky-500/10 text-sky-400" },
  { key: "human", label: "human", hint: "console, CLI or HTTP", tone: "text-amber-400",
    chip: "border-amber-500/30 bg-amber-500/10 text-amber-400" },
  { key: "mem7", label: "mem7 precedents", hint: "past approvals, reads only", tone: "text-violet-400",
    chip: "border-violet-500/30 bg-violet-500/10 text-violet-400" },
  { key: "timeout", label: "expired", hint: "nobody decided in time", tone: "text-muted-foreground",
    chip: "border-border bg-secondary/30 text-muted-foreground" },
];

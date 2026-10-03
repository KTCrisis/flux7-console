"use client";

import { Fragment, useEffect, useState } from "react";
import { TraceTabs } from "@/components/mesh/trace-tabs";
import { useTraces } from "@/lib/hooks/use-mesh";
import { formatDuration, timeAgo } from "@/lib/utils";
import { PolicyBadge } from "@/components/ui/policy-badge";
import { StatusCode } from "@/components/ui/status-badge";
import { Field } from "@/components/ui/field";
import { WhyChain } from "@/components/mesh/why-chain";
import { IntegrityBadge } from "@/components/mesh/integrity-badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import { TimeRangeToggle, filterByTimeRange, type TimeRangeMs } from "@/components/ui/time-range";
import { Activity } from "lucide-react";
import Link from "next/link";

export default function TracesPage() {
  const [filterAgent, setFilterAgent] = useState("");
  const [filterTool, setFilterTool] = useState("");
  const [filterPolicy, setFilterPolicy] = useState("");
  const [filterSession, setFilterSession] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRangeMs>(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  // ?trace=<id>: arriving from a memory in mem7, show the call that wrote it.
  // Read after mount rather than with useSearchParams, which would need a
  // Suspense boundary for the static build.
  const [filterTrace, setFilterTrace] = useState("");
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("trace");
    if (t) setFilterTrace(t);
  }, []);

  const { data: rawTraces, isLoading } = useTraces({ limit: filterTrace ? 1000 : 200 });
  const traces = rawTraces ?? [];
  const timeFiltered = filterByTimeRange(traces, (t) => t.timestamp, timeRange);

  const uniqueAgents = [...new Set(timeFiltered.map((t) => t.agent_id))];
  const uniquePolicies = [...new Set(timeFiltered.map((t) => t.policy))];
  const uniqueSessions = [...new Set(timeFiltered.map((t) => t.session_id).filter(Boolean))];

  const filtered = timeFiltered.filter((t) => {
    if (filterTrace && t.trace_id !== filterTrace) return false;
    if (filterAgent && t.agent_id !== filterAgent) return false;
    if (filterTool && !t.tool.toLowerCase().includes(filterTool.toLowerCase()))
      return false;
    if (filterPolicy && t.policy !== filterPolicy) return false;
    if (filterSession && t.session_id !== filterSession) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
          <Activity className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Traces</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {filtered.length} of {traces.length} entries
          </p>
        </div>
        <div className="ml-auto">
          <IntegrityBadge />
        </div>
      </div>

      {filterTrace && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-foreground">trace {filterTrace}</span>
          <button
            onClick={() => {
              setFilterTrace("");
              window.history.replaceState(null, "", window.location.pathname);
            }}
            className="hover:text-foreground"
          >
            clear
          </button>
          {!isLoading && filtered.length === 0 && (
            <span>not among the last 1000 calls the mesh keeps in memory</span>
          )}
        </div>
      )}

      <TraceTabs />

      <div className="flex flex-wrap items-center gap-2">
        <TimeRangeToggle value={timeRange} onChange={setTimeRange} />
        <select
          value={filterAgent}
          onChange={(e) => setFilterAgent(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All agents</option>
          {uniqueAgents.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Filter tool..."
          value={filterTool}
          onChange={(e) => setFilterTool(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-44"
        />
        <select
          value={filterPolicy}
          onChange={(e) => setFilterPolicy(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All policies</option>
          {uniquePolicies.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {uniqueSessions.length > 0 && (
          <select
            value={filterSession}
            onChange={(e) => setFilterSession(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All sessions</option>
            {uniqueSessions.map((s) => (
              <option key={s} value={s}>
                {s.slice(0, 12)}
              </option>
            ))}
          </select>
        )}
        {(filterAgent || filterTool || filterPolicy || filterSession) && (
          <button
            onClick={() => {
              setFilterAgent("");
              setFilterTool("");
              setFilterPolicy("");
              setFilterSession("");
            }}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : (
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Agent
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Session
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Tool
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Policy
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Latency
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Tokens
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Time
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => {
              // A propagated traceparent can share one trace ID across calls: the
              // span (or the position) keeps rows and their expansion distinct.
              const rowKey = `${t.trace_id}-${t.span_id ?? i}`;
              return (
              <Fragment key={rowKey}>
                <tr
                  className="border-b border-border/30 hover:bg-secondary/20 cursor-pointer transition-colors"
                  onClick={() =>
                    setExpanded(expanded === rowKey ? null : rowKey)
                  }
                >
                  <td className="px-4 py-2.5 text-sm font-medium">
                    {t.agent_id}
                    {t.user_id && (
                      <span className="block text-[11px] font-normal text-muted-foreground">for {t.user_id}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px]">
                    {t.session_id ? (
                      <Link
                        href={`/mesh/sessions/${t.session_id}`}
                        className="text-primary hover:underline"
                      >
                        {t.session_id.slice(0, 12)}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                    {t.tool}
                  </td>
                  <td className="px-4 py-2.5">
                    <PolicyBadge policy={t.policy} />
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusCode code={t.status_code} error={t.error} />
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                    {formatDuration(t.latency_ms)}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                    {t.estimated_input_tokens + t.estimated_output_tokens > 0
                      ? `${t.estimated_input_tokens} / ${t.estimated_output_tokens}`
                      : "-"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {timeAgo(t.timestamp)}
                  </td>
                </tr>
                {expanded === rowKey && (
                  <tr className="border-b border-border/30">
                    <td colSpan={8} className="px-4 py-4 bg-secondary/10">
                      <div className="grid grid-cols-2 gap-4 text-xs max-w-3xl">
                        <div className="space-y-2">
                          <Field label="Trace ID" value={t.trace_id} mono />
                          {t.span_id && (
                            <Field
                              label="Span"
                              value={t.parent_span_id ? `${t.span_id} ← ${t.parent_span_id} (caller)` : t.span_id}
                              mono
                            />
                          )}
                          {t.session_id && (
                            <Field label="Session ID" value={t.session_id} mono />
                          )}
                          <Field label="Policy rule" value={t.policy_rule} />
                          {t.approval_id && (
                            <>
                              <Field
                                label="Approval"
                                value={`${t.approval_status}${t.approved_by ? ` by ${t.approved_by}` : ""}${t.approval_ms > 0 ? ` (${formatDuration(t.approval_ms)})` : ""}`}
                              />
                            </>
                          )}
                          {t.supervisor_reasoning && (
                            <Field label="Supervisor reasoning" value={t.supervisor_reasoning} />
                          )}
                          {t.error && <Field label="Error" value={t.error} error />}
                        </div>
                        <div>
                          <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
                            Parameters
                          </span>
                          <pre className="mt-1 rounded-md bg-background border border-border p-3 overflow-x-auto text-[11px] leading-relaxed max-h-48">
                            {JSON.stringify(t.params, null, 2)}
                          </pre>
                        </div>
                        <WhyChain trace={t} />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  No traces found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

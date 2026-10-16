"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FlaskConical, CheckCircle2, XCircle, CircleDashed } from "lucide-react";
import { useAssayRun, useAssayRuns } from "@/lib/hooks/use-assay";
import type { AssayAxis, AssayResult, AssayStatus } from "@/lib/api/assay";
import { TableSkeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/utils";

// Reports written by assay7. The page shows verdicts and their evidence; it
// never judges. A cell of the matrix is the worst status of its results.

const AXES: AssayAxis[] = ["security", "context", "supply", "traces", "guard", "eval"];

// Worst first: what a cell shows when its results disagree.
const SEVERITY: AssayStatus[] = ["error", "fail", "xpass", "xfail", "skip", "pass"];

const STATUS_STYLE: Record<AssayStatus, string> = {
  pass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  fail: "bg-red-500/10 text-red-400 border-red-500/20",
  xpass: "bg-red-500/10 text-red-400 border-red-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
  xfail: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  skip: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const STATUS_LABEL: Record<AssayStatus, string> = {
  pass: "pass", fail: "fail", xpass: "gap closed", error: "error", xfail: "known gap", skip: "skip",
};

// Results that belong to no agent (identity probes, pins, traces) share a row.
const GLOBAL = "(mesh)";

function StatusBadge({ status }: { status: AssayStatus }) {
  return (
    <span
      className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-medium font-mono uppercase tracking-wider leading-none whitespace-nowrap ${STATUS_STYLE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function worst(rs: AssayResult[]): AssayStatus | null {
  if (rs.length === 0) return null;
  return SEVERITY.find((s) => rs.some((r) => r.status === s)) ?? null;
}

export default function AssayPage() {
  const { data, isLoading } = useAssayRuns();
  const runs = data?.runs ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<{ agent: string; axis: AssayAxis } | null>(null);
  const runId = selected ?? runs[0]?.run_id ?? null;
  const { data: report, isLoading: loadingRun } = useAssayRun(runId);

  // ?run=<id>: a link from CI output or a chat lands on that run.
  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("run");
    if (r) setSelected(r);
  }, []);

  const rows = useMemo(() => {
    const byAgent = new Map<string, AssayResult[]>();
    for (const r of report?.results ?? []) {
      const key = r.agent ?? GLOBAL;
      byAgent.set(key, [...(byAgent.get(key) ?? []), r]);
    }
    // the mesh row first, then agents in suite order
    return [...byAgent.entries()].sort(([a], [b]) => (a === GLOBAL ? -1 : b === GLOBAL ? 1 : 0));
  }, [report]);

  const shown = useMemo(
    () =>
      (report?.results ?? []).filter(
        (r) => !filter || ((r.agent ?? GLOBAL) === filter.agent && r.axis === filter.axis),
      ),
    [report, filter],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
          <FlaskConical className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight">Assay</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Agents checked against their governance by assay7: evidence from the mesh, not the
            model&apos;s word
          </p>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : runs.length === 0 ? (
        <div className="rounded-lg border border-border bg-card py-12 px-4 text-center">
          <FlaskConical className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No assay report yet</p>
          <p className="text-xs text-muted-foreground/70 mt-2 font-mono break-all">
            assay7 run suite.yaml --reports-dir {data?.dir}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          {/* Runs */}
          <div className="rounded-lg border border-border bg-card overflow-hidden self-start">
            <div className="px-4 py-2.5 border-b border-border bg-secondary/30 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Runs
            </div>
            <ul className="max-h-[28rem] overflow-y-auto divide-y divide-border">
              {runs.map((r) => (
                <li key={r.run_id}>
                  <button
                    onClick={() => { setSelected(r.run_id); setFilter(null); }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-secondary/40 transition-colors ${
                      r.run_id === runId ? "bg-primary/10" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {r.ok ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                      )}
                      <span className="text-xs font-mono truncate">{r.suite.split("/").pop()}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap">
                        {timeAgo(r.started_at)}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground font-mono truncate">
                      {r.mode} · {r.agents.join(", ") || "no agent"}
                      {r.profile ? ` · ${r.profile}` : ""}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Selected run */}
          <div className="space-y-6 min-w-0">
            {loadingRun || !report ? (
              <TableSkeleton rows={6} cols={5} />
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Head label="Verdict" value={report.ok ? "OK" : "FAILED"}
                        tone={report.ok ? "text-emerald-400" : "text-red-400"} />
                  <Head label="Failed" value={report.summary.fail + report.summary.xpass + report.summary.error} />
                  <Head label="Known gaps" value={report.summary.xfail} />
                  <Head label="Passed" value={report.summary.pass} />
                </div>
                <p className="text-[11px] text-muted-foreground font-mono break-all">
                  {report.mode} {report.mesh.url} · mesh7 {report.mesh.version ?? "?"} · assay7{" "}
                  {report.assay_version} · session assay-{report.run_id}
                </p>

                {/* Matrix */}
                <div className="rounded-lg border border-border bg-card overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Agent</th>
                        {AXES.map((a) => (
                          <th key={a} className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{a}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(([agent, rs]) => (
                        <tr key={agent} className="border-b border-border last:border-0">
                          <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">{agent}</td>
                          {AXES.map((axis) => {
                            const cell = rs.filter((r) => r.axis === axis);
                            const w = worst(cell);
                            const active = filter?.agent === agent && filter.axis === axis;
                            return (
                              <td key={axis} className="px-3 py-2">
                                {w ? (
                                  <button
                                    onClick={() => setFilter(active ? null : { agent, axis })}
                                    className={`rounded ${active ? "ring-1 ring-primary" : ""}`}
                                    title={`${cell.length} result${cell.length > 1 ? "s" : ""}`}
                                  >
                                    <StatusBadge status={w} />
                                  </button>
                                ) : (
                                  <CircleDashed className="h-3.5 w-3.5 text-muted-foreground/40"
                                                aria-label="not assayed" />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Results */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{shown.length} result{shown.length !== 1 ? "s" : ""}</span>
                    {filter && (
                      <button onClick={() => setFilter(null)} className="text-primary hover:underline">
                        {filter.agent} · {filter.axis} — show all
                      </button>
                    )}
                  </div>
                  <div className="rounded-lg border border-border bg-card divide-y divide-border">
                    {[...shown]
                      .sort((a, b) => SEVERITY.indexOf(a.status) - SEVERITY.indexOf(b.status))
                      .map((r) => <ResultRow key={r.id} r={r} live={report.mode === "live"} />)}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Head({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums font-mono ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

// A trace links to /mesh/traces only for a live run: a spawned mesh was
// thrown away with its traces when the run ended.
function ResultRow({ r, live }: { r: AssayResult; live: boolean }) {
  const [open, setOpen] = useState(r.status !== "pass" && r.status !== "skip");
  const traceId = typeof r.evidence.trace_id === "string" ? r.evidence.trace_id : null;
  return (
    <div className="px-4 py-2.5">
      <button onClick={() => setOpen(!open)} className="w-full text-left flex flex-wrap items-center gap-x-3 gap-y-1">
        <StatusBadge status={r.status} />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.axis}</span>
        <span className="font-mono text-xs break-all min-w-0">{r.id}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2 min-w-0">
          {r.detail && <p className="text-xs text-foreground/90 break-words">{r.detail}</p>}
          {r.xfail && <p className="text-xs text-amber-400/90 break-words">Known gap: {r.xfail}</p>}
          {traceId && live && (
            <Link href={`/mesh/traces?trace=${traceId}`} className="text-xs text-primary hover:underline font-mono">
              trace {traceId.slice(0, 12)}… →
            </Link>
          )}
          {traceId && !live && (
            <p className="text-[11px] text-muted-foreground font-mono">
              trace {traceId.slice(0, 12)}… in the spawned mesh, gone with it
            </p>
          )}
          {Object.keys(r.evidence).length > 0 && (
            <pre className="text-[11px] font-mono bg-secondary/30 rounded p-2 overflow-x-auto max-h-64">
              {JSON.stringify(r.evidence, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

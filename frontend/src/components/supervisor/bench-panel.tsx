"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Calculator, Play, ShieldAlert, ShieldCheck } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import {
  useBenchSets, useBenchRuns, useBenchRun, useBenchEstimate, useBenchProgress, useStartBenchRun,
} from "@/lib/hooks/use-sup7";
import type { BenchSummary } from "@/lib/api/sup7";
import { Label, Signal } from "@/components/supervisor/control-panel";

const pct = (n?: number, d?: number) => (d ? `${Math.round(((n ?? 0) / d) * 100)} %` : "—");

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <Label>{label}</Label>
      <div className={cn("text-xl font-semibold tabular-nums mt-0.5", tone)}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Delta({ run }: { run: BenchSummary }) {
  if (!run.delta) return null;
  const d = run.delta;
  return (
    <span className="text-[11px] text-muted-foreground">
      vs previous: dangers approved {d.danger_approved >= 0 ? "+" : ""}{d.danger_approved}, normal approved{" "}
      {d.normal_approved >= 0 ? "+" : ""}{d.normal_approved}
    </span>
  );
}

/**
 * Measure the live configuration on labelled cases. Recompute re-decides from
 * the raw answers of an earlier run (free, instant: thresholds only); replay
 * asks Jev again (needed once the questions or the project changed).
 */
export function Sup7BenchPanel() {
  const sets = useBenchSets();
  const [set, setSet] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<"review" | "all" | "wrong">("review");
  const progress = useBenchProgress(true);
  const running = !!progress.data?.running;
  const runs = useBenchRuns(running);
  const estimate = useBenchEstimate(set);
  const start = useStartBenchRun();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!set && sets.data?.length) setSet(sets.data[0].name);
  }, [sets.data, set]);

  const setRuns = useMemo(() => (runs.data ?? []).filter((r) => r.set === set), [runs.data, set]);
  useEffect(() => {
    // follow the newest run of the set, unless the user picked another one
    if (setRuns.length && (!selected || !setRuns.some((r) => r.id === selected))) setSelected(setRuns[0].id);
  }, [setRuns, selected]);
  const run = useBenchRun(selected);

  useEffect(() => {
    if (!running) {
      estimate.refetch();
      if (selected) run.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  function launch(mode: "recompute" | "replay") {
    if (!set || !estimate.data) return;
    if (mode === "replay") {
      const e = estimate.data.replay;
      const ok = window.confirm(
        `Replay ${estimate.data.cases} cases through Jev: about ${e.tokens.toLocaleString()} tokens, ` +
          `$${e.cost_usd.toFixed(4)}, ${e.seconds} s. Nothing is resolved in the mesh. Go?`
      );
      if (!ok) return;
    }
    setError(null);
    start.mutate({ set, mode }, {
      onSuccess: (r) => setSelected(r.id),
      onError: (e) => setError((e as Error).message),
    });
  }

  const r = run.data;
  const rows = useMemo(() => {
    const all = r?.results ?? [];
    if (filter === "all") return all;
    if (filter === "wrong") return all.filter((x) => x.final !== "error" && x.final !== x.label);
    return all.filter((x) => x.review || (x.label !== "approve" && x.final === "approve"));
  }, [r, filter]);

  if (sets.isError) {
    return <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">{(sets.error as Error).message}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Set and launch */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Label>Case set</Label>
          {(sets.data ?? []).map((s) => (
            <button
              key={s.name}
              onClick={() => { setSet(s.name); setSelected(null); }}
              className={cn(
                "rounded border px-2 py-1 font-mono text-[11px]",
                set === s.name ? "border-primary/40 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {s.name} · {s.cases} ({Object.entries(s.labels).map(([k, v]) => `${v} ${k}`).join(", ")})
            </button>
          ))}
          {sets.data?.length === 0 && (
            <span className="text-xs text-muted-foreground">No case set in bench.dir/sets (see sup7 bench replay --export-set).</span>
          )}
        </div>
        {estimate.data && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => launch("recompute")}
              disabled={running || start.isPending || !estimate.data.recompute.available}
              className="inline-flex items-center gap-1.5 rounded bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-400 disabled:opacity-40"
              title={estimate.data.recompute.reason || `from run ${estimate.data.recompute.from_run}`}
            >
              <Calculator className="h-3.5 w-3.5" /> Recompute · free, thresholds only
            </button>
            <button
              onClick={() => launch("replay")}
              disabled={running || start.isPending}
              className="inline-flex items-center gap-1.5 rounded bg-primary/15 px-3 py-1.5 text-xs text-primary disabled:opacity-40"
            >
              <Play className="h-3.5 w-3.5" /> Replay through Jev · ~${estimate.data.replay.cost_usd.toFixed(4)}, ~{estimate.data.replay.seconds} s
            </button>
            {!estimate.data.recompute.available && (
              <span className="text-[11px] text-muted-foreground">{estimate.data.recompute.reason}</span>
            )}
          </div>
        )}
        {running && progress.data && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {progress.data.id} · {progress.data.done ?? 0}/{progress.data.total ?? "?"}
            <div className="h-1.5 w-48 rounded bg-secondary/60 overflow-hidden">
              <div className="h-full bg-primary/60" style={{ width: `${((progress.data.done ?? 0) / (progress.data.total || 1)) * 100}%` }} />
            </div>
          </div>
        )}
        {error && <p className="text-xs text-red-300 font-mono">{error}</p>}
      </div>

      {/* Runs of the set */}
      {setRuns.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {setRuns.slice(0, 8).map((x) => (
            <button
              key={x.id}
              onClick={() => setSelected(x.id)}
              className={cn(
                "rounded border px-2 py-1 text-[11px] font-mono",
                selected === x.id ? "border-primary/40 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {timeAgo(x.started_at)} · {x.mode} · {x.status === "done" ? `${x.danger_approved} danger, ${pct(x.normal_approved, x.normal)} normal` : x.status}
            </button>
          ))}
        </div>
      )}

      {/* Selected run */}
      {r && r.status === "done" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className={cn(
              "rounded-lg border p-3 flex items-center gap-2",
              (r.danger_approved ?? 0) > 0 ? "border-red-500/40 bg-red-500/10" : "border-emerald-500/30 bg-emerald-500/10"
            )}>
              {(r.danger_approved ?? 0) > 0 ? <ShieldAlert className="h-6 w-6 text-red-400" /> : <ShieldCheck className="h-6 w-6 text-emerald-400" />}
              <div>
                <Label>Dangers approved</Label>
                <div className={cn("text-xl font-semibold tabular-nums", (r.danger_approved ?? 0) > 0 ? "text-red-400" : "text-emerald-400")}>
                  {r.danger_approved} / {r.dangers}
                </div>
              </div>
            </div>
            <Kpi label="Normal approved" value={pct(r.normal_approved, r.normal)} sub={`${r.normal_approved} / ${r.normal}`} />
            <Kpi label="Correct denies" value={r.denies ? `${r.deny_ok} / ${r.denies}` : "—"} />
            <Kpi label="To review" value={String(r.to_review ?? 0)} sub={`${r.errors ?? 0} errors`} />
            <Kpi label="Latency" value={r.latency_ms ? `${r.latency_ms.median} ms` : "—"} sub={r.latency_ms ? `p95 ${r.latency_ms.p95} ms` : r.mode} />
          </div>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[11px] text-muted-foreground font-mono">
            <span>{r.id}</span>
            <span>questions {r.questions?.join(", ")}</span>
            <span>threshold {r.threshold}</span>
            {r.from_run && <span>from {r.from_run}</span>}
            <Delta run={r} />
          </div>

          <div className="flex items-center gap-2">
            <Label>Cases</Label>
            {(["review", "wrong", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn("rounded px-2 py-0.5 text-[11px]", filter === f ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}
              >
                {f === "review" ? "to review" : f === "wrong" ? "verdict ≠ label" : "all"}
              </button>
            ))}
            <span className="text-[11px] text-muted-foreground">{rows.length}</span>
          </div>
          <div className="rounded-lg border border-border bg-card overflow-x-auto max-h-[560px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-left text-[11px] text-muted-foreground uppercase tracking-wider">
                  <th className="px-3 py-2 font-medium">Call</th>
                  <th className="px-3 py-2 font-medium">Label → sup7</th>
                  <th className="px-3 py-2 font-medium">Signals</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 300).map((x) => {
                  const danger = x.label !== "approve" && x.final === "approve";
                  return (
                    <tr key={x.trace_id} className={cn("border-b border-border/30 align-top", danger && "bg-red-500/10")}>
                      <td className="px-3 py-2 max-w-md">
                        <span className="font-mono">{x.tool}</span>
                        <span className="block text-[11px] text-muted-foreground truncate">
                          {JSON.stringify(x.params).slice(0, 160)}
                        </span>
                        {x.review && <span className="block text-[10px] text-amber-400">{x.review}</span>}
                      </td>
                      <td className="px-3 py-2 font-mono whitespace-nowrap">
                        {x.label} → <span className={cn(x.final === x.label ? "text-emerald-400" : danger ? "text-red-400" : "text-amber-400")}>{x.final}</span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(x.signals)
                            .filter(([k]) => k !== "destructive")
                            .map(([k, v]) => <Signal key={k} name={k} value={v} />)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {r && r.status === "failed" && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 font-mono">{r.error}</div>
      )}
    </div>
  );
}

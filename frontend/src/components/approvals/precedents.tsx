"use client";

import { Loader2, Eraser } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { usePrecedents, useForgetPrecedents } from "@/lib/hooks/use-mesh";

/**
 * What mem7 remembers per tool and agent, and what it lets through. Only
 * human approvals count as precedents; one refusal blocks; only tools that
 * read may be approved from precedents at all.
 */
export function Precedents() {
  const q = usePrecedents();
  const forget = useForgetPrecedents();

  if (q.isLoading) return null;
  if (q.isError || !q.data) {
    return <p className="text-xs text-muted-foreground">Precedents unavailable: {(q.error as Error)?.message}</p>;
  }
  const d = q.data;
  const rows = [...d.precedents].sort((a, b) => Number(b.would_auto_approve) - Number(a.would_auto_approve) || b.last.localeCompare(a.last));

  function onForget(tool: string, agent: string) {
    if (!window.confirm(`Forget every decision mem7 holds for ${tool} by ${agent}? That couple starts again from no precedent.`)) return;
    forget.mutate({ tool, agent });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Precedents in mem7
        </span>
        <span className="text-[11px] text-muted-foreground">
          {d.enabled
            ? `a call passes without the supervisor after ${d.min_approvals} human approvals and no refusal, for tools that read only`
            : `auto-approval from precedents is off (${d.reason})`}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No decision remembered.</p>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {["Agent · tool", "Human approvals", "sup7 / auto", "Refusals", "Before tagging", "Next call", "Last", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const next = p.would_auto_approve
                  ? { label: "passes on precedents", tone: "border-violet-500/30 bg-violet-500/10 text-violet-400" }
                  : !p.auto_approvable
                  ? { label: "supervisor (not a read)", tone: "border-border bg-secondary/30 text-muted-foreground" }
                  : p.refused > 0
                  ? { label: "supervisor (refused before)", tone: "border-red-500/30 bg-red-500/10 text-red-400" }
                  : { label: `supervisor (${p.human_approved}/${d.min_approvals})`, tone: "border-sky-500/30 bg-sky-500/10 text-sky-400" };
                return (
                  <tr key={`${p.agent}-${p.tool}`} className="border-b border-border/30">
                    <td className="px-4 py-2.5">
                      <span className="text-sm">{p.agent || "?"}</span>
                      <span className="block font-mono text-xs text-muted-foreground">{p.tool}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums">{p.human_approved}</td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-muted-foreground" title="never counted as a precedent">{p.other_approved}</td>
                    <td className={cn("px-4 py-2.5 font-mono tabular-nums", p.refused > 0 && "text-red-400")}>{p.refused}</td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-muted-foreground" title="written before the by: tag, not counted">{p.untagged}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-mono", next.tone)}>{next.label}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{p.last ? timeAgo(p.last) : "—"}</td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => onForget(p.tool, p.agent)}
                        disabled={forget.isPending || !p.agent}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40"
                        title="drop these decisions from mem7"
                      >
                        {forget.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eraser className="h-3 w-3" />} Forget
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {forget.isError && <p className="text-xs text-red-300 font-mono">{(forget.error as Error).message}</p>}
    </div>
  );
}

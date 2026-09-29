"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useSup7Config } from "@/lib/hooks/use-sup7";
import type { Sup7Question } from "@/lib/api/sup7";
import { Label } from "@/components/supervisor/control-panel";

const GROUPS: Array<{ key: Sup7Question["group"]; title: string; hint: string }> = [
  { key: "danger", title: "Danger", hint: "any answer above its threshold blocks approval" },
  { key: "context", title: "Context", hint: "situates the call: where it acts, whether it fits" },
  { key: "manipulation", title: "Manipulation", hint: "above its threshold, the call goes to a human" },
];

const groupTone: Record<Sup7Question["group"], string> = {
  danger: "text-red-400 border-red-500/30 bg-red-500/10",
  context: "text-sky-400 border-sky-500/30 bg-sky-500/10",
  manipulation: "text-amber-400 border-amber-500/30 bg-amber-500/10",
};

/**
 * What sup7 answers for and how: the calls it takes from the mesh, the
 * project it knows, and every question Jev is asked, by family, with the
 * threshold that applies. The domains are the question packs.
 */
export function Sup7ScopeQuestions() {
  const config = useSup7Config();
  if (config.isLoading) return <Skeleton className="h-40 w-full" />;
  if (!config.data) return null;
  const c = config.data;
  const jev = c.evaluator.providers.find((p) => p.provider === "jev");
  const set = c.questions?.[0];
  const defaults: Record<Sup7Question["group"], string> = {
    danger: `destructive_max ${jev?.destructive_max ?? "?"}`,
    context: "",
    manipulation: `injection_max ${jev?.injection_max ?? "?"}`,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4 space-y-2 text-xs">
          <Label>Scope · calls sup7 takes from the mesh queue</Label>
          <p className="font-mono">
            {c.scope?.tool_scopes?.length ? c.scope.tool_scopes.join(", ") : "every tool sent to human_approval"}
          </p>
          <p className="text-muted-foreground">
            Only calls the mesh policy sends to approval reach sup7; allowed or denied calls never do.
          </p>
        </div>
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-4 space-y-2 text-xs">
          <Label>Project · {c.project_dirs.length} directories (rule project-writes, and target_zone for Jev)</Label>
          <div className="flex flex-wrap gap-1.5">
            {c.project_dirs.map((d) => (
              <span key={d} className="rounded border border-border bg-background px-2 py-0.5 font-mono text-[11px]">
                {d.replace(/^\/home\/[^/]+\//, "~/")}
              </span>
            ))}
          </div>
        </div>
      </div>

      {set?.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">{set.error}</div>
      )}

      {set?.packs && (
        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 pt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Label>Questions asked to Jev · decided in code</Label>
            <span className="font-mono text-[11px] text-muted-foreground">
              {set.packs.length} pack{set.packs.length > 1 ? "s" : ""}
              {set.sha_all ? ` · fingerprint ${set.sha_all}` : ""} · {(set.files ?? []).join(", ")}
            </span>
          </div>
          {set.packs.map((pack) => (
            <div key={pack.name} className="mt-3">
              <div className="px-4 pb-1 flex items-baseline gap-2 text-xs">
                <span className="font-mono font-semibold">{pack.name}</span>
                <span className="text-muted-foreground">
                  {pack.applies_to.length ? `applies to ${pack.applies_to.join(", ")}` : "applies to every call"}
                </span>
              </div>
              {GROUPS.map((g) => {
                const qs = pack.questions.filter((q) => q.group === g.key);
                if (!qs.length) return null;
                return (
                  <div key={g.key} className="border-t border-border/40">
                    <div className="px-4 py-1.5 flex items-baseline gap-2">
                      <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-mono", groupTone[g.key])}>{g.title}</span>
                      <span className="text-[11px] text-muted-foreground">{g.hint}</span>
                    </div>
                    <table className="w-full text-xs">
                      <tbody>
                        {qs.map((q) => (
                          <tr key={q.name} className="border-t border-border/20 align-top">
                            <td className="px-4 py-2 font-mono w-40">
                              {q.name}
                              <span className="block text-[10px] text-muted-foreground">
                                {q.type}{q.role ? ` · ${q.role}` : ""}
                              </span>
                            </td>
                            <td className="px-2 py-2 font-mono tabular-nums w-40 text-muted-foreground">
                              {q.threshold != null ? `≤ ${q.threshold} (own)` : defaults[g.key] || (q.role === "scope"
                                ? `approve ≥ ${jev?.in_scope_min ?? "?"} · deny < ${jev?.deny_in_scope_max ?? "?"}` : "—")}
                              {q.ignore_when && (
                                <span className="block text-[10px]">
                                  not counted if {q.ignore_when.question} = {q.ignore_when.option} ≥ {q.ignore_when.min ?? jev?.project_min ?? "?"}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              <p>{q.instructions}</p>
                              {Object.keys(q.criteria).length > 0 && (
                                <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 text-[11px] text-muted-foreground">
                                  {Object.entries(q.criteria).map(([k, v]) => (
                                    <span key={k} className="contents">
                                      <dt className="font-mono">{k}</dt>
                                      <dd>{v}</dd>
                                    </span>
                                  ))}
                                </dl>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

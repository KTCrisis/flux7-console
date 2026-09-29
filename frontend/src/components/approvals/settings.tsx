"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApprovalSettings, useSaveApprovalSettings } from "@/lib/hooks/use-mesh";
import type { ApprovalSettings as Settings } from "@/lib/api/mesh";

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      {children}
      <span className="text-[11px] text-muted-foreground/80">{hint}</span>
    </label>
  );
}

/**
 * The approval knobs of mesh7, changed without a restart: mesh7 validates,
 * writes them back to its config file (comments kept, backup next to it),
 * applies them at once and traces the change.
 */
export function ApprovalSettingsPanel() {
  const q = useApprovalSettings();
  const save = useSaveApprovalSettings();
  const [draft, setDraft] = useState<Settings | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (q.data) setDraft(q.data.settings);
  }, [q.data]);

  if (q.isError) return <p className="text-xs text-muted-foreground">Approval settings unavailable: {(q.error as Error).message}</p>;
  if (!q.data || !draft) return null;
  const s = q.data.settings;
  const dirty = JSON.stringify(draft) !== JSON.stringify(s);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => { setDone(null); setDraft({ ...draft, [k]: v }); };
  const input = "rounded border border-border bg-background px-2 py-1 font-mono text-xs w-28 focus:outline-none";

  function onSave() {
    if (!draft) return;
    if (draft.auto_approve_writes && !s.auto_approve_writes &&
      !window.confirm("Let precedents approve writes? A precedent ignores the arguments: approved writes in a project would let a write anywhere through, without the supervisor.")) return;
    save.mutate(draft, { onSuccess: (r) => setDone(r.changed.length ? `applied: ${r.changed.join(", ")}` : "nothing changed") });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Approval settings</span>
        <span className="text-[11px] text-muted-foreground font-mono">{q.data.config}</span>
      </div>
      <div className={cn("rounded-lg border bg-card p-4", dirty ? "border-amber-500/40" : "border-border")}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Field label="Wait for sup7 (s)" hint="a call holds this long for an automatic decision; 0 answers at once">
            <input type="number" min={0} max={10} step={0.5} className={input} value={draft.wait_seconds}
              onChange={(e) => set("wait_seconds", Number(e.target.value))} />
          </Field>
          <Field label="Approval timeout (s)" hint="a pending approval expires after this">
            <input type="number" min={30} max={3600} step={30} className={input} value={draft.timeout_seconds}
              onChange={(e) => set("timeout_seconds", Number(e.target.value))} />
          </Field>
          <Field label="Approve from precedents" hint="mem7: repeat what a human approved before">
            <input type="checkbox" className="h-4 w-4" checked={draft.auto_approve} disabled={!q.data.precedent}
              onChange={(e) => set("auto_approve", e.target.checked)} />
          </Field>
          <Field label="Human approvals needed" hint="for one tool and agent, no refusal">
            <input type="number" min={1} max={100} className={input} value={draft.min_approvals}
              onChange={(e) => set("min_approvals", Number(e.target.value))} />
          </Field>
          <Field label="Precedents may approve writes" hint="off: reads only (recommended)">
            <input type="checkbox" className="h-4 w-4" checked={draft.auto_approve_writes}
              onChange={(e) => set("auto_approve_writes", e.target.checked)} />
          </Field>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button onClick={onSave} disabled={!dirty || save.isPending || !q.data.editable}
            className="inline-flex items-center gap-1 rounded bg-primary/15 px-3 py-1.5 text-xs text-primary disabled:opacity-40">
            {save.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Validate and apply
          </button>
          {dirty && <button onClick={() => setDraft(s)} className="text-xs text-muted-foreground hover:text-foreground">Discard</button>}
          {done && <span className="inline-flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />{done}</span>}
          {save.isError && <span className="text-xs text-red-300 font-mono">{(save.error as Error).message}</span>}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, RotateCcw, FilePlus2, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSup7Files, useSup7File, useSaveSup7File } from "@/lib/hooks/use-sup7";
import type { Sup7WriteResult } from "@/lib/api/sup7";
import { Label } from "@/components/supervisor/control-panel";

const NEW_PACK = `pack: my-domain
applies_to: ["agent:my-agent-*"]   # or "tool:bank.*"; empty = every call
questions:
  my_question:
    type: noul                     # noul (yes/no probability), choice or score
    group: danger                  # danger, context or manipulation
    threshold: 0.2                 # optional, default destructive_max
    instructions: The call ...
    criteria:
      true: ...
      false: ...
`;

/**
 * Edit sup7.yaml and the question sets as text. sup7 validates the whole
 * resulting configuration before writing, refuses a file changed since it was
 * read, keeps a backup, and applies the change without restart where it can.
 */
export function Sup7FileEditor() {
  const files = useSup7Files();
  const [id, setId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [result, setResult] = useState<Sup7WriteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const file = useSup7File(creating ? null : id);
  const save = useSaveSup7File();

  useEffect(() => {
    if (!id && files.data?.length) setId(files.data[0].id);
  }, [files.data, id]);

  useEffect(() => {
    if (file.data) setDraft(file.data.text);
  }, [file.data]);

  const dirty = creating ? draft !== NEW_PACK : file.data !== undefined && draft !== file.data.text;

  function open(next: string) {
    if (dirty && !window.confirm("Discard the unsaved changes?")) return;
    setCreating(false);
    setId(next);
    setResult(null);
    setError(null);
  }

  function startNew() {
    if (dirty && !window.confirm("Discard the unsaved changes?")) return;
    setCreating(true);
    setNewName("");
    setDraft(NEW_PACK);
    setResult(null);
    setError(null);
  }

  function handleSave() {
    const target = creating ? `questions/${newName.trim()}` : id;
    if (!target) return;
    setError(null);
    setResult(null);
    save.mutate(
      { id: target, text: draft, sha: creating ? "new" : file.data?.sha ?? "" },
      {
        onSuccess: (r) => {
          setResult(r);
          if (creating) {
            setCreating(false);
            setId(target);
          }
        },
        onError: (e) => setError((e as Error).message),
      }
    );
  }

  if (files.isError) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
        {(files.error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Label>Files</Label>
        {(files.data ?? []).map((f) => (
          <button
            key={f.id}
            onClick={() => open(f.id)}
            className={cn(
              "rounded border px-2 py-1 font-mono text-[11px] transition-colors",
              !creating && id === f.id ? "border-primary/40 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"
            )}
            title={f.path}
          >
            {f.id}
          </button>
        ))}
        <button
          onClick={startNew}
          className={cn(
            "inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] transition-colors",
            creating ? "border-primary/40 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <FilePlus2 className="h-3 w-3" /> New question pack
        </button>
      </div>

      <div className={cn("rounded-lg border bg-card overflow-hidden", dirty ? "border-amber-500/40" : "border-border")}>
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-border bg-secondary/20 text-[11px]">
          {creating ? (
            <>
              <span className="text-muted-foreground">questions/</span>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="finance.yaml"
                className="rounded border border-border bg-background px-2 py-0.5 font-mono focus:outline-none"
              />
            </>
          ) : (
            <span className="font-mono text-muted-foreground">
              {files.data?.find((f) => f.id === id)?.path} · fingerprint {file.data?.sha ?? "…"}
            </span>
          )}
          {dirty && <span className="text-amber-400">unsaved</span>}
          <div className="ml-auto flex items-center gap-1.5">
            {!creating && (
              <button
                onClick={() => file.refetch().then((r) => r.data && setDraft(r.data.text))}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-muted-foreground hover:text-foreground"
                title="Reload from disk (drops the draft)"
              >
                <RotateCcw className="h-3 w-3" /> Reload
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={save.isPending || !dirty || (creating && !newName.trim())}
              className="inline-flex items-center gap-1 rounded bg-primary/15 px-2 py-1 text-primary disabled:opacity-40"
            >
              {save.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Validate and save
            </button>
          </div>
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
          className="w-full bg-transparent text-xs font-mono text-foreground px-4 py-3 focus:outline-none resize-y min-h-[320px] leading-relaxed"
          rows={Math.min(40, Math.max(16, draft.split("\n").length + 2))}
        />
      </div>

      {error && (
        <div className="flex gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Not saved: production is unchanged.</p>
            <p className="font-mono mt-1 whitespace-pre-wrap">{error}</p>
          </div>
        </div>
      )}
      {result && (
        <div className="flex gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <div className="space-y-0.5">
            <p className="font-medium">
              Saved and applied · {result.sha_before ?? "new"} → {result.sha_after}
            </p>
            {result.backup && <p className="font-mono text-emerald-300/80">backup {result.backup}</p>}
            {result.restart_required.length > 0 && (
              <p className="text-amber-300">
                Restart sup7 to apply: {result.restart_required.join(", ")} (read at start only).
              </p>
            )}
            <p className="text-emerald-300/80">Measure the effect in the Evaluate tab.</p>
          </div>
        </div>
      )}
    </div>
  );
}

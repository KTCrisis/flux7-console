"use client";

import { useEffect, useMemo, useState } from "react";
import { useHalts, useCreateHalt, useResumeHalt, useTraces } from "@/lib/hooks/use-mesh";
import { describeHalt, type HaltScope } from "@/lib/api/mesh";
import { timeAgo } from "@/lib/utils";
import { OctagonX, Play, Power, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// The emergency stop: everything, one agent or one session, at once. A stop
// blocks every tool call in its scope before policy, grants and approvals,
// denies the approvals waiting in it and revokes the grants, put back on resume.
export default function HaltsPage() {
  const { data: halts, isLoading } = useHalts();
  const { data: traces } = useTraces({ limit: 1000 });
  const create = useCreateHalt();
  const resume = useResumeHalt();

  const [armed, setArmed] = useState(false);
  const [globalReason, setGlobalReason] = useState("");
  const [scope, setScope] = useState<Exclude<HaltScope, "all">>("agent");
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [last, setLast] = useState<string | null>(null);

  // The global button needs a second click within 5 seconds: one stray click
  // must not stop every agent.
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(id);
  }, [armed]);

  // Agents and sessions seen in the traces, offered as suggestions.
  const known = useMemo(() => {
    const agents = new Set<string>();
    const sessions = new Set<string>();
    for (const t of traces ?? []) {
      if (t.policy_rule === "control-plane") continue; // operators, not agents
      if (t.agent_id) agents.add(t.agent_id);
      if (t.session_id) sessions.add(t.session_id);
    }
    return { agents: [...agents].sort(), sessions: [...sessions] };
  }, [traces]);

  const globalActive = (halts ?? []).find((h) => h.scope === "all");

  function stop(opts: { scope: HaltScope; target?: string; reason?: string }) {
    create.mutate(opts, {
      onSuccess: (r) => {
        setLast(
          r.already_active
            ? `Already stopped: ${describeHalt(r.halt)}`
            : `Stopped ${describeHalt(r.halt)}: ${r.revoked_grants ?? 0} grant(s) revoked, ${r.denied_approvals ?? 0} pending approval(s) denied`
        );
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-red-500/15 flex items-center justify-center">
          <OctagonX className="h-4 w-4 text-red-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Emergency stop</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Blocks every tool call in a scope, before policy, grants and approvals
          </p>
        </div>
      </div>

      {/* Stop everything */}
      <div className="rounded-lg border border-red-500/30 bg-red-500/[0.04] p-5">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-red-300">Stop all agents</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              Every agent, every session. Pending approvals are denied and every grant is
              revoked; resuming puts back the grants that have not expired.
            </p>
          </div>
          {globalActive ? (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-300">
              <OctagonX className="h-3.5 w-3.5" />
              Stopped {timeAgo(globalActive.created_at)}
            </span>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Reason (optional)"
                value={globalReason}
                onChange={(e) => setGlobalReason(e.target.value)}
                className="w-56 rounded-md border border-border bg-background px-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-red-400"
              />
              <button
                onClick={() => {
                  if (!armed) { setArmed(true); return; }
                  setArmed(false);
                  stop({ scope: "all", reason: globalReason || undefined });
                  setGlobalReason("");
                }}
                disabled={create.isPending}
                className={
                  armed
                    ? "flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-xs font-semibold text-white animate-pulse"
                    : "flex items-center gap-1.5 rounded-md bg-red-500/90 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                }
              >
                <Power className="h-3.5 w-3.5" />
                {armed ? "Click again to stop everything" : "Stop all agents"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Targeted stop */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold">Stop one agent or one session</h2>
        <div className="grid grid-cols-1 sm:grid-cols-[8rem_1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Scope</label>
            <select
              value={scope}
              onChange={(e) => { setScope(e.target.value as "agent" | "session"); setTarget(""); }}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="agent">Agent</option>
              <option value="session">Session</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {scope === "agent" ? "Agent ID (a glob works)" : "Session ID"}
            </label>
            <input
              type="text"
              list={scope === "agent" ? "known-agents" : "known-sessions"}
              placeholder={scope === "agent" ? "e.g. scout7" : "session ID"}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <datalist id="known-agents">{known.agents.map((a) => <option key={a} value={a} />)}</datalist>
            <datalist id="known-sessions">{known.sessions.map((s) => <option key={s} value={s} />)}</datalist>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Reason</label>
            <input
              type="text"
              placeholder="optional"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={() => {
              if (!target.trim()) return;
              stop({ scope, target: target.trim(), reason: reason || undefined });
              setTarget("");
              setReason("");
            }}
            disabled={!target.trim() || create.isPending}
            className="flex items-center justify-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-40 transition-colors"
          >
            <OctagonX className="h-3.5 w-3.5" />
            Stop
          </button>
        </div>
        {create.error && <p className="text-xs text-red-400">{(create.error as Error).message}</p>}
        {last && !create.error && <p className="text-xs text-muted-foreground">{last}</p>}
      </div>

      {/* Stops in force */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">In force</h2>
        {isLoading ? (
          <Skeleton className="h-14 w-full" />
        ) : (halts ?? []).length === 0 ? (
          <div className="rounded-lg border border-border bg-card py-10 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-emerald-400/50 mb-2" />
            <p className="text-sm text-muted-foreground">No stop in force: agents run under their policies</p>
          </div>
        ) : (
          (halts ?? []).map((h) => (
            <div key={h.id} className="rounded-lg border border-red-500/25 bg-card px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-8 w-8 shrink-0 rounded-lg bg-red-500/15 flex items-center justify-center">
                  <OctagonX className="h-4 w-4 text-red-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{describeHalt(h)}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{h.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                    <span>since {timeAgo(h.created_at)}</span>
                    {h.created_by && <span className="font-mono">by {h.created_by}</span>}
                    {h.reason && <span className="text-foreground/80">{h.reason}</span>}
                    {(h.revoked_grants?.length ?? 0) > 0 && (
                      <span>{h.revoked_grants!.length} grant(s) to restore on resume</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => resume.mutate(h.id)}
                disabled={resume.isPending}
                className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
              >
                <Play className="h-3 w-3" />
                Resume
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useGrants, useCreateGrant, useRevokeGrant } from "@/lib/hooks/use-mesh";
import { Key, Plus, Trash2, Clock, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function GrantsPage() {
  const { data: grants, isLoading } = useGrants();
  const create = useCreateGrant();
  const revoke = useRevokeGrant();

  const [showForm, setShowForm] = useState(false);
  const [agent, setAgent] = useState("");
  const [tools, setTools] = useState("");
  const [duration, setDuration] = useState("30m");

  function handleCreate() {
    if (!agent || !tools) return;
    create.mutate(
      { agent, tools, duration },
      {
        onSuccess: () => {
          setAgent("");
          setTools("");
          setDuration("30m");
          setShowForm(false);
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <Key className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Grants</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {grants?.length ?? 0} active grant{(grants?.length ?? 0) !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-md bg-primary/15 text-primary px-3 py-1.5 text-xs font-medium hover:bg-primary/25 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New grant
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Agent</label>
              <input
                type="text"
                placeholder="e.g. scout7"
                value={agent}
                onChange={(e) => setAgent(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Tools pattern</label>
              <input
                type="text"
                placeholder="e.g. filesystem.* or bash_exec"
                value={tools}
                onChange={(e) => setTools(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="5m">5 minutes</option>
                <option value="15m">15 minutes</option>
                <option value="30m">30 minutes</option>
                <option value="1h">1 hour</option>
                <option value="4h">4 hours</option>
                <option value="24h">24 hours</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              disabled={!agent || !tools || create.isPending}
              className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Key className="h-3 w-3" />
              Create grant
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Active grants */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4 flex items-center gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : (grants ?? []).length === 0 ? (
        <div className="rounded-lg border border-border bg-card py-12 text-center">
          <Shield className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No active grants</p>
          <p className="text-xs text-muted-foreground mt-1">
            Grants are created when you approve tool calls or via the form above
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {(grants ?? []).map((g) => (
            <div
              key={g.id}
              className="rounded-lg border border-border bg-card px-4 py-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Key className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{g.agent}</span>
                    <span className="font-mono text-xs text-muted-foreground">{g.tools}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {g.remaining} remaining
                    </span>
                    {g.granted_by && (
                      <span className="font-mono">{g.granted_by}</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => revoke.mutate(g.id)}
                disabled={revoke.isPending}
                className="flex items-center gap-1.5 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

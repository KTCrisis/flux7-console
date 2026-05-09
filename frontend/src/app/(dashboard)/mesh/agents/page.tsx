"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTraces, useGrants, useApprovals } from "@/lib/hooks/use-mesh";
import { timeAgo } from "@/lib/utils";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Cpu, ArrowRight, Shield, Key, Activity } from "lucide-react";

interface AgentRow {
  id: string;
  traceCount: number;
  tools: string[];
  policies: string[];
  grantCount: number;
  pendingApprovals: number;
  lastSeen: string;
  denied: number;
  allowed: number;
}

export default function AgentsPage() {
  const { data: traces, isLoading: loadingTraces } = useTraces({ limit: 1000 });
  const { data: grants } = useGrants();
  const { data: approvals } = useApprovals();

  const agents = useMemo(() => {
    if (!traces) return [];

    const map = new Map<string, AgentRow>();

    for (const t of traces) {
      if (!t.agent_id) continue;
      let row = map.get(t.agent_id);
      if (!row) {
        row = {
          id: t.agent_id,
          traceCount: 0,
          tools: [],
          policies: [],
          grantCount: 0,
          pendingApprovals: 0,
          lastSeen: t.timestamp,
          denied: 0,
          allowed: 0,
        };
        map.set(t.agent_id, row);
      }
      row.traceCount++;
      if (!row.tools.includes(t.tool)) row.tools.push(t.tool);
      if (t.policy && !row.policies.includes(t.policy)) row.policies.push(t.policy);
      if (t.timestamp > row.lastSeen) row.lastSeen = t.timestamp;
      if (t.policy === "deny") row.denied++;
      else row.allowed++;
    }

    for (const g of grants ?? []) {
      const row = map.get(g.agent);
      if (row) row.grantCount++;
    }

    for (const a of approvals ?? []) {
      if (a.status === "pending") {
        const row = map.get(a.agent_id);
        if (row) row.pendingApprovals++;
      }
    }

    return Array.from(map.values()).sort((a, b) => b.traceCount - a.traceCount);
  }, [traces, grants, approvals]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
          <Cpu className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Agents</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {agents.length} active agent{agents.length !== 1 ? "s" : ""} — derived from traces
          </p>
        </div>
      </div>

      {loadingTraces ? (
        <TableSkeleton rows={5} cols={6} />
      ) : agents.length === 0 ? (
        <div className="rounded-lg border border-border bg-card py-12 text-center">
          <Cpu className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No agents detected in traces</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Agent</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Traces</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Tools</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Last seen</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-2.5">
                    <Link href={`/mesh/agents/${encodeURIComponent(a.id)}`} className="font-mono text-xs text-primary hover:underline">
                      {a.id}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs tabular-nums">{a.traceCount}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{a.tools.length}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {a.pendingApprovals > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400">
                          <Shield className="h-2.5 w-2.5" />
                          {a.pendingApprovals}
                        </span>
                      )}
                      {a.grantCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-primary">
                          <Key className="h-2.5 w-2.5" />
                          {a.grantCount}
                        </span>
                      )}
                      {a.denied > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-red-400">
                          {a.denied} denied
                        </span>
                      )}
                      {a.pendingApprovals === 0 && a.grantCount === 0 && a.denied === 0 && (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{timeAgo(a.lastSeen)}</td>
                  <td className="px-4 py-2.5">
                    <Link href={`/mesh/agents/${encodeURIComponent(a.id)}`} className="text-muted-foreground hover:text-foreground transition-colors">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

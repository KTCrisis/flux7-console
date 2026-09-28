"use client";

import { useMemo, useState } from "react";
import { useTools, useMcpServers, usePolicies, useToolDecisions, useSetToolAction } from "@/lib/hooks/use-mesh";
import type { ToolAction, ToolClassification, ToolDecision } from "@/lib/api/mesh";
import { TableSkeleton, Skeleton } from "@/components/ui/skeleton";
import { Search, Wrench, Server, Terminal, Globe, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

const SOURCE_ICONS: Record<string, typeof Wrench> = {
  mcp: Server,
  cli: Terminal,
  rest: Globe,
};

const SOURCE_COLORS: Record<string, string> = {
  mcp: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  cli: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  rest: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

const ACTION_STYLES: Record<string, string> = {
  allow: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  deny: "bg-red-500/10 text-red-400 border-red-500/20",
  human_approval: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

const ACCESS_COLORS: Record<string, string> = {
  read: "text-emerald-400",
  write: "text-amber-400",
  unknown: "text-muted-foreground",
};

// A tool the policy lets through without being a plain named read is worth a
// second look: a write, a tool with no signal, or an interpreter.
// The upstream a tool comes from: its MCP server, or the declared name of a
// CLI tool (the part before the dot; the binary is a path, not a name).
function upstreamOf(t: { name: string; source: string; mcp_server?: string }): string {
  if (t.mcp_server) return t.mcp_server;
  return t.source === "cli" ? t.name.split(".")[0] : "";
}

function needsReview(c?: ToolClassification, d?: ToolDecision): boolean {
  if (!c || !d || d.action !== "allow") return false;
  return c.family === "generic" || c.access !== "read";
}

export default function ToolsPage() {
  const { data: tools, isLoading: loadingTools } = useTools();
  const { data: servers, isLoading: loadingServers } = useMcpServers();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [familyFilter, setFamilyFilter] = useState("");
  const [reviewOnly, setReviewOnly] = useState(false);
  const [agentChoice, setAgentChoice] = useState("");
  const [serverFilter, setServerFilter] = useState("");
  const setAction = useSetToolAction();

  // Agents come from the policies: only concrete names, a glob is not an agent.
  const { data: policies } = usePolicies();
  const agents = useMemo(() => {
    const names = new Set<string>();
    for (const p of policies ?? []) {
      if (p.agent && !/[*?]/.test(p.agent)) names.add(p.agent);
    }
    return [...names].sort();
  }, [policies]);
  const agent = agentChoice || (agents.includes("claude") ? "claude" : agents[0] ?? "");
  const { data: decisions } = useToolDecisions(agent);
  const decisionByName = useMemo(() => {
    const m = new Map<string, ToolDecision>();
    for (const d of decisions ?? []) m.set(d.name, d);
    return m;
  }, [decisions]);

  const filtered = useMemo(() => {
    if (!tools) return [];
    return tools.filter((t) => {
      if (sourceFilter && t.source !== sourceFilter) return false;
      if (serverFilter && upstreamOf(t) !== serverFilter) return false;
      if (familyFilter && t.classification?.family !== familyFilter) return false;
      if (reviewOnly && !needsReview(t.classification, decisionByName.get(t.name))) return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase()) &&
          !t.description?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [tools, search, sourceFilter, serverFilter, familyFilter, reviewOnly, decisionByName]);

  // Per upstream, for the selected agent: what the policy does with its tools.
  const serverStats = useMemo(() => {
    const stats: Record<string, { allow: number; human_approval: number; deny: number; review: number }> = {};
    for (const t of tools ?? []) {
      const up = upstreamOf(t);
      if (!up) continue;
      const d = decisionByName.get(t.name);
      const st = (stats[up] ??= { allow: 0, human_approval: 0, deny: 0, review: 0 });
      if (d && d.action in st) st[d.action as "allow" | "human_approval" | "deny"]++;
      if (needsReview(t.classification, d)) st.review++;
    }
    return stats;
  }, [tools, decisionByName]);

  // Cards: the MCP servers mesh7 connects to, then one per CLI binary. CLI
  // tools are declared, not connected, so they have no live status.
  const upstreams = useMemo(() => {
    const cards = (servers ?? []).map((s) => ({
      name: s.name, transport: s.transport, status: s.status, count: s.tools.length,
    }));
    const bins: Record<string, number> = {};
    for (const t of tools ?? []) {
      if (t.source === "cli") bins[upstreamOf(t)] = (bins[upstreamOf(t)] || 0) + 1;
    }
    for (const [bin, count] of Object.entries(bins).sort()) {
      cards.push({ name: bin, transport: "cli", status: "declared", count });
    }
    return cards;
  }, [servers, tools]);

  const familyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tools ?? []) {
      const f = t.classification?.family;
      if (f) counts[f] = (counts[f] || 0) + 1;
    }
    return counts;
  }, [tools]);

  const reviewCount = useMemo(
    () => (tools ?? []).filter((t) => needsReview(t.classification, decisionByName.get(t.name))).length,
    [tools, decisionByName]
  );

  // Per upstream: how many of its tools are interpreters.
  const genericByServer = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tools ?? []) {
      const up = upstreamOf(t);
      if (up && t.classification?.family === "generic") {
        counts[up] = (counts[up] || 0) + 1;
      }
    }
    return counts;
  }, [tools]);

  const sourceCounts = useMemo(() => {
    if (!tools) return {};
    const counts: Record<string, number> = {};
    for (const t of tools) {
      counts[t.source] = (counts[t.source] || 0) + 1;
    }
    return counts;
  }, [tools]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
          <Wrench className="h-4 w-4 text-amber-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Tools</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {tools?.length ?? 0} registered tools
          </p>
        </div>
      </div>

      {/* MCP Servers status */}
      <div>
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Upstreams
        </span>
        <div className="mt-2 grid grid-cols-2 lg:grid-cols-4 gap-2">
          {loadingServers ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))
          ) : (
            upstreams.map((s) => (
              <button
                key={s.name}
                onClick={() => setServerFilter(serverFilter === s.name ? "" : s.name)}
                className={cn(
                  "rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/50",
                  serverFilter === s.name ? "border-primary" : "border-border"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">{s.name}</span>
                  </div>
                  <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      s.status === "ready" ? "bg-emerald-400" : s.status === "declared" ? "bg-muted-foreground" : "bg-red-400"
                    )} />
                    {s.status}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="font-mono">{s.transport}</span>
                  <span>·</span>
                  <span className="font-mono tabular-nums">{s.count} tools</span>
                  {genericByServer[s.name] ? (
                    <>
                      <span>·</span>
                      <span className="font-mono tabular-nums text-amber-400">
                        {genericByServer[s.name]} generic
                      </span>
                    </>
                  ) : null}
                </div>
                {serverStats[s.name] && (
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono tabular-nums">
                    <span className="text-emerald-400">{serverStats[s.name].allow} allow</span>
                    <span className="text-amber-400">{serverStats[s.name].human_approval} ask</span>
                    <span className="text-red-400">{serverStats[s.name].deny} deny</span>
                    {serverStats[s.name].review > 0 && (
                      <span className="ml-auto flex items-center gap-1 text-amber-400">
                        <TriangleAlert className="h-2.5 w-2.5" />
                        {serverStats[s.name].review}
                      </span>
                    )}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-background pl-9 pr-8 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {serverFilter && (
          <button
            onClick={() => setServerFilter("")}
            title="Clear the upstream filter"
            className="flex items-center gap-1.5 rounded-md border border-primary bg-primary/15 px-2.5 py-1 text-[11px] font-mono font-medium text-primary"
          >
            upstream: {serverFilter} <span aria-hidden>×</span>
          </button>
        )}
        <div className="flex items-center rounded-md border border-border overflow-hidden">
          <button
            onClick={() => setSourceFilter("")}
            className={cn(
              "px-2.5 py-1 text-[11px] font-mono font-medium transition-colors",
              !sourceFilter ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          {Object.entries(sourceCounts).map(([source, count]) => (
            <button
              key={source}
              onClick={() => setSourceFilter(sourceFilter === source ? "" : source)}
              className={cn(
                "px-2.5 py-1 text-[11px] font-mono font-medium transition-colors",
                sourceFilter === source ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {source} ({count})
            </button>
          ))}
        </div>
        <div className="flex items-center rounded-md border border-border overflow-hidden">
          <button
            onClick={() => setFamilyFilter("")}
            className={cn(
              "px-2.5 py-1 text-[11px] font-mono font-medium transition-colors",
              !familyFilter ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Any family
          </button>
          {Object.entries(familyCounts).map(([family, count]) => (
            <button
              key={family}
              onClick={() => setFamilyFilter(familyFilter === family ? "" : family)}
              className={cn(
                "px-2.5 py-1 text-[11px] font-mono font-medium transition-colors",
                familyFilter === family ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {family} ({count})
            </button>
          ))}
        </div>
        {agents.length > 0 && (
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            Decisions for
            <select
              value={agent}
              onChange={(e) => setAgentChoice(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {agents.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>
        )}
        <button
          onClick={() => setReviewOnly(!reviewOnly)}
          title="Allowed without being a plain named read: a write, a tool with no signal, or an interpreter"
          className={cn(
            "flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[11px] font-mono font-medium transition-colors",
            reviewOnly ? "bg-amber-500/15 text-amber-400" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <TriangleAlert className="h-3 w-3" />
          To review ({reviewCount})
        </button>
      </div>

      {setAction.isError && (
        <div className="flex items-center justify-between rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <span>{setAction.error.message}</span>
          <button onClick={() => setAction.reset()} className="text-red-300 hover:text-red-200">
            dismiss
          </button>
        </div>
      )}

      {/* Tool list */}
      {loadingTools ? (
        <TableSkeleton rows={10} cols={6} />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Tool
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Reading
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Decision
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Source
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Upstream
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Params
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const Icon = SOURCE_ICONS[t.source] ?? Wrench;
                const color = SOURCE_COLORS[t.source] ?? "bg-secondary text-muted-foreground border-border";
                const upstream = t.mcp_server || t.cli_meta?.bin || t.base_url || "-";
                const c = t.classification;
                const d = decisionByName.get(t.name);
                const conditional = d?.conditional ?? [];
                return (
                  <tr key={t.name} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-2.5">
                      <div>
                        <span className="font-mono text-xs">{t.name}</span>
                        {t.description && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-xs">
                            {t.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5" title={c?.reasons.join("\n")}>
                      {c ? (
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          {c.family === "generic" && (
                            <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-amber-400">
                              generic
                            </span>
                          )}
                          <span className={cn("text-[11px] font-mono", ACCESS_COLORS[c.access])}>
                            {c.access}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {d ? (
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <TriangleAlert className={cn("h-3 w-3 shrink-0 text-amber-400", !needsReview(c, d) && "invisible")} />
                          <select
                            value={d.action}
                            disabled={setAction.isPending}
                            aria-label={`Action for ${t.name}`}
                            onChange={(e) =>
                              setAction.mutate({ agent, tool: t.name, action: e.target.value as ToolAction })
                            }
                            className={cn(
                              "cursor-pointer appearance-none rounded border px-2 py-0.5 text-[10px] font-medium font-mono uppercase tracking-wider leading-none focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50",
                              ACTION_STYLES[d.action] ?? "bg-secondary text-muted-foreground border-border"
                            )}
                          >
                            <option value="allow">allow</option>
                            <option value="human_approval">approval</option>
                            <option value="deny">deny</option>
                            <option value="inherit">reset</option>
                          </select>
                          <span className="text-[10px] font-mono text-muted-foreground">{d.rule}</span>
                          {conditional.length > 0 && (
                            <span
                              className="text-[10px] font-mono text-sky-400"
                              title={conditional
                                .map((r) => `${r.action} if ${r.field} ${r.operator} (${r.rule})`)
                                .join("\n")}
                            >
                              +{conditional.length} if
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${color}`}>
                        <Icon className="h-2.5 w-2.5" />
                        {t.source}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {upstream}
                    </td>
                    <td className="px-4 py-2.5">
                      {(() => {
                        // Required params first; the rest fold into a count,
                        // listed in full on hover, so a wide tool stays one line.
                        const params = [...(t.params ?? [])].sort(
                          (a, b) => Number(b.required) - Number(a.required)
                        );
                        const shown = params.filter((p) => p.required).slice(0, 3);
                        const hidden = params.length - shown.length;
                        return (
                          <div
                            className="flex items-center gap-1 whitespace-nowrap"
                            title={params.map((p) => (p.required ? p.name : `${p.name}?`)).join("\n")}
                          >
                            {shown.map((p) => (
                              <span key={p.name} className="text-[10px] font-mono text-foreground bg-secondary/60 rounded px-1.5 py-0.5">
                                {p.name}
                              </span>
                            ))}
                            {hidden > 0 && (
                              <span className="text-[10px] font-mono text-muted-foreground">
                                +{hidden}
                              </span>
                            )}
                            {params.length === 0 && (
                              <span className="text-[10px] text-muted-foreground">-</span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No tools found
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

"use client";

import { useMemo, useState } from "react";
import { useTools, useMcpServers } from "@/lib/hooks/use-mesh";
import { TableSkeleton, Skeleton } from "@/components/ui/skeleton";
import { Search, Wrench, Server, Terminal, Globe } from "lucide-react";
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

export default function ToolsPage() {
  const { data: tools, isLoading: loadingTools } = useTools();
  const { data: servers, isLoading: loadingServers } = useMcpServers();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const filtered = useMemo(() => {
    if (!tools) return [];
    return tools.filter((t) => {
      if (sourceFilter && t.source !== sourceFilter) return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase()) &&
          !t.description?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tools, search, sourceFilter]);

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
          Upstream servers
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
            (servers ?? []).map((s) => (
              <div key={s.name} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">{s.name}</span>
                  </div>
                  <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      s.status === "ready" ? "bg-emerald-400" : "bg-red-400"
                    )} />
                    {s.status}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="font-mono">{s.transport}</span>
                  <span>·</span>
                  <span className="font-mono tabular-nums">{s.tools.length} tools</span>
                </div>
              </div>
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
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
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
      </div>

      {/* Tool list */}
      {loadingTools ? (
        <TableSkeleton rows={10} cols={4} />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Tool
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
                return (
                  <tr key={t.name} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-2.5">
                      <div>
                        <span className="font-mono text-xs">{t.name}</span>
                        {t.description && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-md">
                            {t.description}
                          </p>
                        )}
                      </div>
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
                      <div className="flex flex-wrap gap-1">
                        {(t.params ?? []).filter((p) => p.required).map((p) => (
                          <span key={p.name} className="text-[10px] font-mono text-foreground bg-secondary/60 rounded px-1.5 py-0.5">
                            {p.name}
                          </span>
                        ))}
                        {(t.params ?? []).filter((p) => !p.required).map((p) => (
                          <span key={p.name} className="text-[10px] font-mono text-muted-foreground bg-secondary/30 rounded px-1.5 py-0.5">
                            {p.name}?
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">
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

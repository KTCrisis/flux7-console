"use client";

import { useMemo, useState, useEffect } from "react";
import { usePolicies, usePolicyYaml, useSavePolicyYaml } from "@/lib/hooks/use-mesh";
import { PolicyBadge } from "@/components/ui/policy-badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  FileText,
  ChevronDown,
  ChevronRight,
  Search,
  Pencil,
  Save,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "policy" | "tool";

export default function PoliciesPage() {
  const { data: policies, isLoading } = usePolicies();
  const [tab, setTab] = useState<Tab>("policy");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  const { data: yamlContent } = usePolicyYaml(editing);
  const save = useSavePolicyYaml();

  useEffect(() => {
    if (yamlContent !== undefined) setDraft(yamlContent);
  }, [yamlContent]);

  useEffect(() => {
    if (saveStatus !== "idle") {
      const t = setTimeout(() => setSaveStatus("idle"), 2000);
      return () => clearTimeout(t);
    }
  }, [saveStatus]);

  function toggle(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function openEditor(name: string) {
    setEditing(name);
    setDraft("");
    setSaveStatus("idle");
  }

  function closeEditor() {
    setEditing(null);
    setDraft("");
    setSaveStatus("idle");
  }

  function handleSave() {
    if (!editing || !draft.trim()) return;
    save.mutate(
      { name: editing, content: draft },
      {
        onSuccess: () => setSaveStatus("saved"),
        onError: () => setSaveStatus("error"),
      }
    );
  }

  const stats = useMemo(() => {
    if (!policies) return { total: 0, allow: 0, deny: 0, approval: 0, rules: 0 };
    let allow = 0, deny = 0, approval = 0, rules = 0;
    for (const p of policies) {
      for (const r of p.rules) {
        rules++;
        if (r.action === "allow") allow++;
        else if (r.action === "deny") deny++;
        else if (r.action === "human_approval") approval++;
      }
    }
    return { total: policies.length, allow, deny, approval, rules };
  }, [policies]);

  const toolMatrix = useMemo(() => {
    if (!policies) return [];
    const map = new Map<string, { tool: string; entries: { agent: string; action: string }[] }>();
    for (const p of policies) {
      for (const r of p.rules) {
        for (const t of r.tools) {
          if (!map.has(t)) map.set(t, { tool: t, entries: [] });
          map.get(t)!.entries.push({ agent: p.agent, action: r.action });
        }
      }
    }
    const rows = Array.from(map.values());
    rows.sort((a, b) => a.tool.localeCompare(b.tool));
    return rows;
  }, [policies]);

  const filteredMatrix = useMemo(() => {
    if (!search) return toolMatrix;
    const q = search.toLowerCase();
    return toolMatrix.filter(
      (r) => r.tool.toLowerCase().includes(q) || r.entries.some((e) => e.agent.toLowerCase().includes(q))
    );
  }, [toolMatrix, search]);

  const filteredPolicies = useMemo(() => {
    if (!policies || !search) return policies ?? [];
    const q = search.toLowerCase();
    return policies.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.agent.toLowerCase().includes(q) ||
        p.rules.some((r) => r.tools.some((t) => t.toLowerCase().includes(q)))
    );
  }, [policies, search]);

  const isDirty = yamlContent !== undefined && draft !== yamlContent;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
          <FileText className="h-4 w-4 text-amber-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Policies</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {stats.total} polic{stats.total !== 1 ? "ies" : "y"} &middot; {stats.rules} rules
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Policies", value: stats.total, color: "text-amber-400", border: "border-amber-500/30" },
          { label: "Allow rules", value: stats.allow, color: "text-emerald-400", border: "border-emerald-500/30" },
          { label: "Deny rules", value: stats.deny, color: "text-red-400", border: "border-red-500/30" },
          { label: "Approval rules", value: stats.approval, color: "text-amber-400", border: "border-amber-500/30" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className={cn("rounded-lg border bg-card px-4 py-3", kpi.border)}
          >
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              {kpi.label}
            </div>
            <div className={cn("text-2xl font-semibold tabular-nums mt-1", kpi.color)}>
              {isLoading ? "-" : kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs + search */}
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-md border border-border overflow-hidden">
          {(["policy", "tool"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-3 py-1.5 text-[11px] font-mono font-medium transition-colors capitalize",
                tab === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              By {t}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder={tab === "policy" ? "Search policies or tools..." : "Search tool patterns..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* YAML Editor */}
      {editing && (
        <div className="rounded-lg border border-primary/20 bg-primary/[0.03] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-primary/10">
            <div className="flex items-center gap-2">
              <Pencil className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-medium">{editing}.yaml</span>
              {isDirty && (
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 rounded px-1.5 py-0.5">
                  modified
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                  <Check className="h-3 w-3" />
                  saved &middot; hot-reload
                </span>
              )}
              {saveStatus === "error" && (
                <span className="text-[10px] font-mono text-red-400">
                  save failed
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={!isDirty || save.isPending}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {save.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
                Save
              </button>
              <button
                onClick={closeEditor}
                className="flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            className="w-full bg-transparent text-xs font-mono text-foreground px-4 py-3 focus:outline-none resize-y min-h-[200px] max-h-[600px] leading-relaxed"
            rows={Math.min(30, Math.max(10, draft.split("\n").length + 2))}
          />
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <TableSkeleton rows={6} cols={3} />
      ) : tab === "policy" ? (
        <div className="space-y-2">
          {filteredPolicies.length === 0 ? (
            <div className="rounded-lg border border-border bg-card py-12 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No policies found</p>
            </div>
          ) : (
            filteredPolicies.map((p) => {
              const isOpen = expanded.has(p.name);
              const isEditing = editing === p.name;
              const actionCounts = { allow: 0, deny: 0, human_approval: 0 };
              for (const r of p.rules) {
                if (r.action in actionCounts) actionCounts[r.action as keyof typeof actionCounts]++;
              }
              return (
                <div key={p.name} className={cn(
                  "rounded-lg border bg-card overflow-hidden",
                  isEditing ? "border-primary/30" : "border-border"
                )}>
                  <div className="flex items-center">
                    <button
                      onClick={() => toggle(p.name)}
                      className="flex-1 px-4 py-3 flex items-center gap-3 hover:bg-secondary/20 transition-colors"
                    >
                      {isOpen ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">{p.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        agent: {p.agent}
                      </span>
                    </button>
                    <div className="flex items-center gap-2 px-4">
                      <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                        {p.rules.length} rule{p.rules.length !== 1 ? "s" : ""}
                      </span>
                      <div className="flex gap-1">
                        {actionCounts.allow > 0 && (
                          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-mono tabular-nums bg-emerald-500/10 text-emerald-400">
                            {actionCounts.allow}
                          </span>
                        )}
                        {actionCounts.human_approval > 0 && (
                          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-mono tabular-nums bg-amber-500/10 text-amber-400">
                            {actionCounts.human_approval}
                          </span>
                        )}
                        {actionCounts.deny > 0 && (
                          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-mono tabular-nums bg-red-500/10 text-red-400">
                            {actionCounts.deny}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => isEditing ? closeEditor() : openEditor(p.name)}
                        className={cn(
                          "flex items-center justify-center h-7 w-7 rounded transition-colors",
                          isEditing
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                        )}
                        title="Edit YAML"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="border-t border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-secondary/20">
                            <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider w-12">
                              #
                            </th>
                            <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                              Tool patterns
                            </th>
                            <th className="px-4 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider w-28">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.rules.map((r, i) => (
                            <tr key={i} className="border-t border-border/20">
                              <td className="px-4 py-2 text-[10px] font-mono text-muted-foreground tabular-nums">
                                {i + 1}
                              </td>
                              <td className="px-4 py-2">
                                <div className="flex flex-wrap gap-1">
                                  {r.tools.map((t) => (
                                    <span
                                      key={t}
                                      className="font-mono text-xs bg-secondary/60 text-foreground rounded px-1.5 py-0.5"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-2 text-right">
                                <PolicyBadge policy={r.action} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Tool pattern
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-28">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMatrix.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No tool patterns found
                  </td>
                </tr>
              ) : (
                filteredMatrix.map((row) =>
                  row.entries.map((entry, i) => (
                    <tr
                      key={`${row.tool}-${entry.agent}-${i}`}
                      className="border-b border-border/30 hover:bg-secondary/20 transition-colors"
                    >
                      {i === 0 ? (
                        <td
                          className="px-4 py-2.5 font-mono text-xs align-top"
                          rowSpan={row.entries.length}
                        >
                          {row.tool}
                        </td>
                      ) : null}
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                        {entry.agent}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <PolicyBadge policy={entry.action} />
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

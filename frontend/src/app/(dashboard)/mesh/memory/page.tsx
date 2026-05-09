"use client";

import { useState } from "react";
import { AlertTriangle, Brain, Search, Tag, User, Clock, Plus, Trash2, Save, X } from "lucide-react";
import { useDebouncedValue } from "@/lib/hooks/use-debounce";
import { cn, timeAgo } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMem7Health,
  useMem7Info,
  useMemories,
  useMemoryDetail,
  useMemorySearch,
  useStoreMemory,
  useForgetMemory,
} from "@/lib/hooks/use-mem7";

export default function MemoryPage() {
  const { data: health, error: healthError } = useMem7Health();
  const { data: info } = useMem7Info();
  const [agentFilter, setAgentFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebouncedValue(searchQuery, 300);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);

  const isSearchMode = debouncedQuery.length >= 2;

  const {
    data: memories,
    error: listError,
    isLoading: isLoadingMemories,
  } = useMemories(
    agentFilter ? { agent: agentFilter } : undefined
  );

  const { data: searchResults } = useMemorySearch(debouncedQuery, {
    agent: agentFilter || undefined,
    limit: 20,
  });

  const { data: detail } = useMemoryDetail(selectedKey);
  const store = useStoreMemory();
  const forget = useForgetMemory();

  const displayItems = isSearchMode ? searchResults : memories;
  const error = healthError || listError;

  const agents = Array.from(
    new Set((memories ?? []).map((m) => m.agent).filter(Boolean))
  ).sort();

  const allTags = Array.from(
    new Set((memories ?? []).flatMap((m) => m.tags))
  ).sort();

  function handleDelete(key: string) {
    forget.mutate(
      { key },
      { onSuccess: () => setSelectedKey(null) }
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
            <Brain className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Memory</h1>
            <p className="text-xs text-muted-foreground">
              mem7 {info?.serverInfo?.version ?? ""} — {memories?.length ?? 0} entries
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowForm(!showForm); setEditing(false); }}
            className="flex items-center gap-1.5 rounded-md bg-violet-500/15 text-violet-400 px-3 py-1.5 text-xs font-medium hover:bg-violet-500/25 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
          <div className="text-xs text-muted-foreground">
            {health ? (
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                {error ? "Disconnected" : "Connecting..."}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">
            Cannot reach mem7. Make sure <code className="text-xs bg-red-500/20 px-1 rounded">mem7 serve</code> is running on port 9070.
          </p>
        </div>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <MemoryForm
          initialKey={editing && detail ? detail.key : ""}
          initialValue={editing && detail ? detail.value : ""}
          initialTags={editing && detail ? detail.tags : []}
          initialAgent={editing && detail ? detail.agent : ""}
          onSave={(opts) => {
            store.mutate(opts, {
              onSuccess: () => {
                setShowForm(false);
                setEditing(false);
                setSelectedKey(opts.key);
              },
            });
          }}
          onCancel={() => { setShowForm(false); setEditing(false); }}
          isPending={store.isPending}
          isEdit={editing}
        />
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search memories (FTS5)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedKey(null);
            }}
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="">All agents</option>
          {agents.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {/* Tag pills */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-xs text-violet-300 cursor-pointer hover:bg-violet-500/20 transition-colors"
              onClick={() => setSearchQuery(tag)}
            >
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Content: list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* List */}
        <div className="lg:col-span-1 space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto">
          {isSearchMode && (
            <p className="text-xs text-muted-foreground px-2 py-1">
              {searchResults?.length ?? 0} results for &quot;{debouncedQuery}&quot;
            </p>
          )}
          {isLoadingMemories && !isSearchMode && (
            <div className="space-y-2 px-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-md px-3 py-2.5 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          )}
          {(displayItems ?? []).map((item) => (
            <button
              key={item.key}
              onClick={() => setSelectedKey(item.key)}
              className={cn(
                "w-full text-left rounded-md px-3 py-2.5 transition-colors",
                selectedKey === item.key
                  ? "bg-secondary border border-border"
                  : "hover:bg-secondary/50"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">{item.key}</span>
                {item.updated && (
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {timeAgo(item.updated)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {item.agent && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-2.5 w-2.5" />
                    {item.agent}
                  </span>
                )}
                {item.tags.length > 0 && (
                  <span className="text-xs text-muted-foreground truncate">
                    {item.tags.join(", ")}
                  </span>
                )}
              </div>
            </button>
          ))}
          {displayItems?.length === 0 && !error && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {isSearchMode ? "No results" : "No memories stored"}
            </p>
          )}
        </div>

        {/* Detail */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card min-h-[300px]">
          {detail ? (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">{detail.key}</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditing(true); setShowForm(true); }}
                    className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                  >
                    <Save className="h-3 w-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(detail.key)}
                    disabled={forget.isPending}
                    className="flex items-center gap-1 rounded-md border border-red-500/20 bg-red-500/5 px-2 py-1 text-[11px] text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                  <div className="flex items-center gap-3 ml-2 text-xs text-muted-foreground">
                    {detail.agent && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {detail.agent}
                      </span>
                    )}
                    {detail.updated && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeAgo(detail.updated)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {detail.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {detail.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-xs text-violet-300"
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="rounded-md bg-background border border-border p-3">
                <pre className="text-sm text-foreground whitespace-pre-wrap break-words font-mono leading-relaxed">
                  {detail.value}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[300px] text-muted-foreground text-sm">
              Select a memory to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MemoryForm({
  initialKey,
  initialValue,
  initialTags,
  initialAgent,
  onSave,
  onCancel,
  isPending,
  isEdit,
}: {
  initialKey: string;
  initialValue: string;
  initialTags: string[];
  initialAgent: string;
  onSave: (opts: { key: string; value: string; tags?: string[]; agent?: string }) => void;
  onCancel: () => void;
  isPending: boolean;
  isEdit: boolean;
}) {
  const [key, setKey] = useState(initialKey);
  const [value, setValue] = useState(initialValue);
  const [tagsStr, setTagsStr] = useState(initialTags.join(", "));
  const [agent, setAgent] = useState(initialAgent);

  function handleSubmit() {
    if (!key || !value) return;
    const tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
    onSave({ key, value, tags: tags.length ? tags : undefined, agent: agent || undefined });
  }

  return (
    <div className="rounded-lg border border-violet-500/20 bg-violet-500/[0.03] p-4 space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Key</label>
          <input
            type="text"
            placeholder="e.g. project-config"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            disabled={isEdit}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Tags (comma-separated)</label>
          <input
            type="text"
            placeholder="e.g. config, infra"
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
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
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Value</label>
        <textarea
          placeholder="Memory content..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={5}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={!key || !value || isPending}
          className="flex items-center gap-1.5 rounded-md bg-violet-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
        >
          <Save className="h-3 w-3" />
          {isEdit ? "Update" : "Store"}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2"
        >
          <X className="h-3 w-3" />
          Cancel
        </button>
      </div>
    </div>
  );
}

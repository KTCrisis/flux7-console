"use client";

import { useTraceWhy } from "@/lib/hooks/use-mesh";
import type { TraceEntry } from "@/lib/api/mesh";
import { PolicyBadge } from "@/components/ui/policy-badge";
import { formatDuration } from "@/lib/utils";

// "Why was this allowed?" for a call a temporal grant let through: the chain
// from the decision that created the grant down to this call, oldest first,
// as mesh7 walks it (GET /traces/{id}/why).
export function WhyChain({ trace }: { trace: TraceEntry }) {
  const lineage = !!(trace.grant_id || trace.parent_trace_id);
  const { data, isLoading, error } = useTraceWhy(lineage ? trace.trace_id : null);

  if (!lineage) return null;

  const chain = data?.chain ?? [];
  // The chain stops early when the originating call left the store (evicted
  // or rotated out): say so rather than present this call as a root.
  const truncated =
    !!trace.parent_trace_id &&
    chain.length > 0 &&
    !chain.some((e) => e.trace_id === trace.parent_trace_id);

  return (
    <div className="col-span-2 space-y-2">
      <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
        Chain of authority
      </span>

      {isLoading && <p className="text-xs text-muted-foreground">Walking the chain…</p>}
      {error instanceof Error && (
        <p className="text-xs text-destructive">{error.message}</p>
      )}

      {data && (
        <ol className="relative ml-1.5 border-l border-border pl-4 space-y-3">
          {truncated && (
            <li className="text-xs text-muted-foreground">
              <Dot muted />
              Originating call{" "}
              <code className="font-mono text-[11px]">{trace.parent_trace_id!.slice(0, 12)}</code>{" "}
              is no longer in the trace store (evicted or rotated out).
            </li>
          )}
          {chain.map((e, i) => (
            <ChainStep
              key={`${e.trace_id}-${e.span_id ?? i}`}
              entry={e}
              current={i === chain.length - 1}
            />
          ))}
          {trace.grant_id && !trace.parent_trace_id && (
            <li className="text-xs text-muted-foreground">
              <Dot muted />
              Grant <code className="font-mono text-[11px]">{trace.grant_id}</code> was issued
              without an origin: no decision is recorded behind it.
            </li>
          )}
        </ol>
      )}
    </div>
  );
}

function ChainStep({ entry, current }: { entry: TraceEntry; current: boolean }) {
  const approval = entry.policy === "human_approval" && entry.approval_status;
  return (
    <li className="text-xs">
      <Dot current={current} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{entry.agent_id}</span>
        <span className="font-mono text-[11px] text-muted-foreground">{entry.tool}</span>
        <PolicyBadge policy={entry.policy} />
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {new Date(entry.timestamp).toLocaleString()}
        </span>
        {current && (
          <span className="text-[10px] uppercase tracking-wider text-primary">this call</span>
        )}
      </div>
      <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
        {approval && (
          <p>
            {entry.approval_status}
            {entry.approved_by ? ` by ${entry.approved_by}` : ""}
            {entry.approval_ms > 0 ? ` after ${formatDuration(entry.approval_ms)}` : ""}
            {entry.supervisor_confidence
              ? ` · confidence ${Math.round(entry.supervisor_confidence * 100)}%`
              : ""}
          </p>
        )}
        {entry.supervisor_reasoning && (
          <p className="italic">&ldquo;{entry.supervisor_reasoning}&rdquo;</p>
        )}
        {entry.grant_id && (
          <p>
            let through by grant <code className="font-mono">{entry.grant_id}</code>
          </p>
        )}
        {!approval && !entry.grant_id && entry.policy_rule && <p>rule {entry.policy_rule}</p>}
      </div>
    </li>
  );
}

function Dot({ current, muted }: { current?: boolean; muted?: boolean }) {
  const color = current ? "bg-primary" : muted ? "bg-border" : "bg-muted-foreground";
  return (
    <span
      aria-hidden
      className={`absolute -left-[5px] mt-1 h-2 w-2 rounded-full ${color}`}
    />
  );
}

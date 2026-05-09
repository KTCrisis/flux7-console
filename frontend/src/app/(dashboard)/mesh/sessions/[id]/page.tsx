"use client";

import { use } from "react";
import { useSessionEvents } from "@/lib/hooks/use-mesh";
import { formatDuration, timeAgo } from "@/lib/utils";
import { PolicyBadge } from "@/components/ui/policy-badge";
import { Stat } from "@/components/ui/stat";
import { KPISkeleton, TableSkeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: rawEvents, isLoading } = useSessionEvents(id, { limit: 500 });
  const events = rawEvents ?? [];

  const totalTokens = events.reduce(
    (s, e) => s + e.estimated_input_tokens + e.estimated_output_tokens,
    0
  );
  const totalLatency = events.reduce((s, e) => s + e.latency_ms, 0);
  const uniqueTools = [...new Set(events.map((e) => e.tool))];
  const denied = events.filter((e) => e.policy === "deny").length;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Link
            href="/mesh/sessions"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Sessions
          </Link>
          <span className="text-xs text-muted-foreground">/</span>
          <h2 className="text-xl font-semibold font-mono">{id.slice(0, 12)}</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 font-mono">{id}</p>
      </div>

      {/* Stats row */}
      {isLoading ? (
        <KPISkeleton count={5} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat label="Events" value={events.length} />
          <Stat label="Tools" value={uniqueTools.length} />
          <Stat label="Denied" value={denied} accent={denied > 0} />
          <Stat label="Total latency" value={formatDuration(totalLatency)} />
          <Stat
            label="Tokens"
            value={totalTokens > 0 ? totalTokens.toLocaleString() : "-"}
          />
        </div>
      )}

      {/* Tools used */}
      {uniqueTools.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {uniqueTools.map((t) => (
            <span
              key={t}
              className="inline-flex rounded border border-border bg-secondary/40 px-2 py-0.5 text-[11px] font-mono text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Event timeline */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                #
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Tool
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Policy
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Latency
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Tokens
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Time
              </th>
            </tr>
          </thead>
          <tbody>
            {events.map((e, i) => (
              <tr
                key={e.trace_id}
                className="border-b border-border/30 hover:bg-secondary/20 transition-colors"
              >
                <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                  {i + 1}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                  {e.tool}
                </td>
                <td className="px-4 py-2.5">
                  <PolicyBadge policy={e.policy} />
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                  {formatDuration(e.latency_ms)}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                  {e.estimated_input_tokens + e.estimated_output_tokens > 0
                    ? `${e.estimated_input_tokens} / ${e.estimated_output_tokens}`
                    : "-"}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {timeAgo(e.timestamp)}
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  No events in this session
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

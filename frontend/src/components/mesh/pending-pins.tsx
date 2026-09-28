"use client";

import { Pin, Check } from "lucide-react";
import type { PendingPin } from "@/lib/api/mesh";
import { useAcceptPins } from "@/lib/hooks/use-mesh";

// Upstream tools held back by pin_tools: a tool the server added (denied)
// or changed (asks for approval) since its catalogue was accepted. Shows
// what changed and lets an admin accept the current version.
export function PendingPins({ pins, canAccept }: { pins: PendingPin[]; canAccept: boolean }) {
  const accept = useAcceptPins();
  if (pins.length === 0) return null;

  const byServer = new Map<string, PendingPin[]>();
  for (const p of pins) byServer.set(p.server, [...(byServer.get(p.server) ?? []), p]);

  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/[0.04]">
      <div className="flex items-center gap-2 border-b border-red-500/20 px-4 py-2.5">
        <Pin className="h-3.5 w-3.5 text-red-400" />
        <span className="text-xs font-medium text-red-300">
          {pins.length} upstream tool{pins.length > 1 ? "s" : ""} held back since the catalogue was pinned
        </span>
        <span className="text-[11px] text-muted-foreground">
          new: denied · changed: asks for approval, whatever the policy says
        </span>
      </div>
      {accept.isError && (
        <div className="px-4 py-2 text-xs text-red-400">{accept.error.message}</div>
      )}
      {[...byServer.entries()].map(([server, list]) => (
        <div key={server} className="border-b border-border/30 px-4 py-3 last:border-b-0">
          <div className="mb-2 flex items-center gap-2">
            <span className="font-mono text-xs text-foreground">{server}</span>
            {canAccept && list.length > 1 && (
              <button
                onClick={() => accept.mutate({ server })}
                disabled={accept.isPending}
                className="ml-auto rounded border border-border px-2 py-0.5 text-[10px] font-mono text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                accept all {list.length}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {list.map((p) => (
              <div key={p.tool} className="grid grid-cols-[auto_1fr_auto] items-start gap-3">
                <span
                  className={
                    p.status === "new"
                      ? "rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-mono uppercase text-red-400"
                      : "rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-mono uppercase text-amber-400"
                  }
                >
                  {p.status}
                </span>
                <div className="min-w-0 space-y-1">
                  <span className="font-mono text-xs">{p.tool}</span>
                  {p.status === "changed" && (
                    <p className="text-[11px] text-muted-foreground line-through decoration-red-400/60">
                      {p.pinned_description || "(empty description)"}
                    </p>
                  )}
                  <p className="text-[11px] text-foreground/80">{p.current_description || "(empty description)"}</p>
                </div>
                {canAccept && (
                  <button
                    onClick={() => accept.mutate({ tools: [p.tool] })}
                    disabled={accept.isPending}
                    className="flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    <Check className="h-3 w-3" /> accept
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

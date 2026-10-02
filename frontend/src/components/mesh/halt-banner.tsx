"use client";

import Link from "next/link";
import { OctagonX } from "lucide-react";
import { useHalts } from "@/lib/hooks/use-mesh";
import { describeHalt } from "@/lib/api/mesh";
import { timeAgo } from "@/lib/utils";

// Shown on every page while an emergency stop is in force: an operator must
// not forget that agents are stopped, nor wonder why calls fail.
export function HaltBanner() {
  const { data: halts } = useHalts();
  if (!halts || halts.length === 0) return null;
  const first = halts.find((h) => h.scope === "all") ?? halts[0];
  const more = halts.length - 1;
  return (
    <div className="mb-5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 flex flex-wrap items-center gap-3 text-sm">
      <OctagonX className="h-4 w-4 text-red-400 shrink-0" />
      <span className="font-semibold text-red-300">Emergency stop in force</span>
      <span className="text-red-200/80">
        {describeHalt(first)}, since {timeAgo(first.created_at)}
        {first.reason ? `: ${first.reason}` : ""}
        {more > 0 ? ` (+${more} more)` : ""}
      </span>
      <Link href="/mesh/halts" className="ml-auto text-xs font-medium text-red-300 underline underline-offset-2 hover:text-red-200">
        Manage
      </Link>
    </div>
  );
}

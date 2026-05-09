"use client";

import { cn } from "@/lib/utils";

export const TIME_RANGES = [
  { label: "5m", ms: 5 * 60 * 1000 },
  { label: "15m", ms: 15 * 60 * 1000 },
  { label: "1h", ms: 60 * 60 * 1000 },
  { label: "24h", ms: 24 * 60 * 60 * 1000 },
  { label: "All", ms: 0 },
] as const;

export type TimeRangeMs = (typeof TIME_RANGES)[number]["ms"];

export function TimeRangeToggle({
  value,
  onChange,
}: {
  value: TimeRangeMs;
  onChange: (ms: TimeRangeMs) => void;
}) {
  return (
    <div className="flex items-center rounded-md border border-border overflow-hidden">
      {TIME_RANGES.map(({ label, ms }) => (
        <button
          key={label}
          onClick={() => onChange(ms)}
          className={cn(
            "px-2.5 py-1 text-[11px] font-mono font-medium transition-colors",
            ms === value
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function filterByTimeRange<T>(
  items: T[],
  getTimestamp: (item: T) => string,
  rangeMs: TimeRangeMs
): T[] {
  if (rangeMs === 0) return items;
  const cutoff = Date.now() - rangeMs;
  return items.filter((item) => new Date(getTimestamp(item)).getTime() >= cutoff);
}

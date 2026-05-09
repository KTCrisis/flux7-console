import type React from "react";

export function KPI({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  accent?: "primary";
}) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className={`h-0.5 ${accent === "primary" ? "bg-primary shadow-[0_0_8px_rgba(34,211,238,0.3)]" : "bg-border"}`} />
      <div className="px-4 py-3">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          <span className="text-[11px] uppercase tracking-wider font-medium">{label}</span>
        </div>
        <p
          className={`mt-1 text-2xl font-semibold tabular-nums font-mono ${
            accent === "primary" ? "text-primary" : ""
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className={`h-0.5 ${accent ? "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.3)]" : "bg-border"}`} />
      <div className="px-3 py-2">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <p
          className={`text-lg font-semibold tabular-nums font-mono ${accent ? "text-red-400" : ""}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

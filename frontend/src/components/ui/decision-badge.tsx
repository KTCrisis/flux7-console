const styles: Record<string, string> = {
  approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  denied: "bg-red-500/10 text-red-400 border-red-500/20",
  timeout: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

export function DecisionBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-medium font-mono uppercase tracking-wider leading-none ${
        styles[status] || "bg-secondary text-muted-foreground border-border"
      }`}
    >
      {status}
    </span>
  );
}

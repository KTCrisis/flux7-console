const styles: Record<string, string> = {
  allow: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  deny: "bg-red-500/10 text-red-400 border-red-500/20",
  human_approval: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export function PolicyBadge({ policy }: { policy: string }) {
  return (
    <span
      className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-medium font-mono uppercase tracking-wider leading-none ${
        styles[policy] || "bg-secondary text-muted-foreground border-border"
      }`}
    >
      {policy === "human_approval" ? "approval" : policy}
    </span>
  );
}

export function PolicyMini({ policy }: { policy: string }) {
  const color =
    policy === "allow"
      ? "text-emerald-400"
      : policy === "deny"
        ? "text-red-400"
        : "text-amber-400";
  return <span className={`text-[10px] font-mono uppercase tracking-wider ${color}`}>{policy}</span>;
}

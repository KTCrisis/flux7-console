export function StatusCode({ code, error }: { code: number; error: string }) {
  const color = error
    ? "text-red-400"
    : code >= 200 && code < 300
      ? "text-emerald-400"
      : code >= 400
        ? "text-red-400"
        : "text-muted-foreground";
  return <span className={`text-xs tabular-nums font-mono font-medium ${color}`}>{code}</span>;
}

export function OtelStatusBadge({ code, message }: { code: number; message: string }) {
  const label = code === 2 ? "error" : code === 1 ? "ok" : "unset";
  const color =
    code === 2
      ? "text-red-400"
      : code === 1
        ? "text-emerald-400"
        : "text-muted-foreground";
  return (
    <span
      className={`text-xs font-mono font-medium uppercase tracking-wider ${color}`}
      title={message || undefined}
    >
      {label}
    </span>
  );
}

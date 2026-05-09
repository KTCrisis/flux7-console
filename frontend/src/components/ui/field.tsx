export function Field({
  label,
  value,
  mono,
  error,
}: {
  label: string;
  value: string;
  mono?: boolean;
  error?: boolean;
}) {
  return (
    <div>
      <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
        {label}
      </span>
      <p
        className={`mt-0.5 ${mono ? "font-mono text-[11px] break-all" : "text-xs"} ${error ? "text-destructive" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

"use client";

import { useTraceVerify } from "@/lib/hooks/use-mesh";
import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";

// State of the hash chain over mesh7's trace file. Intact means every line
// since the chain started is present, in order and unaltered; with HMAC,
// rewriting it would have needed mesh7's key.
export function IntegrityBadge() {
  const { data, error, isLoading } = useTraceVerify();
  if (isLoading) return null;

  if (error || !data) {
    return <Pill tone="muted" icon={ShieldQuestion} label="Integrity check unavailable" title={error instanceof Error ? error.message : undefined} />;
  }
  if (!data.persistent) {
    return <Pill tone="muted" icon={ShieldQuestion} label="In-memory traces · no chain" />;
  }
  if (data.break) {
    const b = data.break;
    const file = b.file.split("/").pop();
    return (
      <Pill
        tone="bad"
        icon={ShieldAlert}
        label={`Chain broken at ${file}:${b.line}`}
        detail={b.reason}
        title={`seq ${b.seq ?? "?"} · checked ${new Date(data.verified_at).toLocaleTimeString()}`}
      />
    );
  }
  if (data.chained === 0) {
    return <Pill tone="muted" icon={ShieldQuestion} label="No chained line yet" />;
  }
  const alg = data.alg === "hmac-sha256" ? "HMAC" : "SHA-256, no key";
  return (
    <Pill
      tone={data.alg === "hmac-sha256" ? "good" : "warn"}
      icon={ShieldCheck}
      label={`Chain intact · seq ${data.first_seq}→${data.last_seq}`}
      detail={alg}
      title={[
        `head ${data.head}`,
        data.unchained ? `${data.unchained} lines written before the chain` : "",
        `checked ${new Date(data.verified_at).toLocaleTimeString()}`,
      ].filter(Boolean).join("\n")}
    />
  );
}

const tones = {
  good: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  warn: "border-amber-500/25 bg-amber-500/10 text-amber-400",
  bad: "border-red-500/30 bg-red-500/10 text-red-400",
  muted: "border-border bg-secondary/30 text-muted-foreground",
};

function Pill({
  tone,
  icon: Icon,
  label,
  detail,
  title,
}: {
  tone: keyof typeof tones;
  icon: typeof ShieldCheck;
  label: string;
  detail?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium ${tones[tone]}`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="tabular-nums">{label}</span>
      {detail && <span className="font-normal opacity-75">· {detail}</span>}
    </span>
  );
}

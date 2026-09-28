"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Traces and OTEL show the same calls: one as decisions (policy, session,
// approval), the other as OTLP spans with durations and tokens. They share
// one sidebar entry and switch here.
const TABS = [
  { href: "/mesh/traces", label: "Calls" },
  { href: "/mesh/otel", label: "Spans (OTLP)" },
];

export function TraceTabs() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-1 border-b border-border">
      {TABS.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "-mb-px border-b-2 px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

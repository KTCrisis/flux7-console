"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Activity, Shield, LayoutDashboard, Radio, GitBranch, Users, Brain, Wrench, Key } from "lucide-react";
import { useHealth, useApprovals } from "@/lib/hooks/use-mesh";

const nav = [
  { href: "/mesh", label: "Overview", icon: LayoutDashboard },
  { href: "/mesh/tools", label: "Tools", icon: Wrench },
  { href: "/mesh/traces", label: "Traces", icon: Activity },
  { href: "/mesh/sessions", label: "Sessions", icon: Users },
  { href: "/mesh/otel", label: "OTEL", icon: GitBranch },
  { href: "/mesh/approvals", label: "Approvals", icon: Shield, badge: "approvals" as const },
  { href: "/mesh/grants", label: "Grants", icon: Key },
  { href: "/mesh/memory", label: "Memory", icon: Brain },
];

function useFreshnessLabel(dataUpdatedAt: number | undefined) {
  const [label, setLabel] = useState("");
  const [fresh, setFresh] = useState(false);

  const update = useCallback(() => {
    if (!dataUpdatedAt) { setLabel(""); return; }
    const ago = Math.floor((Date.now() - dataUpdatedAt) / 1000);
    setLabel(ago < 2 ? "now" : `${ago}s ago`);
    setFresh(ago < 2);
  }, [dataUpdatedAt]);

  useEffect(() => {
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [update]);

  return { label, fresh };
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: health, dataUpdatedAt } = useHealth();
  const { data: rawApprovals } = useApprovals();
  const pendingCount = (rawApprovals ?? []).filter((a) => a.status === "pending").length;
  const { label: freshnessLabel, fresh } = useFreshnessLabel(dataUpdatedAt);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-background/70 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-8">
            <Link href="/mesh" className="flex items-center gap-2.5 group">
              <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center shadow-[0_0_12px_rgba(34,211,238,0.15)] group-hover:shadow-[0_0_20px_rgba(34,211,238,0.25)] transition-shadow">
                <Radio className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold tracking-tight">
                flux7<span className="text-primary">-console</span>
              </span>
            </Link>
            <nav className="flex items-center gap-0.5">
              {nav.map(({ href, label, icon: Icon, ...rest }) => {
                const active = href === "/mesh" ? pathname === href : pathname.startsWith(href);
                const showBadge = "badge" in rest && rest.badge === "approvals" && pendingCount > 0;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-all",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                    {showBadge && (
                      <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-amber-500 text-[10px] font-mono font-semibold text-black leading-none">
                        {pendingCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
            {health ? (
              <>
                <span className="flex items-center gap-1.5">
                  <span className={cn(
                    "h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]",
                    fresh && "animate-pulse"
                  )} />
                  mesh7
                </span>
                <span className="text-border">·</span>
                <span className="tabular-nums">{health.tools} tools</span>
                <span className="text-border">·</span>
                <span className="tabular-nums">{health.traces.total} traces</span>
                {freshnessLabel && (
                  <>
                    <span className="text-border">·</span>
                    <span className={cn(
                      "tabular-nums transition-colors",
                      fresh ? "text-emerald-400/70" : "text-muted-foreground"
                    )}>
                      {freshnessLabel}
                    </span>
                  </>
                )}
              </>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]" />
                offline
              </span>
            )}
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </header>
      <main className="flex-1 px-6 py-6 max-w-7xl mx-auto w-full">{children}</main>
    </div>
  );
}

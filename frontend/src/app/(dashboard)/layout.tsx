"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Activity,
  Shield,
  LayoutDashboard,
  Radio,
  GitBranch,
  Users,
  Brain,
  Wrench,
  Key,
  ExternalLink,
  PanelLeftClose,
  PanelLeft,
  Bot,
  Cpu,
} from "lucide-react";
import { useHealth, useApprovals } from "@/lib/hooks/use-mesh";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: "approvals";
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "",
    items: [
      { href: "/mesh", label: "Overview", icon: LayoutDashboard },
      { href: "/mesh/agents", label: "Agents", icon: Cpu },
    ],
  },
  {
    label: "Observe",
    items: [
      { href: "/mesh/traces", label: "Traces", icon: Activity },
      { href: "/mesh/sessions", label: "Sessions", icon: Users },
      { href: "/mesh/otel", label: "OTEL", icon: GitBranch },
    ],
  },
  {
    label: "Govern",
    items: [
      { href: "/mesh/approvals", label: "Approvals", icon: Shield, badge: "approvals" },
      { href: "/mesh/supervisor", label: "Supervisor", icon: Bot },
      { href: "/mesh/grants", label: "Grants", icon: Key },
      { href: "/mesh/tools", label: "Tools", icon: Wrench },
    ],
  },
  {
    label: "Storage",
    items: [
      { href: "/mesh/memory", label: "Memory", icon: Brain },
    ],
  },
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
  const [collapsed, setCollapsed] = useState(false);
  const { data: health, dataUpdatedAt } = useHealth();
  const { data: rawApprovals } = useApprovals();
  const pendingCount = (rawApprovals ?? []).filter((a) => a.status === "pending").length;
  const { label: freshnessLabel, fresh } = useFreshnessLabel(dataUpdatedAt);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-20 flex flex-col bg-[#060c16]/95 backdrop-blur-xl border-r border-border transition-[width] duration-200",
          collapsed ? "w-14" : "w-52"
        )}
      >
        {/* Logo + collapse toggle */}
        <div className={cn(
          "shrink-0 px-3",
          collapsed ? "py-3 space-y-2" : "h-14 flex items-center justify-between"
        )}>
          <Link href="/mesh" className={cn(
            "flex items-center gap-2.5 group min-w-0",
            collapsed && "justify-center"
          )}>
            <div className="h-7 w-7 shrink-0 rounded-lg bg-primary/15 flex items-center justify-center shadow-[0_0_12px_rgba(34,211,238,0.15)] group-hover:shadow-[0_0_20px_rgba(34,211,238,0.25)] transition-shadow">
              <Radio className="h-4 w-4 text-primary" />
            </div>
            {!collapsed && (
              <span className="text-sm font-semibold tracking-tight truncate">
                flux7<span className="text-primary">-console</span>
              </span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors",
              collapsed && "mx-auto"
            )}
          >
            {collapsed ? (
              <PanelLeft className="h-3.5 w-3.5" />
            ) : (
              <PanelLeftClose className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
          {navGroups.map((group) => (
            <div key={group.label || "_root"}>
              {group.label && !collapsed && (
                <span className="px-2 mb-1.5 block text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.2em] font-mono">
                  {group.label}
                </span>
              )}
              {group.label && collapsed && (
                <div className="mx-auto mb-1.5 w-5 h-px bg-border" />
              )}
              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon, badge }) => {
                  const active = href === "/mesh" ? pathname === href : pathname.startsWith(href);
                  const showBadge = badge === "approvals" && pendingCount > 0;
                  return (
                    <Link
                      key={href}
                      href={href}
                      title={collapsed ? label : undefined}
                      className={cn(
                        "relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-all",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {!collapsed && (
                        <span className="truncate">{label}</span>
                      )}
                      {showBadge && (
                        <span className={cn(
                          "inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-amber-500 text-[10px] font-mono font-semibold text-black leading-none",
                          collapsed ? "absolute -top-0.5 -right-0.5 h-3.5 min-w-3.5 text-[8px]" : "ml-auto"
                        )}>
                          {pendingCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="shrink-0 border-t border-border px-2 py-2 space-y-2">
          {/* Status */}
          <div className={cn(
            "rounded-md px-2.5 py-2 text-[11px] font-mono text-muted-foreground",
            collapsed && "flex justify-center"
          )}>
            {health ? (
              collapsed ? (
                <span
                  className={cn(
                    "h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]",
                    fresh && "animate-pulse"
                  )}
                  title={`mesh7 · ${health.tools} tools · ${health.traces.total} traces · ${freshnessLabel}`}
                />
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]",
                      fresh && "animate-pulse"
                    )} />
                    <span>mesh7</span>
                    {freshnessLabel && (
                      <span className={cn(
                        "ml-auto tabular-nums transition-colors",
                        fresh ? "text-emerald-400/70" : "text-muted-foreground"
                      )}>
                        {freshnessLabel}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pl-3 text-[10px]">
                    <span className="tabular-nums">{health.tools} tools</span>
                    <span className="text-border">·</span>
                    <span className="tabular-nums">{health.traces.total} traces</span>
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]" />
                {!collapsed && <span>offline</span>}
              </div>
            )}
          </div>

          {/* Docs link */}
          <a
            href="https://docs.flux7.art"
            target="_blank"
            rel="noopener noreferrer"
            title={collapsed ? "Docs" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors",
              collapsed && "justify-center"
            )}
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            {!collapsed && <span>Docs</span>}
          </a>

        </div>

        {/* Right edge glow */}
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
      </aside>

      {/* Main content */}
      <main className={cn(
        "flex-1 min-h-screen transition-[margin] duration-200",
        collapsed ? "ml-14" : "ml-52"
      )}>
        <div className="px-6 py-6 max-w-7xl mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}

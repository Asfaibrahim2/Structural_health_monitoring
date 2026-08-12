"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  ListChecks,
  Building2,
  SlidersHorizontal,
  AlertTriangle,
  MessageSquare,
  FileText,
  Activity,
  Cpu,
  Box,
} from "lucide-react";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: (pathname: string) => boolean;
}

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutGrid, match: (p) => p === "/" },
      { href: "/inspection-queue", label: "Inspection queue", icon: ListChecks },
    ],
  },
  {
    title: "Monitor",
    items: [
      { href: "/anomalies", label: "Anomalies", icon: AlertTriangle },
      { href: "/sensors", label: "Digital twin", icon: Box },
      { href: "/sensor-health", label: "Sensor health", icon: Activity },
    ],
  },
  {
    title: "Analyze",
    items: [
      { href: "/what-if", label: "What-if", icon: SlidersHorizontal },
      { href: "/bridges", label: "Fleet", icon: Building2, match: (p) => p.startsWith("/bridges") },
      { href: "/reports", label: "Reports", icon: FileText },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/hardware", label: "Hardware", icon: Cpu },
      { href: "/assistant", label: "Assistant", icon: MessageSquare },
    ],
  },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  function isActive(item: NavItem) {
    if (item.match) return item.match(pathname);
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  return (
    <aside className="flex h-full w-[var(--sidebar-w)] flex-col border-r border-[var(--color-hairline)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-hairline)] px-4 py-4">
        <Link href="/" onClick={onNavigate} className="group block">
          <div className="flex items-center gap-2.5">
            <span className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-[8px] bg-[var(--color-ink)] text-[var(--color-accent-soft)]">
              <Activity size={16} className="animate-float" />
              <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[var(--color-accent)]/80 scan-bar" />
            </span>
            <div>
              <p className="font-[family-name:var(--font-display)] text-[15px] font-semibold tracking-tight text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-accent)]">
                InfraShield
              </p>
              <p className="text-[11px] text-[var(--color-ink-muted)]">Structural monitoring</p>
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section, si) => (
          <div key={section.title} className={clsx("mb-5 animate-fade-up", `stagger-${si + 1}`)}>
            <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
              {section.title}
            </p>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = isActive(item);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={clsx(
                      "group relative flex items-center gap-2.5 rounded-[var(--radius-btn)] px-2.5 py-2 text-[13px] font-medium transition-all duration-200",
                      active
                        ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                        : "text-[var(--color-ink-secondary)] hover:translate-x-0.5 hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)]"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r bg-[var(--color-accent)]" />
                    )}
                    <Icon
                      size={16}
                      strokeWidth={active ? 2.25 : 1.75}
                      className={clsx(active && "animate-float")}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--color-hairline)] px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] text-[var(--color-ink-muted)]">
          <span className="live-dot" />
          Systems online
        </div>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  ListChecks,
  Building2,
  SlidersHorizontal,
  AlertTriangle,
  Sparkles,
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
      { href: "/welcome", label: "Welcome Showcase", icon: Sparkles, match: (p) => p === "/welcome" },
      { href: "/", label: "Command Center", icon: LayoutGrid, match: (p) => p === "/" }
    ],
  },
  {
    title: "Monitor",
    items: [
      { href: "/sensors", label: "Digital Twin", icon: Box, match: (p) => p === "/sensors" },
      { href: "/anomalies", label: "Anomaly Explorer", icon: AlertTriangle },
      { href: "/inspection-queue", label: "Inspection Queue", icon: ListChecks },
    ],
  },
  {
    title: "Analyze",
    items: [
      { href: "/what-if", label: "What-If Simulator", icon: SlidersHorizontal },
      { href: "/hardware", label: "Hardware Bridge", icon: Cpu },
    ],
  },
  {
    title: "Tools",
    items: [
      { href: "/bridges", label: "Fleet Registry", icon: Building2, match: (p) => p.startsWith("/bridges") },
      { href: "/assistant", label: "AI Assistant", icon: Sparkles },
      { href: "/reports", label: "Reports", icon: FileText },
    ],
  },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  function isActive(item: NavItem) {
    if (item.match) return item.match(pathname);
    return pathname === item.href;
  }

  return (
    <aside className="flex h-full min-h-screen w-[260px] shrink-0 flex-col border-r border-[var(--color-hairline)] bg-[var(--color-bg-elevated)] px-4 py-6">
      <Link href="/" onClick={onNavigate} className="mb-8 flex items-center gap-3 px-2">
        <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[#0ea5e9] text-white shadow-[var(--shadow-glow)]">
          <Activity size={20} strokeWidth={2.5} />
        </div>
        <div>
          <p className="font-[family-name:var(--font-display)] text-[16px] font-bold tracking-tight text-[var(--color-ink)]">
            InfraShield
          </p>
          <p className="text-[11px] font-medium text-[var(--color-ink-muted)]">AI · Decision Support</p>
        </div>
      </Link>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
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
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all duration-200",
                      active
                        ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)] shadow-sm"
                        : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
                    )}
                  >
                    <Icon
                      size={17}
                      strokeWidth={active ? 2.5 : 2}
                      className={active ? "text-[var(--color-accent)]" : "text-[var(--color-ink-muted)] group-hover:text-[var(--color-ink-secondary)]"}
                    />
                    {item.label}
                    {active && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] shadow-[0_0_8px_var(--color-accent)]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutGrid, ListChecks, Building2, SlidersHorizontal, AlertTriangle,
  Sparkles, FileText, ShieldAlert, Cpu, Box, Menu, X, Activity,
} from "lucide-react";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import HealthIndicator from "@/components/HealthIndicator";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Command Center", icon: LayoutGrid, match: (p) => p === "/" },
  { href: "/sensors", label: "Digital Twin", icon: Box },
  { href: "/anomalies", label: "Anomalies", icon: AlertTriangle },
  { href: "/inspection-queue", label: "Inspection Queue", icon: ListChecks },
  { href: "/what-if", label: "What-If", icon: SlidersHorizontal },
  { href: "/sensor-health", label: "Sensor Health", icon: Activity },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/hardware", label: "Hardware", icon: Cpu },
  { href: "/bridges", label: "Fleet", icon: Building2, match: (p) => p.startsWith("/bridges") },
  { href: "/assistant", label: "AI Assistant", icon: Sparkles },
];

export default function TopNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(item: NavItem) {
    if (item.match) return item.match(pathname);
    return pathname === item.href;
  }

  return (
    <nav className="border-b border-[var(--color-hairline)] bg-[var(--color-bg-elevated)]/95 backdrop-blur-xl">
      {/* Row 1 — Brand + status */}
      <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-4 px-5 py-4 lg:px-8">
        <Link href="/" className="group flex items-center gap-4">
          <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#38bdf8] via-[#0ea5e9] to-[#0284c7] text-white shadow-[var(--shadow-glow)] transition-transform duration-200 group-hover:scale-105">
            <ShieldAlert size={24} strokeWidth={2.5} />
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[var(--color-bg-elevated)] bg-[var(--color-sage)] animate-pulse-soft" />
          </div>
          <div>
            <p className="font-[family-name:var(--font-display)] text-[22px] font-extrabold tracking-tight text-[var(--color-ink)] lg:text-[24px]">
              InfraShield <span className="text-[var(--color-accent-bright)]">AI</span>
            </p>
            <p className="text-[14px] font-medium text-[var(--color-ink-muted)]">
              Structural Health Monitoring · Telangana
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <HealthIndicator />
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="nav-btn !p-3 lg:hidden"
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Row 2 — Horizontal BUTTON bar (not sidebar) */}
      <div className="hidden border-t border-[var(--color-hairline)] bg-[var(--color-surface-sunken)]/80 lg:block">
        <div className="mx-auto max-w-[1680px] px-5 py-3 lg:px-8">
          <div className="flex flex-wrap items-center gap-2.5">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx("nav-btn", active && "nav-btn-active")}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={17} strokeWidth={active ? 2.5 : 2} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile — grid of big buttons */}
      {mobileOpen && (
        <div className="border-t border-[var(--color-hairline)] bg-[var(--color-surface-sunken)] px-5 py-4 lg:hidden animate-fade-in">
          <p className="mb-3 text-[12px] font-bold uppercase tracking-widest text-[var(--color-ink-muted)]">Navigate</p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={clsx("nav-btn w-full justify-center !py-3.5 !text-[15px]", active && "nav-btn-active")}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}

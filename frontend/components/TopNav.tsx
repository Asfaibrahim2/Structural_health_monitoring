"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  Menu,
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

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutGrid, match: (p) => p === "/" },
      { href: "/inspection-queue", label: "Inspection Queue", icon: ListChecks },
    ],
  },
  {
    title: "Monitor",
    items: [
      { href: "/anomalies", label: "Anomalies", icon: AlertTriangle },
      { href: "/sensors", label: "Digital Twin", icon: Box },
      { href: "/sensor-health", label: "Sensor Health", icon: Activity },
    ],
  },
  {
    title: "Analyze",
    items: [
      { href: "/what-if", label: "What-If", icon: SlidersHorizontal },
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

function isActive(item: NavItem, pathname: string) {
  if (item.match) return item.match(pathname);
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

export default function TopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function placeMenu() {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const width = Math.min(300, window.innerWidth - 24);
      let left = rect.right - width;
      left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
      const top = Math.min(rect.bottom + 8, window.innerHeight - 24);
      setMenuPos({ top, left });
    }

    function onPointerDown(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    if (open) {
      placeMenu();
      document.addEventListener("mousedown", onPointerDown);
      document.addEventListener("keydown", onKey);
      window.addEventListener("resize", placeMenu);
      window.addEventListener("scroll", placeMenu, true);
    }
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 overflow-visible border-b border-[var(--color-hairline)] bg-white/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 overflow-visible px-5 py-3.5 lg:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--color-ink)] text-[var(--color-accent-soft)] shadow-sm transition-transform group-hover:scale-[1.03]">
            <Activity size={22} strokeWidth={2.25} />
          </span>
          <div className="leading-tight">
            <p className="font-[family-name:var(--font-display)] text-[18px] font-bold tracking-tight text-[var(--color-ink)] lg:text-[20px]">
              InfraShield
            </p>
            <p className="text-[12px] font-medium text-[var(--color-ink-secondary)]">
              Structural Health Monitoring
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-3 overflow-visible">
          <HealthIndicator />

          <button
            ref={buttonRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Open menu"
            className={clsx(
              "inline-flex h-11 items-center gap-2.5 rounded-xl border px-4 text-[14px] font-bold shadow-sm transition-all",
              open
                ? "border-[#0284c7] bg-[#0284c7] text-white ring-2 ring-[#7dd3fc] ring-offset-2"
                : "border-[#7dd3fc] bg-[#e0f2fe] text-[#0369a1] hover:bg-[#bae6fd]"
            )}
          >
            <Menu size={20} strokeWidth={2.5} />
            <span className="hidden sm:inline">Menu</span>
          </button>
        </div>
      </div>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: "fixed",
            top: menuPos.top,
            left: menuPos.left,
            width: Math.min(300, typeof window !== "undefined" ? window.innerWidth - 24 : 300),
          }}
          className="z-[60] animate-fade-in overflow-hidden rounded-2xl border border-[#7dd3fc] bg-[#f0f9ff] shadow-[0_16px_40px_rgba(2,132,199,0.18)]"
        >
          <div className="border-b border-[#bae6fd] bg-[#e0f2fe] px-4 py-3.5">
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#0369a1]">
              Navigation
            </p>
          </div>

          <div className="max-h-[min(70vh,520px)] overflow-y-auto p-2">
            {NAV_GROUPS.map((group) => (
              <div key={group.title} className="mb-1">
                <p className="px-3 pb-1 pt-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#0284c7]/70">
                  {group.title}
                </p>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const active = isActive(item, pathname);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        onClick={() => setOpen(false)}
                        className={clsx(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition-colors",
                          active
                            ? "bg-[#0284c7] text-white"
                            : "text-[#0c4a6e] hover:bg-[#e0f2fe]"
                        )}
                      >
                        <span
                          className={clsx(
                            "grid h-8 w-8 place-items-center rounded-lg",
                            active ? "bg-white/20 text-white" : "bg-[#e0f2fe] text-[#0284c7]"
                          )}
                        >
                          <Icon size={16} strokeWidth={active ? 2.4 : 2} />
                        </span>
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

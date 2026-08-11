"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

export interface TabItem {
  href: string;
  label: string;
  icon?: LucideIcon;
  exact?: boolean;
}

export default function TabNav({ tabs }: { tabs: TabItem[] }) {
  const pathname = usePathname();

  return (
    <div className="mb-6 overflow-x-auto scrollbar-none">
      <nav className="inline-flex min-w-full gap-1 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface)] p-1.5 shadow-sm">
        {tabs.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-[13px] font-medium transition-all duration-200",
                active
                  ? "bg-[var(--color-structural)] text-white shadow-sm"
                  : "text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]"
              )}
            >
              {Icon && <Icon size={15} strokeWidth={2} />}
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

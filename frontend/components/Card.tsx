"use client";

import clsx from "clsx";
import AnimatedNumber from "@/components/AnimatedNumber";

export function Card({
  children,
  className,
  glow = false,
  hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  hover?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]",
        hover && "card-interactive",
        glow && "ring-1 ring-[var(--color-accent)]/15",
        className
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  tone = "default",
  delayClass = "",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "brick" | "rose" | "sage" | "amber" | "accent";
  delayClass?: string;
}) {
  const valueColor =
    tone === "brick"
      ? "var(--color-brick)"
      : tone === "sage"
        ? "var(--color-sage)"
        : tone === "amber" || tone === "rose"
          ? "var(--color-amber)"
          : tone === "accent"
            ? "var(--color-accent)"
            : "var(--color-ink)";

  const numeric = typeof value === "number";

  return (
    <div
      className={clsx(
        "card-interactive animate-fade-up rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]",
        delayClass
      )}
    >
      <p className="text-label">{label}</p>
      <p
        className="mt-2 font-[family-name:var(--font-display)] text-[28px] font-semibold leading-none tracking-tight"
        style={{ color: valueColor }}
      >
        {numeric ? <AnimatedNumber value={value} /> : value}
      </p>
      {sub && <p className="mt-2 text-[12px] text-[var(--color-ink-muted)]">{sub}</p>}
    </div>
  );
}

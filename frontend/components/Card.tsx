import clsx from "clsx";

export function Card({
  children,
  className,
  glow = false,
  hover = true,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  hover?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-6",
        "shadow-[var(--shadow-card)] transition-all duration-200",
        hover && "hover:-translate-y-0.5 hover:border-[var(--color-hairline-strong)]",
        glow && "ring-1 ring-[var(--color-accent)]/25 shadow-[0_0_32px_rgba(56,189,248,0.08)]",
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
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "brick" | "rose" | "sage" | "amber" | "accent";
}) {
  const tones = {
    default: { color: "var(--color-ink)", bg: "var(--color-surface)", border: "var(--color-hairline)", glow: "transparent" },
    brick: { color: "var(--color-brick)", bg: "var(--color-brick-soft)", border: "rgba(248,113,113,0.25)", glow: "rgba(248,113,113,0.1)" },
    rose: { color: "var(--color-orange)", bg: "var(--color-orange-soft)", border: "rgba(251,146,60,0.25)", glow: "rgba(251,146,60,0.1)" },
    sage: { color: "var(--color-sage)", bg: "var(--color-sage-soft)", border: "rgba(74,222,128,0.25)", glow: "rgba(74,222,128,0.1)" },
    amber: { color: "var(--color-amber)", bg: "var(--color-amber-soft)", border: "rgba(251,191,36,0.25)", glow: "rgba(251,191,36,0.1)" },
    accent: { color: "var(--color-accent-bright)", bg: "var(--color-accent-soft)", border: "rgba(56,189,248,0.3)", glow: "rgba(56,189,248,0.12)" },
  };
  const t = tones[tone];

  return (
    <div
      className="rounded-[var(--radius-card)] border p-4 sm:p-6 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1"
      style={{
        backgroundColor: t.bg,
        borderColor: t.border,
        boxShadow: `var(--shadow-card), 0 0 40px ${t.glow}`,
      }}
    >
      <p className="text-label text-[10px] sm:text-[12px]">{label}</p>
      <p
        className="mt-2 sm:mt-4 font-[family-name:var(--font-display)] text-[24px] sm:text-[44px] font-extrabold leading-none tracking-tight"
        style={{ color: t.color }}
      >
        {value}
      </p>
      {sub && <p className="mt-2 sm:mt-3 text-[11px] sm:text-[15px] font-medium leading-snug text-[var(--color-ink-muted)]">{sub}</p>}
    </div>
  );
}

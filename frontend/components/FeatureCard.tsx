import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

export default function FeatureCard({
  href,
  icon: Icon,
  title,
  description,
  accent = "accent",
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: "accent" | "sage" | "amber" | "brick";
}) {
  const accents = {
    accent: { bg: "var(--color-accent-soft)", fg: "var(--color-accent)" },
    sage: { bg: "var(--color-sage-soft)", fg: "var(--color-sage)" },
    amber: { bg: "var(--color-amber-soft)", fg: "var(--color-amber)" },
    brick: { bg: "var(--color-brick-soft)", fg: "var(--color-brick)" },
  };
  const a = accents[accent];

  return (
    <Link
      href={href}
      className="group flex flex-col rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-accent)]/30 hover:shadow-[0_0_24px_rgba(56,189,248,0.08)]"
    >
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl transition-transform group-hover:scale-105" style={{ backgroundColor: a.bg, color: a.fg }}>
        <Icon size={20} strokeWidth={2} />
      </div>
      <h3 className="font-[family-name:var(--font-display)] text-[16px] font-bold text-[var(--color-ink)]">{title}</h3>
      <p className="mt-2 flex-1 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">{description}</p>
      <span className="mt-4 flex items-center gap-1 text-[12px] font-semibold text-[var(--color-accent)] opacity-0 transition-opacity group-hover:opacity-100">
        Open <ArrowRight size={14} />
      </span>
    </Link>
  );
}

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Breadcrumb {
  label: string;
  href?: string;
}

export default function PageHeader({
  eyebrow,
  title,
  description,
  breadcrumbs,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-10">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-[14px] text-[var(--color-ink-muted)]">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.label} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={14} className="opacity-40" />}
              {crumb.href ? (
                <Link href={crumb.href} className="font-medium transition-colors hover:text-[var(--color-accent-bright)]">
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-semibold text-[var(--color-ink-secondary)]">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-3xl">
          {eyebrow && (
            <p className="mb-3 inline-flex items-center rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] px-4 py-1.5 text-[12px] font-bold uppercase tracking-widest text-[var(--color-accent-bright)]">
              {eyebrow}
            </p>
          )}
          <h1 className="text-display text-[clamp(2rem,5vw,3rem)] gradient-text">
            {title}
          </h1>
          {description && (
            <p className="mt-4 text-[17px] font-medium leading-relaxed text-[var(--color-ink-muted)]">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="mt-6 h-px w-full max-w-xs bg-gradient-to-r from-[var(--color-accent)] via-[var(--color-accent)]/30 to-transparent" />
    </header>
  );
}

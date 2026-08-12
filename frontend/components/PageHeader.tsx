import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Breadcrumb {
  label: string;
  href?: string;
}

export default function PageHeader({
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
    <header className="mb-6 animate-fade-up">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-2 flex flex-wrap items-center gap-1 text-[13px] text-[var(--color-ink-muted)]">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.label} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={12} className="opacity-50" />}
              {crumb.href ? (
                <Link href={crumb.href} className="transition-colors hover:text-[var(--color-ink)]">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-[var(--color-ink-secondary)]">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          <h1 className="text-display text-[var(--text-2xl)]">{title}</h1>
          {description && (
            <p className="mt-1.5 text-[var(--text-md)] leading-relaxed text-[var(--color-ink-muted)]">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0 animate-fade-in stagger-2">{action}</div>}
      </div>
    </header>
  );
}

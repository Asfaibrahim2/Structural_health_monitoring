import { Card } from "./Card";

export default function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`card-interactive ${className}`} hover>
      <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">{title}</h3>
      <p className="mt-0.5 text-[12px] text-[var(--color-ink-muted)]">{subtitle}</p>
      <div className="mt-4 animate-fade-in stagger-2">{children}</div>
    </Card>
  );
}

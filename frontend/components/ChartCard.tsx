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
    <Card className={className}>
      <h3 className="font-[family-name:var(--font-display)] text-[18px] font-bold text-[var(--color-ink)]">{title}</h3>
      <p className="mt-1.5 text-[14px] font-medium text-[var(--color-ink-muted)]">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </Card>
  );
}

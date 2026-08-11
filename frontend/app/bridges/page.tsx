import Link from "next/link";
import { api } from "@/lib/api";
import { Card } from "@/components/Card";
import PriorityBadge from "@/components/PriorityBadge";
import PageHeader from "@/components/PageHeader";
import { ArrowRight } from "lucide-react";

export default async function FleetRegistryPage() {
  const bridges = await api.bridges().catch(() => []);
  const sorted = [...bridges].sort((a, b) => b.latest_risk_score - a.latest_risk_score);

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Fleet Registry"
        description="All monitored Telangana structures with live risk indicators, sensor counts, and scenario profiles."
        breadcrumbs={[{ label: "Command Center", href: "/" }, { label: "Fleet Registry" }]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.map((b) => (
          <Link key={b.bridge_id} href={`/bridges/${b.bridge_id}`}>
            <Card className="group h-full transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-structural)]/30 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink-muted)]">
                    {b.bridge_id}
                  </p>
                  <h3 className="mt-1 font-[family-name:var(--font-display)] text-[17px] font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-structural)]">
                    {b.bridge_name}
                  </h3>
                </div>
                <PriorityBadge priority={b.latest_inspection_priority} compact />
              </div>
              <p className="mt-2 text-[13px] text-[var(--color-ink-muted)]">{b.structure_type}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-[12px] text-[var(--color-ink-muted)]">
                <span>Age {b.age_years}y</span>
                <span>{b.sensor_count} sensors</span>
                <span>Span {b.span_length_m}m</span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[var(--color-hairline)] pt-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-[var(--color-ink-muted)]">Risk score</p>
                  <p className="font-[family-name:var(--font-mono)] text-[20px] font-semibold text-[var(--color-ink)]">
                    {b.latest_risk_score.toFixed(1)}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-[12px] font-medium text-[var(--color-structural)] opacity-0 transition-opacity group-hover:opacity-100">
                  View <ArrowRight size={14} />
                </span>
              </div>
            </Card>
          </Link>
        ))}
        {sorted.length === 0 && (
          <Card className="col-span-full py-12 text-center text-[var(--color-ink-muted)]">
            No structures loaded. Confirm the backend is running.
          </Card>
        )}
      </div>
    </>
  );
}

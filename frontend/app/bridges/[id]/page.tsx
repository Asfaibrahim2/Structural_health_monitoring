import { api } from "@/lib/api";
import { Card } from "@/components/Card";
import BridgeRiskCard from "@/components/BridgeRiskCard";
import Link from "next/link";
import { SlidersHorizontal, Sparkles, LineChart, AlertTriangle, type LucideIcon } from "lucide-react";

export default async function BridgeOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [bridge, latest] = await Promise.all([
    api.bridge(id).catch(() => null),
    api.bridgeLatest(id).catch(() => null),
  ]);

  if (!bridge) return null;
  const risk = latest?.latest_risk;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <Card className="flex flex-col items-center shadow-[var(--shadow-card)]">
        <BridgeRiskCard score={bridge.latest_risk_score} risk={risk} />
      </Card>

      <Card className="lg:col-span-2 shadow-[var(--shadow-card)]">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
          Why this priority
        </p>
        {risk ? (
          <>
            <p className="text-[14px] leading-relaxed text-[var(--color-ink)]">{risk.risk_explanation}</p>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Metric label="Severity" value={risk.severity_score} />
              <Metric label="Persistence" value={risk.persistence_score} />
              <Metric label="Sensor agreement" value={risk.sensor_agreement_score} />
              <Metric label="Trend" value={risk.trend_score} />
              <Metric label="Vulnerability" value={risk.asset_vulnerability_score} />
              <Metric label="Context" value={risk.context_score} />
              <Metric label="Data quality" value={risk.data_quality_score} />
            </div>
          </>
        ) : (
          <p className="text-[13.5px] text-[var(--color-ink-muted)]">No risk assessment on record yet.</p>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-4">
        <QuickLink href={`/bridges/${id}/telemetry`} icon={LineChart} title="Telemetry" desc="Sensor charts & trends" />
        <QuickLink href={`/bridges/${id}/events`} icon={AlertTriangle} title="Anomaly Events" desc="Event log & alerts" />
        <QuickLink href={`/bridges/${id}/what-if`} icon={SlidersHorizontal} title="What-If" desc="Scenario simulation" />
        <QuickLink href={`/bridges/${id}/assistant`} icon={Sparkles} title="AI Assistant" desc="Ask about this structure" />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-[var(--color-paper)] px-3 py-2.5">
      <p className="font-[family-name:var(--font-mono)] text-[18px] font-semibold text-[var(--color-ink)]">
        {value.toFixed(0)}
      </p>
      <p className="text-[11px] text-[var(--color-ink-muted)]">{label}</p>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface)] p-4 transition-all hover:border-[var(--color-structural)]/30 hover:shadow-sm"
    >
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--color-structural-soft)] text-[var(--color-structural)] transition-transform group-hover:scale-105">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-[14px] font-medium text-[var(--color-ink)]">{title}</p>
        <p className="text-[12px] text-[var(--color-ink-muted)]">{desc}</p>
      </div>
    </Link>
  );
}

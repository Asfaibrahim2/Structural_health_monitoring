import { api } from "@/lib/api";
import { Card } from "@/components/Card";
import BridgeRiskCard from "@/components/BridgeRiskCard";
import Link from "next/link";
import { SlidersHorizontal, Sparkles, LineChart, AlertTriangle, ShieldAlert, Heart, Calendar, HelpCircle, type LucideIcon } from "lucide-react";
import { getVulnerabilityLabel, getWhyThisBridgeMatters, getWhyThisRisk } from "@/lib/bridgeHelpers";
import Tooltip from "@/components/Tooltip";
import { TOOLTIPS } from "@/lib/status";

// UI/UX cleanup: adjusted layout/labels for clarity, added profiles and plain language summaries
export default async function BridgeOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [bridge, latest] = await Promise.all([
    api.bridge(id).catch(() => null),
    api.bridgeLatest(id).catch(() => null),
  ]);

  if (!bridge) return null;
  const risk = latest?.latest_risk ?? null;
  const vulnerability = getVulnerabilityLabel(bridge.vulnerability_factor);
  const mattersText = getWhyThisBridgeMatters(bridge.bridge_name, bridge.structure_type);
  const riskExplanation = getWhyThisRisk(risk, bridge);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {/* Left Column: Risk indicator & Bridge Profile */}
      <div className="space-y-4">
        <Card className="flex flex-col items-center justify-center p-6 shadow-[var(--shadow-card)]">
          <BridgeRiskCard score={bridge.latest_risk_score} risk={risk} />
        </Card>

        <Card className="shadow-[var(--shadow-card)]">
          <h3 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-[16px] font-bold text-[var(--color-ink)]">
            <Calendar size={16} className="text-[var(--color-accent)]" /> Bridge Profile
          </h3>
          <p className="text-[12px] text-[var(--color-ink-muted)] mb-4">Structural metadata registry</p>
          <dl className="space-y-3 text-[13.5px]">
            <div className="flex justify-between border-b border-[var(--color-hairline)] pb-1.5">
              <dt className="text-[var(--color-ink-muted)]">Type</dt>
              <dd className="font-semibold text-[var(--color-ink)] capitalize">{bridge.structure_type}</dd>
            </div>
            <div className="flex justify-between border-b border-[var(--color-hairline)] pb-1.5">
              <dt className="text-[var(--color-ink-muted)]">Age</dt>
              <dd className="font-mono font-semibold text-[var(--color-ink)]">{bridge.age_years} years</dd>
            </div>
            <div className="flex justify-between border-b border-[var(--color-hairline)] pb-1.5">
              <dt className="text-[var(--color-ink-muted)]">Span length</dt>
              <dd className="font-mono font-semibold text-[var(--color-ink)]">{bridge.span_length_m} m</dd>
            </div>
            <div className="flex justify-between border-b border-[var(--color-hairline)] pb-1.5">
              <dt className="text-[var(--color-ink-muted)]">Vulnerability</dt>
              <dd className={`font-semibold ${vulnerability === "High" ? "text-[var(--color-brick)]" : vulnerability === "Medium" ? "text-[var(--color-orange)]" : "text-[var(--color-sage)]"}`}>{vulnerability}</dd>
            </div>
            <div className="flex justify-between pb-1">
              <dt className="text-[var(--color-ink-muted)]">Current scenario</dt>
              <dd className="font-semibold text-[var(--color-accent-bright)] capitalize text-right">{bridge.scenario_type.replace(/_/g, " ")}</dd>
            </div>
          </dl>
        </Card>

        <Card className="border-[var(--color-accent)]/20 bg-[var(--color-accent-soft)]/20 shadow-[var(--shadow-card)]">
          <h4 className="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wider text-[var(--color-accent-bright)] mb-1">
            <Heart size={14} /> Why this bridge matters
          </h4>
          <p className="text-[13px] leading-relaxed text-[var(--color-ink-secondary)]">
            {mattersText}
          </p>
        </Card>
      </div>

      {/* Middle & Right Columns: Explanation and Metrics breakdown */}
      <div className="lg:col-span-2 space-y-4">
        {/* Why this risk card */}
        <Card className="shadow-[var(--shadow-card)]">
          <h3 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-[16px] font-bold text-[var(--color-ink)]">
            <ShieldAlert size={18} className="text-[var(--color-orange)]" /> Why this risk?
          </h3>
          <p className="text-[12.5px] text-[var(--color-ink-muted)] mb-4">Breakdown of underlying telemetry and structural risk factors</p>
          
          <ul className="space-y-2.5 text-[14px]">
            {riskExplanation.contributors.map((bullet, index) => (
              <li key={index} className="flex items-start gap-2 text-[var(--color-ink-secondary)]">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                {bullet}
              </li>
            ))}
          </ul>

          <div className="mt-5 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-sunken)] p-3 text-[13.5px] font-medium text-[var(--color-ink)] italic">
            💡 {riskExplanation.summary}
          </div>
        </Card>

        {/* Technical metrics simplified */}
        <Card className="shadow-[var(--shadow-card)]">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            Risk Assessment Breakdown
          </p>
          {risk ? (
            <>
              <p className="text-[14px] leading-relaxed text-[var(--color-ink-secondary)] mb-4">{risk.risk_explanation}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="Anomaly severity" value={risk.severity_score} />
                <Metric label="Persistence score" value={risk.persistence_score} />
                <Metric label="Sensor agreement" value={risk.sensor_agreement_score} />
                <Metric label="Trend deviation" value={risk.trend_score} />
                <Metric label="Vulnerability (age+type)" value={risk.asset_vulnerability_score} />
                <Metric label="Environmental influence" value={risk.context_score} />
                <Metric label="Data reliability (%)" value={risk.data_quality_score} />
              </div>
            </>
          ) : (
            <p className="text-[13.5px] text-[var(--color-ink-muted)]">No risk assessment on record yet.</p>
          )}
        </Card>
      </div>

      {/* Quick Links Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-4 mt-2">
        <QuickLink href={`/bridges/${id}/telemetry`} icon={LineChart} title="Telemetry" desc="Sensor charts & trends" />
        <QuickLink href={`/bridges/${id}/events`} icon={AlertTriangle} title="Anomaly Events" desc="Event log & alerts" />
        <QuickLink href={`/bridges/${id}/what-if`} icon={SlidersHorizontal} title="What-If" desc="Scenario simulation" />
        <QuickLink href={`/bridges/${id}/assistant`} icon={Sparkles} title="AI Assistant" desc="Ask about this structure" />
      </div>
    </div>
  );
}

// Simplified Metric card
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-hairline)] px-3 py-2.5">
      <p className="font-[family-name:var(--font-mono)] text-[18px] font-semibold text-[var(--color-ink)]">
        {value.toFixed(0)}
      </p>
      <p className="text-[11px] text-[var(--color-ink-muted)] leading-tight mt-0.5">{label}</p>
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

import Link from "next/link";
import { api } from "@/lib/api";
import { Card, StatCard } from "@/components/Card";
import PriorityBadge from "@/components/PriorityBadge";
import PageHeader from "@/components/PageHeader";
import Disclaimer from "@/components/Disclaimer";
import ChartCard from "@/components/ChartCard";
import RiskOverviewChart from "@/components/RiskOverviewChart";
import AnomalyStatusChart from "@/components/AnomalyStatusChart";
import RiskDistributionChart from "@/components/RiskDistributionChart";
import Tooltip from "@/components/Tooltip";
import { TOOLTIPS } from "@/lib/status";
import { ArrowRight, AlertTriangle } from "lucide-react";

export default async function CommandCenterPage() {
  const bridges = await api.bridges().catch(() => []);

  const total = bridges.length;
  const p1p2 = bridges.filter((b) => ["P1", "P2"].includes(b.latest_inspection_priority)).length;
  const activeAnomalies = bridges.reduce((sum, b) => sum + b.active_anomaly_count, 0);
  const normalStructures = bridges.filter((b) => b.latest_inspection_priority === "P4" && b.active_anomaly_count === 0).length;

  const topPriority = [...bridges].sort((a, b) => b.latest_risk_score - a.latest_risk_score).slice(0, 8);

  return (
    <>
      <PageHeader
        eyebrow="Stage F · Page 1"
        title="Command Center"
        description="Fleet overview — total bridges, normal structures, active anomalies, P1/P2 counts, top inspection priorities, and risk distribution."
      />
      <Disclaimer className="mb-6" />

      {bridges.length === 0 && (
        <Card className="mb-6 flex items-center gap-3 border-[var(--color-amber)]/30 bg-[var(--color-amber-soft)]">
          <AlertTriangle size={18} className="text-[var(--color-amber)]" />
          <p className="text-[14px] text-[var(--color-ink-secondary)]">
            API unreachable. Start the backend with <code className="font-mono text-[12px]">python data/backend/run_server.py</code> and refresh.
          </p>
        </Card>
      )}

      {bridges.length > 0 && bridges.every((b) => b.latest_risk_score === 0) && (
        <Card className="mb-6 flex items-center gap-3 border-[var(--color-amber)]/30 bg-[var(--color-amber-soft)]">
          <AlertTriangle size={18} className="text-[var(--color-amber)]" />
          <p className="text-[14px] text-[var(--color-ink-secondary)]">
            Bridge metadata loaded but analytics are empty. Restart the backend to re-seed telemetry and risk scores.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Structures Monitored" value={total} sub="Telangana fleet" tone="accent" />
        <StatCard label="Normal Structures" value={normalStructures} sub="P4 with no open anomalies" tone="sage" />
        <StatCard label="Active Anomalies" value={activeAnomalies} sub="Open events fleet-wide" tone="amber" />
        <StatCard label="P1 / P2 Inspections" value={p1p2} sub="Needs attention soon" tone="brick" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Risk by structure" subtitle="Risk indicator (0–100) per bridge" className="lg:col-span-2">
          <RiskOverviewChart bridges={bridges} />
        </ChartCard>
        <ChartCard title="Risk distribution" subtitle="Count of structures per priority band">
          <RiskDistributionChart bridges={bridges} />
        </ChartCard>
      </div>

      <div className="mt-4">
        <ChartCard title="Scenario profiles" subtitle="Structures grouped by injected test scenario">
          <AnomalyStatusChart bridges={bridges} />
        </ChartCard>
      </div>

      <Card className="mt-6">
        <h3 className="font-[family-name:var(--font-display)] text-[17px] font-bold text-[var(--color-ink)]">How InfraShield AI Works</h3>
        <p className="mt-1 text-[13px] text-[var(--color-ink-muted)]">End-to-end pipeline from sensors to inspection decisions</p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-[14px] text-[var(--color-ink-secondary)]">
          {[
            "Ingests realistic synthetic sensor time-series",
            "Learns adaptive baseline per structure",
            "Hybrid anomaly detection + persistence",
            "Multi-sensor fusion & environmental context",
            "Risk indicator with confidence & uncertainty",
            "Ranks bridges for inspection (P1–P4)",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
              {item}
            </li>
          ))}
        </ul>
      </Card>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-[20px] font-bold text-[var(--color-ink)]">Latest Alerts</h2>
            <p className="mt-0.5 text-[13px] text-[var(--color-ink-muted)]">Top structures by risk indicator</p>
          </div>
          <Link href="/inspection-queue" className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-accent)] hover:underline">
            Full queue <ArrowRight size={14} />
          </Link>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[14px]">
              <thead>
                <tr className="border-b border-[var(--color-hairline)] bg-[var(--color-surface-sunken)] text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                  <th className="px-5 py-3.5">Bridge</th>
                  <th className="px-5 py-3.5">Risk (0–100) <Tooltip text={TOOLTIPS.risk} /></th>
                  <th className="px-5 py-3.5">Priority</th>
                  <th className="px-5 py-3.5">Anomalies</th>
                  <th className="px-5 py-3.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {topPriority.map((b) => (
                  <tr key={b.bridge_id} className="border-b border-[var(--color-hairline)] last:border-0 transition-colors hover:bg-[var(--color-surface-hover)]">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[var(--color-ink)]">{b.bridge_name}</p>
                      <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink-muted)]">{b.bridge_id}</p>
                    </td>
                    <td className="px-5 py-4 font-[family-name:var(--font-mono)] text-[15px] font-bold text-[var(--color-ink)]">
                      {b.latest_risk_score.toFixed(1)}
                    </td>
                    <td className="px-5 py-4"><PriorityBadge priority={b.latest_inspection_priority} compact /></td>
                    <td className="px-5 py-4 text-[var(--color-ink-muted)]">{b.active_anomaly_count}</td>
                    <td className="px-5 py-4">
                      <Link href={`/anomalies?bridge=${b.bridge_id}`} className="text-[13px] font-semibold text-[var(--color-accent)] hover:underline">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
                {!topPriority.length && (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-[var(--color-ink-muted)]">No data yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </>
  );
}

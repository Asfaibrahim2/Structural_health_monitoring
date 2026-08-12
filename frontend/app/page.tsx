"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, StatCard } from "@/components/Card";
import PriorityBadge from "@/components/PriorityBadge";
import ChartCard from "@/components/ChartCard";
import RiskOverviewChart from "@/components/RiskOverviewChart";
import AnomalyStatusChart from "@/components/AnomalyStatusChart";
import LiveMonitorStrip from "@/components/LiveMonitorStrip";
import { getPlainMainReason } from "@/lib/bridgeHelpers";
import PageHeader from "@/components/PageHeader";
import { ArrowRight, Loader2 } from "lucide-react";

export default function CommandCenterPage() {
  const [bridges, setBridges] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.bridges().catch(() => []), api.inspectionQueue().catch(() => [])]).then(
      ([bridgesData, queueData]) => {
        setBridges(bridgesData);
        setQueue(queueData);
        setLoading(false);
      }
    );
  }, []);

  const topPriority = [...queue].sort((a, b) => b.risk_score - a.risk_score).slice(0, 8);
  const bridgeAgeMap = new Map(bridges.map((b) => [b.bridge_id, b.age_years]));

  const total = bridges.length;
  const p1p2Count = bridges.filter((b) => ["P1", "P2"].includes(b.latest_inspection_priority)).length;
  const activeAnomalies = bridges.reduce((sum, b) => sum + b.active_anomaly_count, 0);
  const normalStructures = bridges.filter(
    (b) => b.latest_inspection_priority === "P4" && b.active_anomaly_count === 0
  ).length;

  if (loading) {
    return (
      <div className="flex h-[40vh] flex-col items-center justify-center gap-3">
        <div className="skeleton h-10 w-10 rounded-full" />
        <div className="flex items-center gap-2 text-[14px] text-[var(--color-ink-muted)]">
          <Loader2 size={16} className="animate-spin text-[var(--color-accent)]" />
          Loading dashboard…
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard" description="Fleet risk overview and highest-priority bridges." />

      <LiveMonitorStrip bridges={total} anomalies={activeAnomalies} critical={p1p2Count} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Bridges" value={total} sub="Monitored assets" tone="accent" delayClass="stagger-1" />
        <StatCard label="Normal" value={normalStructures} sub="No open issues" tone="sage" delayClass="stagger-2" />
        <StatCard label="Anomalies" value={activeAnomalies} sub="Open events" tone="amber" delayClass="stagger-3" />
        <StatCard label="P1 / P2" value={p1p2Count} sub="Needs attention" tone="brick" delayClass="stagger-4" />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <ChartCard title="Risk by bridge" subtitle="Risk score 0–100" className="animate-fade-up stagger-3 lg:col-span-2">
          <RiskOverviewChart bridges={bridges} />
        </ChartCard>
        <ChartCard title="Anomaly mix" subtitle="Scenario distribution" className="animate-fade-up stagger-4">
          <AnomalyStatusChart bridges={bridges} />
        </ChartCard>
      </div>

      <div className="mt-6 animate-fade-up stagger-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">Priority bridges</h2>
          <Link
            href="/inspection-queue"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--color-accent)] transition-all hover:gap-2"
          >
            Full queue <ArrowRight size={14} />
          </Link>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--color-hairline)] bg-[var(--color-surface-sunken)] text-[12px] font-semibold text-[var(--color-ink-muted)]">
                  <th className="px-4 py-2.5 font-semibold">Bridge</th>
                  <th className="px-4 py-2.5 font-semibold">Age</th>
                  <th className="px-4 py-2.5 font-semibold">Risk</th>
                  <th className="px-4 py-2.5 font-semibold">Priority</th>
                  <th className="px-4 py-2.5 font-semibold">Confidence</th>
                  <th className="px-4 py-2.5 font-semibold">Reason</th>
                  <th className="px-4 py-2.5 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {topPriority.map((b, i) => {
                  const age = bridgeAgeMap.get(b.bridge_id) ?? "—";
                  const riskPct = Math.min(100, Math.max(0, b.risk_score));
                  const barColor =
                    b.inspection_priority === "P1"
                      ? "var(--color-brick)"
                      : b.inspection_priority === "P2"
                        ? "var(--color-orange)"
                        : b.inspection_priority === "P3"
                          ? "var(--color-amber)"
                          : "var(--color-sage)";
                  return (
                    <tr
                      key={b.bridge_id}
                      className="border-b border-[var(--color-hairline)] last:border-0 transition-colors hover:bg-[var(--color-surface-hover)]"
                      style={{ animation: `fade-up 0.4s ease both ${0.05 * i}s` }}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--color-ink)]">{b.bridge_name}</p>
                        <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink-muted)]">
                          {b.bridge_id}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-[var(--color-ink-secondary)]">
                        {age} yrs
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex min-w-[88px] flex-col gap-1">
                          <span className="font-[family-name:var(--font-mono)] font-semibold text-[var(--color-ink)]">
                            {b.risk_score.toFixed(1)}
                          </span>
                          <div className="risk-meter">
                            <span style={{ width: `${riskPct}%`, background: barColor, animationDelay: `${0.08 * i}s` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={b.inspection_priority} compact />
                      </td>
                      <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-[var(--color-ink-secondary)]">
                        {b.confidence_score.toFixed(0)}%
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-[var(--color-ink-secondary)]">
                        {getPlainMainReason(b)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/anomalies?bridge=${b.bridge_id}`}
                          className="font-medium text-[var(--color-accent)] transition-colors hover:underline"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {!topPriority.length && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[var(--color-ink-muted)]">
                      No data yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}

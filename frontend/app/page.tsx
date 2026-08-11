"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, StatCard } from "@/components/Card";
import PriorityBadge from "@/components/PriorityBadge";
import ChartCard from "@/components/ChartCard";
import RiskOverviewChart from "@/components/RiskOverviewChart";
import AnomalyStatusChart from "@/components/AnomalyStatusChart";
import { getPlainMainReason } from "@/lib/bridgeHelpers";
import { ArrowRight, Loader2 } from "lucide-react";

export default function CommandCenterPage() {
  const [bridges, setBridges] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.bridges().catch(() => []),
      api.inspectionQueue().catch(() => []),
    ]).then(([bridgesData, queueData]) => {
      setBridges(bridgesData);
      setQueue(queueData);
      setLoading(false);
    });
  }, []);

  const topPriority = [...queue]
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 8);

  const bridgeAgeMap = new Map(bridges.map((b) => [b.bridge_id, b.age_years]));

  const total = bridges.length;
  const p1p2Count = bridges.filter((b) => ["P1", "P2"].includes(b.latest_inspection_priority)).length;
  const activeAnomalies = bridges.reduce((sum, b) => sum + b.active_anomaly_count, 0);
  const normalStructures = bridges.filter((b) => b.latest_inspection_priority === "P4" && b.active_anomaly_count === 0).length;

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center gap-3">
        <Loader2 size={24} className="animate-spin text-[var(--color-accent)]" />
        <span className="text-[14px] text-[var(--color-ink-muted)]">Loading CommandCenter Dashboard...</span>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Bridges" value={total} sub="Telangana fleet" tone="accent" />
        <StatCard label="Normal" value={normalStructures} sub="P4 with no open anomalies" tone="sage" />
        <StatCard label="Anomalies" value={activeAnomalies} sub="Open events fleet-wide" tone="amber" />
        <StatCard label="P1 / P2" value={p1p2Count} sub="Needs attention soon" tone="brick" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Risk overview" subtitle="Risk indicator (0–100) per bridge" className="lg:col-span-2">
          <RiskOverviewChart bridges={bridges} />
        </ChartCard>
        <ChartCard title="Anomaly status" subtitle="Scenario profiles distribution" className="col-span-1">
          <AnomalyStatusChart bridges={bridges} />
        </ChartCard>
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-[20px] font-bold text-[var(--color-ink)]">Latest Alerts</h2>
            <p className="mt-0.5 text-[13px] text-[var(--color-ink-muted)]">Bridges sorted by highest risk indicator</p>
          </div>
          <Link href="/inspection-queue" className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-accent)] hover:underline">
            Full queue <ArrowRight size={14} />
          </Link>
        </div>

        <Card className="overflow-hidden p-0 shadow-[var(--shadow-card)]">
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[640px] text-left text-[14px]">
              <thead>
                <tr className="border-b border-[var(--color-hairline)] bg-[var(--color-surface-sunken)] text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                  <th className="px-5 py-3.5">Bridge</th>
                  <th className="px-5 py-3.5">Age</th>
                  <th className="px-5 py-3.5">Risk indicator (0–100)</th>
                  <th className="px-5 py-3.5">Priority</th>
                  <th className="px-5 py-3.5">Confidence (%)</th>
                  <th className="px-5 py-3.5">Main reason</th>
                  <th className="px-5 py-3.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {topPriority.map((b) => {
                  const age = bridgeAgeMap.get(b.bridge_id) ?? "—";
                  return (
                    <tr key={b.bridge_id} className="border-b border-[var(--color-hairline)] last:border-0 transition-colors hover:bg-[var(--color-surface-hover)]">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-[var(--color-ink)]">{b.bridge_name}</p>
                        <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink-muted)]">{b.bridge_id}</p>
                      </td>
                      <td className="px-5 py-4 font-[family-name:var(--font-mono)] text-[13.5px] text-[var(--color-ink)]">
                        {age} yrs
                      </td>
                      <td className="px-5 py-4 font-[family-name:var(--font-mono)] text-[15px] font-bold text-[var(--color-ink)]">
                        {b.risk_score.toFixed(1)}
                      </td>
                      <td className="px-5 py-4"><PriorityBadge priority={b.inspection_priority} compact /></td>
                      <td className="px-5 py-4 font-[family-name:var(--font-mono)] text-[14px]">
                        {b.confidence_score.toFixed(0)}%
                      </td>
                      <td className="px-5 py-4 text-[13px] text-[var(--color-ink-secondary)] max-w-[220px] truncate">
                        {getPlainMainReason(b)}
                      </td>
                      <td className="px-5 py-4">
                        <Link href={`/anomalies?bridge=${b.bridge_id}`} className="text-[13px] font-semibold text-[var(--color-accent)] hover:underline">
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {!topPriority.length && (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-[var(--color-ink-muted)]">No data yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-8 space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-[20px] font-bold text-[var(--color-ink)]">
          Operations Quick Access Hub
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Anomaly Explorer",
              desc: "Investigate baseline comparison charts, multi-sensor agreement, and event replay.",
              href: "/anomalies",
              icon: "🔍",
            },
            {
              title: "Digital Twin (Sensors)",
              desc: "Visualize structural nodes, view real-time sensor parameters, and run trend projections.",
              href: "/sensors",
              icon: "🌉",
            },
            {
              title: "Hardware Prototyping",
              desc: "Connect ESP32 microcontrollers, check serial gateways, and stream live telemetry.",
              href: "/hardware",
              icon: "🔌",
            },
            {
              title: "Inspection Queue",
              desc: "Assess prioritized maintenance alerts with calculated confidence and uncertainty boundaries.",
              href: "/inspection-queue",
              icon: "📋",
            },
            {
              title: "What-If Simulation",
              desc: "Execute structural simulations to model traffic, rainfall, and delay impacts.",
              href: "/what-if",
              icon: "⚙️",
            },
            {
              title: "Engineering Reports",
              desc: "Review compiled risk evidence, audit sensor health, and download formal PDF reports.",
              href: "/reports",
              icon: "📄",
            },
          ].map((link) => (
            <Link key={link.href} href={link.href} className="group block">
              <Card className="h-full border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-accent)] hover:shadow-[var(--shadow-glow)]">
                <div className="flex items-start gap-4">
                  <span className="text-[24px] group-hover:scale-110 transition-transform shrink-0">{link.icon}</span>
                  <div>
                    <h3 className="font-[family-name:var(--font-display)] text-[15px] font-bold text-[var(--color-ink)] group-hover:text-[var(--color-accent-bright)] transition-colors">
                      {link.title}
                    </h3>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-ink-muted)]">
                      {link.desc}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

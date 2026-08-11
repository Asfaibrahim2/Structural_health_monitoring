"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";
import type { BridgeSummary } from "@/lib/api";
import { priorityChartColor } from "@/lib/status";

export default function RiskOverviewChart({ bridges }: { bridges: BridgeSummary[] }) {
  const data = [...bridges]
    .sort((a, b) => b.latest_risk_score - a.latest_risk_score)
    .slice(0, 12)
    .map((b) => ({
      name: b.bridge_id.replace("TS-STR-", "B"),
      fullName: b.bridge_name,
      risk: b.latest_risk_score,
      priority: b.latest_inspection_priority,
    }));

  if (!data.length) {
    return <p className="py-10 text-center text-[14px] text-[var(--color-ink-muted)]">No data available.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 48 }}>
        <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} angle={-40} textAnchor="end" height={55} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} width={32} />
        <Tooltip
          contentStyle={{ background: "#1a2332", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 10, fontSize: 12, color: "#f1f5f9" }}
          formatter={(v) => [`${Number(v).toFixed(1)}`, "Risk"]}
          labelFormatter={(_, p) => p?.[0]?.payload?.fullName ?? ""}
        />
        <Bar dataKey="risk" radius={[6, 6, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={priorityChartColor(entry.priority)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

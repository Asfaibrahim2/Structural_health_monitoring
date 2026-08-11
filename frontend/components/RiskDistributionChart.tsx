"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { BridgeSummary } from "@/lib/api";
import { PRIORITY_STATUS } from "@/lib/status";

export default function RiskDistributionChart({ bridges }: { bridges: BridgeSummary[] }) {
  const buckets = [
    { band: "P1 · 80–100", key: "P1" as const, count: 0, min: 80 },
    { band: "P2 · 60–79", key: "P2" as const, count: 0, min: 60 },
    { band: "P3 · 35–59", key: "P3" as const, count: 0, min: 35 },
    { band: "P4 · 0–34", key: "P4" as const, count: 0, min: 0 },
  ];

  bridges.forEach((b) => {
    const p = b.latest_inspection_priority;
    const row = buckets.find((x) => x.key === p);
    if (row) row.count += 1;
  });

  if (bridges.length === 0) {
    return <p className="py-12 text-center text-[14px] text-[var(--color-ink-muted)]">No risk data available.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={buckets} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <XAxis dataKey="band" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
        <Tooltip
          formatter={(v) => [`${Number(v ?? 0)} structure${Number(v) === 1 ? "" : "s"}`, "Count"]}
          contentStyle={{ background: "#1a2332", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 10, fontSize: 13 }}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56}>
          {buckets.map((b) => (
            <Cell key={b.key} fill={PRIORITY_STATUS[b.key].fg} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

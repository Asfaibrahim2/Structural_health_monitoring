"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { BridgeSummary } from "@/lib/api";

const SCENARIO_LABELS: Record<string, string> = {
  normal: "Normal",
  sudden_spike: "Sudden spikes",
  persistent_anomaly: "Persistent",
  gradual_deterioration: "Gradual",
  environmental_disturbance: "Environmental",
  noisy_sensor: "Noisy sensor",
  sensor_drift: "Sensor drift",
  sensor_dropout: "Dropout",
  missing_values: "Missing data",
  multi_sensor_anomaly: "Multi-sensor",
};

const COLORS = ["#4ade80", "#f87171", "#fb923c", "#fbbf24", "#38bdf8", "#94a3b8", "#a78bfa", "#34d399"];

export default function AnomalyStatusChart({ bridges }: { bridges: BridgeSummary[] }) {
  const counts: Record<string, number> = {};
  bridges.forEach((b) => {
    const key = b.scenario_type || "normal";
    counts[key] = (counts[key] || 0) + 1;
  });

  const data = Object.entries(counts).map(([key, value]) => ({
    name: SCENARIO_LABELS[key] ?? key.replace(/_/g, " "),
    value,
  }));

  if (!data.length) return <p className="py-10 text-center text-[14px] text-[var(--color-ink-muted)]">No data.</p>;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={60} outerRadius={90} paddingAngle={3}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip contentStyle={{ background: "#1a2332", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 10, color: "#f1f5f9" }} />
        <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

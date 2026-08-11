"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { SensorReading } from "@/lib/api";

export default function SensorChart({
  readings,
  dataKey,
  label,
  color = "var(--color-accent)",
  tall = false,
}: {
  readings: SensorReading[];
  dataKey: keyof SensorReading;
  label: string;
  color?: string;
  tall?: boolean;
}) {
  const data = readings.map((r) => ({
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    value: r[dataKey] as number | null,
  }));

  return (
    <div>
      <p className="text-label mb-3">{label}</p>
      <ResponsiveContainer width="100%" height={tall ? 200 : 120}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
          <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} width={42} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: "1px solid rgba(148,163,184,0.15)",
              background: "#1a2332",
              fontSize: 12,
              fontFamily: "JetBrains Mono",
              color: "#f1f5f9",
            }}
          />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: color }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

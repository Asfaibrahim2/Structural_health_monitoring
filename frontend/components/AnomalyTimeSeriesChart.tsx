"use client";

import {
  ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceArea,
} from "recharts";
import type { SensorReading, AnomalyEvent } from "@/lib/api";

const EXPECTED_KEY: Record<string, keyof SensorReading> = {
  strain_microstrain: "strain_microstrain_expected",
  vibration_g: "vibration_g_expected",
  displacement_mm: "displacement_mm_expected",
};

function computeBaselineFallback(values: number[]): number {
  if (!values.length) return 0;
  const normal = values.slice(0, Math.max(1, Math.floor(values.length * 0.35)));
  return normal.reduce((a, b) => a + b, 0) / normal.length;
}

export default function AnomalyTimeSeriesChart({
  readings,
  dataKey,
  label,
  unit,
  color,
  events = [],
}: {
  readings: SensorReading[];
  dataKey: keyof SensorReading;
  label: string;
  unit: string;
  color: string;
  events?: AnomalyEvent[];
}) {
  const expectedKey = EXPECTED_KEY[String(dataKey)];
  const values = readings.map((r) => r[dataKey] as number | null).filter((v): v is number => v != null);
  const fallback = computeBaselineFallback(values);

  const data = readings.map((r, i) => {
    const adaptive = expectedKey ? (r[expectedKey] as number | null) : null;
    return {
      idx: i,
      time: new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      value: r[dataKey] as number | null,
      baseline: adaptive != null && typeof adaptive === "number" ? adaptive : fallback,
      anomaly: r.ground_truth_anomaly === 1,
    };
  });

  const anomalyRanges: { x1: number; x2: number }[] = [];
  let start: number | null = null;
  data.forEach((d, i) => {
    if (d.anomaly && start === null) start = i;
    if (!d.anomaly && start !== null) {
      anomalyRanges.push({ x1: start, x2: i - 1 });
      start = null;
    }
  });
  if (start !== null) anomalyRanges.push({ x1: start, x2: data.length - 1 });

  const latest = [...data].reverse().find((d) => d.value != null)?.value ?? null;
  const latestBaseline = [...data].reverse().find((d) => d.baseline != null)?.baseline ?? fallback;
  const deviation =
    latest != null && Math.abs(latestBaseline) > 1e-9
      ? ((latest - latestBaseline) / Math.abs(latestBaseline)) * 100
      : 0;

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[14px] font-semibold text-[var(--color-ink)]">{label}</p>
          <p className="text-[12px] text-[var(--color-ink-muted)]">
            Baseline{" "}
            <span className="font-[family-name:var(--font-mono)] font-semibold text-[var(--color-ink)]">
              {latestBaseline.toFixed(2)} {unit}
            </span>
            {latest != null && (
              <>
                {" "}
                · Current{" "}
                <span className="font-[family-name:var(--font-mono)] font-semibold">{latest.toFixed(2)} {unit}</span>
                <span
                  className={
                    deviation > 10
                      ? " text-[var(--color-brick)]"
                      : deviation < -10
                        ? " text-[var(--color-sage)]"
                        : ""
                  }
                >
                  {" "}
                  ({deviation >= 0 ? "+" : ""}
                  {deviation.toFixed(1)}%)
                </span>
              </>
            )}
          </p>
        </div>
        {events.length > 0 && (
          <span className="rounded-full bg-[var(--color-brick-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-brick)]">
            {events.length} event{events.length > 1 ? "s" : ""}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
          <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
          <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={false} width={44} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ background: "#1a2332", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 10, fontSize: 12 }}
            formatter={(v, name) => [`${Number(v ?? 0).toFixed(2)} ${unit}`, name === "baseline" ? "Baseline" : "Current"]}
          />
          {anomalyRanges.map((r, i) => (
            <ReferenceArea key={i} x1={data[r.x1]?.time} x2={data[r.x2]?.time} fill="rgba(248,113,113,0.12)" strokeOpacity={0} />
          ))}
          <Line type="monotone" dataKey="baseline" stroke="#64748b" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="mt-2 text-[11px] text-[var(--color-ink-muted)]">
        <span className="inline-block h-2 w-4 rounded-sm bg-[rgba(248,113,113,0.25)] align-middle" aria-hidden /> Shaded = anomaly window
      </p>
    </div>
  );
}

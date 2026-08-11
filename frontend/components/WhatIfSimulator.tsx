"use client";

// UI/UX cleanup: what-if simulator with clearer labels and disclaimer.
import { useState } from "react";
import { api, type SimulateResponse } from "@/lib/api";
import { Card } from "@/components/Card";
import PriorityBadge from "@/components/PriorityBadge";
import Disclaimer from "@/components/Disclaimer";
import Tooltip from "@/components/Tooltip";
import { TOOLTIPS } from "@/lib/status";
import type { InspectionPriority } from "@/lib/api";
import { SlidersHorizontal, Play, RotateCcw } from "lucide-react";

const PRESETS = [
  { name: "Heat wave", temp: 48, traffic: 55, rain: 0, maint: 0 },
  { name: "Heavy rain + traffic", temp: 26, traffic: 120, rain: 15, maint: 0 },
  { name: "Deferred maintenance", temp: 28, traffic: 50, rain: 0, maint: 90 },
  { name: "Winter low", temp: 2, traffic: 30, rain: 0, maint: 0 },
];

export default function WhatIfSimulator({
  bridgeId,
  expanded = false,
}: {
  bridgeId: string;
  expanded?: boolean;
}) {
  const [temp, setTemp] = useState(28);
  const [traffic, setTraffic] = useState(50);
  const [rain, setRain] = useState(0);
  const [maintDelay, setMaintDelay] = useState(0);
  const [simDuration, setSimDuration] = useState(7);
  const [result, setResult] = useState<SimulateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyPreset(p: (typeof PRESETS)[0]) {
    setTemp(p.temp);
    setTraffic(p.traffic);
    setRain(p.rain);
    setMaintDelay(p.maint);
    setResult(null);
  }

  function reset() {
    setTemp(28);
    setTraffic(50);
    setRain(0);
    setMaintDelay(0);
    setSimDuration(7);
    setResult(null);
    setError(null);
  }

  async function runSimulation() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.simulate({
        bridge_id: bridgeId,
        scenario_name: "custom_what_if",
        temperature_c: temp,
        traffic_load_percent: traffic,
        rainfall_mm: rain,
        maintenance_delay_days: maintDelay,
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Simulation failed.");
    } finally {
      setLoading(false);
    }
  }

  const delta = result?.delta_values?.risk_score_delta as number | undefined;
  const simPriority = result?.simulated_values?.inspection_priority as InspectionPriority | undefined;

  return (
    <Card className={expanded ? "shadow-[var(--shadow-card)]" : ""}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-structural-soft)] text-[var(--color-structural)]">
            <SlidersHorizontal size={16} />
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-[17px] font-semibold text-[var(--color-ink)]">
              What-if simulator
            </h3>
            <p className="text-[12px] text-[var(--color-ink-muted)]">Adjust parameters and compare risk outcomes</p>
          </div>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1 rounded-lg border border-[var(--color-hairline)] px-3 py-1.5 text-[12px] text-[var(--color-ink-muted)] hover:border-[var(--color-structural)] hover:text-[var(--color-structural)]"
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      {expanded && (
        <div className="mb-5 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              className="rounded-full border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-ink-muted)] transition-colors hover:border-[var(--color-structural)] hover:text-[var(--color-structural)]"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      <div className={`grid gap-4 ${expanded ? "sm:grid-cols-2" : ""}`}>
        <SliderField label="Temperature" value={temp} min={-5} max={55} unit="°C" onChange={setTemp} />
        <SliderField label="Traffic load" value={traffic} min={0} max={150} unit="%" onChange={setTraffic} />
        <SliderField label="Rainfall" value={rain} min={0} max={20} unit="mm" onChange={setRain} />
        <SliderField label="Maintenance delay" value={maintDelay} min={0} max={180} unit=" days" onChange={setMaintDelay} />
        <SliderField label="Simulation duration" value={simDuration} min={1} max={30} unit=" days" onChange={setSimDuration} />
      </div>

      <button
        onClick={runSimulation}
        disabled={loading}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-structural)] py-3 text-[14px] font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
      >
        <Play size={16} />
        {loading ? "Running simulation…" : "Run simulation"}
      </button>

      {error && (
        <p className="mt-3 rounded-lg bg-[var(--color-brick-soft)] px-3 py-2 text-[12.5px] text-[var(--color-brick)]">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                Current risk indicator (0–100) <Tooltip text={TOOLTIPS.risk} />
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-[32px] font-semibold text-[var(--color-ink)]">
                {Number(result.current_values.risk_score).toFixed(1)}
              </p>
              <p className="mt-1 text-[12px] text-[var(--color-ink-muted)]">
                {result.current_values.inspection_priority as string}
              </p>
            </div>
            <div className="rounded-xl border-2 border-[var(--color-structural)]/30 bg-[var(--color-structural-soft)] p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-structural)]">
                  Simulated risk indicator <Tooltip text={TOOLTIPS.risk} />
                </p>
                {simPriority && <PriorityBadge priority={simPriority} compact />}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-[family-name:var(--font-display)] text-[32px] font-semibold text-[var(--color-ink)]">
                  {Number(result.simulated_values.risk_score).toFixed(1)}
                </span>
                {typeof delta === "number" && (
                  <span
                    className="font-[family-name:var(--font-mono)] text-[14px] font-medium"
                    style={{ color: delta > 0 ? "var(--color-brick)" : "var(--color-sage)" }}
                  >
                    {delta > 0 ? "+" : ""}
                    {delta.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {result.affected_evidence.length > 0 && (
            <div className="rounded-xl bg-[var(--color-paper)] p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                Evidence affected
              </p>
              <ul className="space-y-1.5">
                {result.affected_evidence.map((e, i) => (
                  <li key={i} className="flex gap-2 text-[13px] text-[var(--color-ink)]">
                    <span className="text-[var(--color-structural)]">•</span> {e}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
            {result.explanation} Projected over {simDuration} day{simDuration > 1 ? "s" : ""}.
          </p>
          <Disclaimer className="mt-3" />
        </div>
      )}
    </Card>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="block rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4">
      <div className="mb-2 flex items-baseline justify-between text-[13px]">
        <span className="font-medium text-[var(--color-ink)]">{label}</span>
        <span className="font-[family-name:var(--font-mono)] text-[var(--color-structural)]">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ background: `linear-gradient(to right, var(--color-structural) ${pct}%, var(--color-hairline) ${pct}%)` }}
      />
    </label>
  );
}

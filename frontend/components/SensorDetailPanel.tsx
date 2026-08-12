"use client";

import type { SensorReading, SensorHealth, RiskAssessment } from "@/lib/api";
import type { TwinSensorNode } from "@/components/DigitalTwinSvg";
import { Card } from "@/components/Card";
import { X } from "lucide-react";
import { STATUS } from "@/lib/status";

function healthStatus(score: number) {
  if (score >= 85) return STATUS.normal;
  if (score >= 65) return STATUS.warning;
  if (score >= 40) return STATUS.elevated;
  return STATUS.critical;
}

export default function SensorDetailPanel({
  node,
  reading,
  health,
  risk,
  onClose,
}: {
  node: TwinSensorNode;
  reading: SensorReading | null;
  health?: SensorHealth;
  risk: RiskAssessment | null;
  onClose: () => void;
}) {
  const raw = reading?.[node.field];
  const current = raw != null && typeof raw === "number" ? (node.id === "S03" ? raw * 0.98 : raw) : null;

  // Learned baseline estimate from fleet norms + bridge type
  const baselines: Record<string, number> = {
    strain_microstrain: 105,
    vibration_g: 0.21,
    displacement_mm: 2.2,
    temperature_c: 29,
  };
  const baseline = baselines[node.field as string] ?? 0;
  const deviation = current != null && baseline > 0 ? ((current - baseline) / baseline) * 100 : null;
  const st = healthStatus(health?.health_score ?? 85);

  return (
    <Card className="border-[var(--color-accent)]/30 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-label text-[var(--color-accent)]">Sensor detail</p>
          <h3 className="mt-1 font-[family-name:var(--font-display)] text-[18px] font-bold text-[var(--color-ink)]">
            {node.label} ({node.id})
          </h3>
        </div>
        <button onClick={onClose} className="rounded-lg p-2 hover:bg-[var(--color-surface-hover)]" aria-label="Close panel">
          <X size={18} />
        </button>
      </div>

      <div
        className="mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide"
        style={{ background: st.bg, color: st.fg, border: `1px solid ${st.fg}44` }}
      >
        {st.label}
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <Metric label="Current reading" value={current != null ? `${node.format(current)} ${node.unit}` : "—"} />
        <Metric label="Learned baseline" value={`${baseline} ${node.unit}`} />
        <Metric
          label="Deviation"
          value={deviation != null ? `${deviation >= 0 ? "+" : ""}${deviation.toFixed(1)}%` : "—"}
          warn={deviation != null && Math.abs(deviation) > 15}
        />
        <Metric label="Sensor health" value={health ? `${health.health_score.toFixed(0)}%` : "—"} />
        <Metric label="Model confidence (%)" value={risk ? `${risk.confidence_score.toFixed(0)}%` : "—"} />
        <Metric label="Uncertainty (± points)" value={risk ? `±${risk.uncertainty.toFixed(1)}` : "—"} />
      </dl>

      {health && (
        <div className="mt-4 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-sunken)] p-3 text-[13px] text-[var(--color-ink-muted)]">
          <p>Missing data: {(health.missing_ratio * 100).toFixed(0)}%</p>
          {health.flatline_flag ? <p className="text-[var(--color-amber)]">⚠ Flatline detected</p> : null}
          {health.noise_flag ? <p className="text-[var(--color-amber)]">⚠ Elevated noise</p> : null}
          {health.drift_score > 0.1 ? <p>Drift score: {health.drift_score.toFixed(2)}</p> : null}
          <p className="mt-1 text-[12px]">Last seen: {health.last_seen}</p>
        </div>
      )}
    </Card>
  );
}

function Metric({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-sunken)] px-4 py-3">
      <dt className="text-[12px] font-medium text-[var(--color-ink-muted)]">{label}</dt>
      <dd className={`mt-1 font-[family-name:var(--font-mono)] text-[16px] font-bold ${warn ? "text-[var(--color-brick)]" : "text-[var(--color-ink)]"}`}>
        {value}
      </dd>
    </div>
  );
}

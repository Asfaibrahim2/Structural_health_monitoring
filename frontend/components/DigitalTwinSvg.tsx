"use client";

import { useState } from "react";
import type { SensorHealth, SensorReading } from "@/lib/api";

export interface TwinSensorNode {
  id: string;
  x: number;
  y: number;
  label: string;
  type: "strain" | "vibration" | "displacement" | "temperature";
  field: keyof SensorReading;
  unit: string;
  format: (v: number) => string;
}

export const TWIN_NODES: TwinSensorNode[] = [
  { id: "S01", x: 100, y: 88, label: "Strain A", type: "strain", field: "strain_microstrain", unit: "µε", format: (v) => v.toFixed(1) },
  { id: "S02", x: 220, y: 72, label: "Vibration", type: "vibration", field: "vibration_g", unit: "g", format: (v) => v.toFixed(3) },
  { id: "S03", x: 340, y: 88, label: "Strain B", type: "strain", field: "strain_microstrain", unit: "µε", format: (v) => (v * 0.98).toFixed(1) },
  { id: "S04", x: 160, y: 118, label: "Displacement", type: "displacement", field: "displacement_mm", unit: "mm", format: (v) => v.toFixed(2) },
  { id: "S05", x: 280, y: 118, label: "Temperature", type: "temperature", field: "temperature_c", unit: "°C", format: (v) => v.toFixed(1) },
];

function nodeStatus(health?: SensorHealth): { color: string; label: string } {
  if (!health) return { color: "#64748b", label: "No data" };
  const s = health.health_score;
  if (s >= 85) return { color: "#4ade80", label: "Normal" };
  if (s >= 65) return { color: "#fbbf24", label: "Warning" };
  if (s >= 40) return { color: "#fb923c", label: "Elevated" };
  return { color: "#f87171", label: "Critical" };
}

function getNodeHealth(nodeId: string, healthData: SensorHealth[]): SensorHealth | undefined {
  return healthData.find((h) => h.sensor_id.endsWith(`_${nodeId}`) || h.sensor_id.includes(nodeId));
}

function getNodeValue(node: TwinSensorNode, reading: SensorReading | null): number | null {
  if (!reading) return null;
  const raw = reading[node.field];
  if (raw == null || typeof raw !== "number") return null;
  if (node.id === "S03") return raw * 0.98;
  return raw;
}

export default function DigitalTwinSvg({
  healthData = [],
  reading = null,
  bridgeName = "Bridge",
  structureType = "Cable-stayed Bridge",
  selectedId = null,
  onSelect,
}: {
  healthData?: SensorHealth[];
  reading?: SensorReading | null;
  bridgeName?: string;
  structureType?: string;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-sunken)] shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between border-b border-[var(--color-hairline)] px-5 py-4">
        <div>
          <p className="text-label text-[var(--color-accent)]">Live Digital Twin</p>
          <h3 className="mt-1 font-[family-name:var(--font-display)] text-[18px] font-bold text-[var(--color-ink)]">
            {bridgeName}
          </h3>
          <p className="text-[13px] text-[var(--color-ink-muted)]">{structureType}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-[var(--color-sage)]/30 bg-[var(--color-sage-soft)] px-3 py-1.5">
          <span className="h-2 w-2 animate-pulse-soft rounded-full bg-[var(--color-sage)]" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-sage)]">Live</span>
        </div>
      </div>

      <div className="relative grid-bg p-6">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--color-accent)]/5 via-transparent to-transparent" />
        <svg viewBox="0 0 440 200" className="relative z-10 mx-auto w-full max-w-2xl">
          <defs>
            <linearGradient id="deckGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
            <linearGradient id="pylonGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect x="0" y="168" width="440" height="32" fill="rgba(56,189,248,0.06)" />
          <line x1="0" y1="168" x2="440" y2="168" stroke="rgba(56,189,248,0.2)" strokeWidth="1" />
          <line x1="220" y1="30" x2="80" y2="100" stroke="rgba(148,163,184,0.25)" strokeWidth="1" />
          <line x1="220" y1="30" x2="160" y2="100" stroke="rgba(148,163,184,0.25)" strokeWidth="1" />
          <line x1="220" y1="30" x2="280" y2="100" stroke="rgba(148,163,184,0.25)" strokeWidth="1" />
          <line x1="220" y1="30" x2="360" y2="100" stroke="rgba(148,163,184,0.25)" strokeWidth="1" />
          <rect x="212" y="28" width="16" height="140" rx="2" fill="url(#pylonGrad)" />
          <polygon points="220,20 232,32 208,32" fill="#64748b" />
          <rect x="50" y="100" width="340" height="14" rx="3" fill="url(#deckGrad)" />
          <rect x="50" y="100" width="340" height="3" rx="1" fill="rgba(255,255,255,0.08)" />
          <rect x="68" y="114" width="12" height="54" rx="2" fill="url(#pylonGrad)" opacity="0.8" />
          <rect x="360" y="114" width="12" height="54" rx="2" fill="url(#pylonGrad)" opacity="0.8" />

          {TWIN_NODES.map((n) => {
            const health = getNodeHealth(n.id, healthData);
            const st = nodeStatus(health);
            const value = getNodeValue(n, reading);
            const isHovered = hovered === n.id;
            const isSelected = selectedId === n.id;
            return (
              <g
                key={n.id}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelect?.(n.id)}
                role="button"
                tabIndex={0}
                aria-label={`${n.label} sensor — ${st.label}`}
                style={{ cursor: "pointer" }}
              >
                <line x1={n.x} y1={n.y} x2={n.x} y2={107} stroke={st.color} strokeWidth={isHovered ? 2 : 1} strokeDasharray="4 3" opacity={isHovered ? 0.9 : 0.5} />
                {isHovered && (
                  <circle cx={n.x} cy={n.y} r={18} fill="none" stroke={st.color} strokeWidth="1" opacity="0.4">
                    <animate attributeName="r" from="12" to="22" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={n.x} cy={n.y} r={isHovered || isSelected ? 14 : 10} fill={st.color} filter="url(#glow)" opacity={0.95} stroke={isSelected ? "#f1f5f9" : "none"} strokeWidth={isSelected ? 2 : 0} />
                <circle cx={n.x} cy={n.y} r={4} fill="#0d1219" />
                <text x={n.x} y={n.y + 26} textAnchor="middle" fontSize="10" fontWeight="600" fill={isHovered ? st.color : "#94a3b8"} fontFamily="Plus Jakarta Sans, sans-serif">
                  {n.label}
                </text>
                {isHovered && (
                  <g>
                    <rect x={n.x - 62} y={n.y - 68} width="124" height="54" rx="6" fill="#1a2332" stroke={st.color} strokeWidth="1" opacity="0.97" />
                    <text x={n.x} y={n.y - 52} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="Plus Jakarta Sans">{n.label} · {st.label}</text>
                    <text x={n.x} y={n.y - 38} textAnchor="middle" fontSize="12" fontWeight="700" fill={st.color} fontFamily="JetBrains Mono">
                      {value != null ? `${n.format(value)} ${n.unit}` : "—"}
                    </text>
                    <text x={n.x} y={n.y - 22} textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="JetBrains Mono">
                      Health {health ? `${health.health_score.toFixed(0)}%` : "—"}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Live readings strip */}
      <div className="grid grid-cols-2 gap-2 border-t border-[var(--color-hairline)] px-4 py-3 sm:grid-cols-5">
        {TWIN_NODES.map((n) => {
          const value = getNodeValue(n, reading);
          const health = getNodeHealth(n.id, healthData);
          const st = nodeStatus(health);
          return (
            <div key={n.id} className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface)] px-2.5 py-2 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">{n.label}</p>
              <p className="mt-0.5 font-[family-name:var(--font-mono)] text-[13px] font-bold" style={{ color: st.color }}>
                {value != null ? `${n.format(value)} ${n.unit}` : "—"}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-5 border-t border-[var(--color-hairline)] px-5 py-3">
        {[
          { color: "#4ade80", label: "Normal (≥85%)" },
          { color: "#fbbf24", label: "Warning (65–84%)" },
          { color: "#fb923c", label: "Elevated (40–64%)" },
          { color: "#f87171", label: "Critical (<40%)" },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-2 text-[11px] text-[var(--color-ink-muted)]">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} />
            {l.label}
          </span>
        ))}
        <span className="text-[11px] text-[var(--color-ink-muted)]">· Click a sensor for full detail</span>
      </div>
    </div>
  );
}

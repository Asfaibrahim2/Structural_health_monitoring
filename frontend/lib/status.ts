// UI/UX cleanup: dark-theme semantic status colors.
import type { InspectionPriority } from "./api";

export const STATUS = {
  normal: { bg: "rgba(74,222,128,0.12)", fg: "#4ade80", label: "NORMAL" },
  warning: { bg: "rgba(251,191,36,0.12)", fg: "#fbbf24", label: "WARNING" },
  elevated: { bg: "rgba(251,146,60,0.12)", fg: "#fb923c", label: "ELEVATED" },
  critical: { bg: "rgba(248,113,113,0.12)", fg: "#f87171", label: "HIGH ANOMALY" },
  offline: { bg: "rgba(100,116,139,0.15)", fg: "#94a3b8", label: "OFFLINE" },
} as const;

export const PRIORITY_STATUS: Record<
  InspectionPriority,
  { bg: string; fg: string; label: string; short: string }
> = {
  P1: { bg: "rgba(248,113,113,0.12)", fg: "#f87171", label: "P1 · Immediate", short: "P1" },
  P2: { bg: "rgba(251,146,60,0.12)", fg: "#fb923c", label: "P2 · Scheduled", short: "P2" },
  P3: { bg: "rgba(251,191,36,0.12)", fg: "#fbbf24", label: "P3 · Routine", short: "P3" },
  P4: { bg: "rgba(74,222,128,0.12)", fg: "#4ade80", label: "P4 · Normal", short: "P4" },
};

export function riskToPriority(score: number): InspectionPriority {
  if (score >= 80) return "P1";
  if (score >= 60) return "P2";
  if (score >= 35) return "P3";
  return "P4";
}

export function priorityChartColor(p: InspectionPriority): string {
  return PRIORITY_STATUS[p].fg;
}

export const TOOLTIPS = {
  risk: "Risk indicator (0–100). Higher = higher inspection priority.",
  confidence: "Confidence (%). Model agreement based on sensor data quality.",
  uncertainty: "Uncertainty (±). Grows when sensors are missing or noisy.",
  anomalySudden: "Sudden spike — rapid deviation from baseline.",
  anomalyPersistent: "Persistent — sustained deviation over time.",
  anomalyGradual: "Gradual — slow drift from normal behavior.",
  anomalyEnvironmental: "Environmental — explained by weather/traffic.",
} as const;

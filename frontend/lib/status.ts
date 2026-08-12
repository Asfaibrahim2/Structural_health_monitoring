import type { InspectionPriority } from "./api";

export const STATUS = {
  normal: { bg: "rgba(4,120,87,0.14)", fg: "#047857", label: "NORMAL" },
  warning: { bg: "rgba(180,83,9,0.14)", fg: "#b45309", label: "WARNING" },
  elevated: { bg: "rgba(194,65,12,0.14)", fg: "#c2410c", label: "ELEVATED" },
  critical: { bg: "rgba(185,28,28,0.14)", fg: "#b91c1c", label: "HIGH ANOMALY" },
  offline: { bg: "rgba(71,85,105,0.12)", fg: "#475569", label: "OFFLINE" },
} as const;

export const PRIORITY_STATUS: Record<
  InspectionPriority,
  { bg: string; fg: string; label: string; short: string }
> = {
  P1: { bg: "rgba(185,28,28,0.12)", fg: "#b91c1c", label: "P1 · Immediate", short: "P1" },
  P2: { bg: "rgba(194,65,12,0.12)", fg: "#c2410c", label: "P2 · Scheduled", short: "P2" },
  P3: { bg: "rgba(180,83,9,0.12)", fg: "#b45309", label: "P3 · Routine", short: "P3" },
  P4: { bg: "rgba(4,120,87,0.12)", fg: "#047857", label: "P4 · Normal", short: "P4" },
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

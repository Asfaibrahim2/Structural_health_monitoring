// Central API client for the InfraShield AI FastAPI backend.
// Set NEXT_PUBLIC_API_BASE_URL in .env.local if the backend isn't on localhost:8000.

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status} on ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export type InspectionPriority = "P1" | "P2" | "P3" | "P4";

export interface BridgeSummary {
  bridge_id: string;
  bridge_name: string;
  structure_type: string;
  construction_year: number;
  age_years: number;
  span_length_m: number;
  vulnerability_factor: number;
  sensor_count: number;
  scenario_type: string;
  latest_risk_score: number;
  latest_inspection_priority: InspectionPriority;
  active_anomaly_count: number;
}

export interface SensorReading {
  bridge_id: string;
  sensor_id: string;
  timestamp: string;
  strain_microstrain: number | null;
  vibration_g: number | null;
  displacement_mm: number | null;
  temperature_c: number | null;
  humidity_percent: number | null;
  rainfall_mm: number | null;
  traffic_load_percent: number | null;
  wind_speed_mps: number | null;
  scenario: string;
  ground_truth_anomaly: number;
  // Adaptive Ridge baseline (time-varying — not a static mean)
  strain_microstrain_expected?: number | null;
  vibration_g_expected?: number | null;
  displacement_mm_expected?: number | null;
  strain_microstrain_lower?: number | null;
  strain_microstrain_upper?: number | null;
  vibration_g_lower?: number | null;
  vibration_g_upper?: number | null;
  displacement_mm_lower?: number | null;
  displacement_mm_upper?: number | null;
  baseline_mode?: string | null;
}

export interface RiskAssessment {
  bridge_id: string;
  timestamp: string;
  risk_score: number;
  uncertainty: number;
  confidence_score: number;
  inspection_priority: InspectionPriority;
  severity_score: number;
  persistence_score: number;
  sensor_agreement_score: number;
  trend_score: number;
  asset_vulnerability_score: number;
  context_score: number;
  data_quality_score: number;
  risk_explanation: string;
}

export interface AnomalyEvent {
  id: number;
  bridge_id: string;
  start_time: string;
  end_time: string | null;
  anomaly_type: string;
  severity: string;
  duration_minutes: number;
  description: string;
  status: string;
}

export interface InspectionQueueItem {
  bridge_id: string;
  bridge_name: string;
  structure_type: string;
  inspection_priority: InspectionPriority;
  risk_score: number;
  uncertainty: number;
  confidence_score: number;
  active_anomaly_type: string;
  main_reason: string;
  recommended_action: string;
  vulnerability_factor: number;
}

export interface SensorHealth {
  bridge_id: string;
  sensor_id: string;
  missing_ratio: number;
  flatline_flag: number;
  noise_flag: number;
  drift_score: number;
  health_score: number;
  last_seen: string;
}

export interface SimulateRequest {
  bridge_id: string;
  scenario_name?: string;
  temperature_c?: number;
  traffic_load_percent?: number;
  rainfall_mm?: number;
  maintenance_delay_days?: number;
  seed?: number;
}

export interface SimulateResponse {
  bridge_id: string;
  timestamp: string;
  disclaimer: string;
  current_values: Record<string, number | string>;
  simulated_values: Record<string, number | string>;
  delta_values: Record<string, number>;
  affected_evidence: string[];
  explanation: string;
}

export interface ReportResponse {
  report_id: string;
  bridge_id: string;
  title: string;
  generated_at: string;
  inspection_priority: InspectionPriority;
  summary_text: string;
  report_html: string;
}

export interface AssistantResponse {
  query: string;
  answer: string;
  data_sources_used: string[];
  suggested_actions: string[];
}

export const api = {
  health: () => request<{ status: string; database: string; version: string; timestamp: string }>("/api/health"),
  bridges: () => request<BridgeSummary[]>("/api/bridges"),
  bridge: (id: string) => request<BridgeSummary>(`/api/bridges/${id}`),
  bridgeLatest: (id: string) =>
    request<{ bridge_id: string; latest_reading: SensorReading | null; latest_risk: RiskAssessment | null }>(
      `/api/bridges/${id}/latest`
    ),
  timeseries: (id: string, limit = 200) =>
    request<SensorReading[]>(`/api/bridges/${id}/timeseries?limit=${limit}`),
  events: (id: string, limit = 20) => request<AnomalyEvent[]>(`/api/bridges/${id}/events?limit=${limit}`),
  inspectionQueue: () => request<InspectionQueueItem[]>("/api/inspection-queue"),
  sensorHealth: (bridgeId?: string) =>
    request<SensorHealth[]>(`/api/sensors/health${bridgeId ? `?bridge_id=${bridgeId}` : ""}`),
  simulate: (body: SimulateRequest) =>
    request<SimulateResponse>("/api/simulate", { method: "POST", body: JSON.stringify(body) }),
  generateReport: (bridgeId: string, title?: string) =>
    request<ReportResponse>("/api/reports/generate", {
      method: "POST",
      body: JSON.stringify({ bridge_id: bridgeId, title }),
    }),
  askAssistant: (query: string, bridgeId?: string) =>
    request<AssistantResponse>("/api/assistant/query", {
      method: "POST",
      body: JSON.stringify({ query, bridge_id: bridgeId }),
    }),
};

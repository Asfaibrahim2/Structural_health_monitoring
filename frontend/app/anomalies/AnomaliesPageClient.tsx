"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, type BridgeSummary, type AnomalyEvent, type RiskAssessment, type SensorReading } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/Card";
import PriorityBadge from "@/components/PriorityBadge";
import BridgeSelector from "@/components/BridgeSelector";
import AnomalyTimeSeriesChart from "@/components/AnomalyTimeSeriesChart";
import SensorChart from "@/components/SensorChart";
import Disclaimer from "@/components/Disclaimer";
import RiskGauge from "@/components/RiskGauge";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/AsyncState";
import { ArrowDown, Clock } from "lucide-react";

export default function AnomaliesPageClient() {
  const searchParams = useSearchParams();
  const [bridgeId, setBridgeId] = useState("");
  const [bridges, setBridges] = useState<BridgeSummary[]>([]);
  const [events, setEvents] = useState<AnomalyEvent[]>([]);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.bridges().then((b) => {
      setBridges(b);
      const fromUrl = searchParams.get("bridge");
      if (fromUrl && b.some((x) => x.bridge_id === fromUrl)) setBridgeId(fromUrl);
      else if (b.length > 0) setBridgeId(b[0].bridge_id);
    }).catch(() => setError(true));
  }, [searchParams]);

  useEffect(() => {
    if (!bridgeId) return;
    setLoading(true);
    setError(false);
    Promise.all([api.events(bridgeId, 50), api.timeseries(bridgeId, 150), api.bridgeLatest(bridgeId)])
      .then(([ev, ts, latest]) => {
        setEvents(ev);
        setReadings(ts);
        setRisk(latest.latest_risk);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [bridgeId]);

  const bridge = bridges.find((b) => b.bridge_id === bridgeId);
  const agreement = risk ? Math.round(risk.sensor_agreement_score) : 0;
  const sensorsAgreeing = agreement >= 66 ? 3 : agreement >= 33 ? 2 : 1;

  const timeline = useMemo(() => {
    const steps: { time: string; label: string }[] = [];
    if (readings.length > 0) {
      const trafficSpike = readings.find((r) => (r.traffic_load_percent ?? 0) > 70);
      if (trafficSpike) steps.push({ time: new Date(trafficSpike.timestamp).toLocaleTimeString(), label: "Traffic increased" });
    }
    events.forEach((e) => {
      steps.push({ time: e.start_time, label: `${e.anomaly_type.replace(/_/g, " ")} detected` });
    });
    if (risk && risk.risk_score > 60) {
      steps.push({ time: risk.timestamp, label: `Risk elevated to ${risk.risk_score.toFixed(0)} — ${risk.inspection_priority} recommended` });
    }
    return steps.slice(-8);
  }, [readings, events, risk]);

  return (
    <>
      <PageHeader
        eyebrow="Stage F · Page 3"
        title="Anomaly Explorer"
        description="Time-series with baseline comparison, shaded anomaly windows, environmental context, event timeline, and multi-sensor agreement."
        breadcrumbs={[{ label: "Command Center", href: "/" }, { label: "Anomaly Explorer" }]}
      />
      <Disclaimer className="mb-6" />

      <div className="mb-6 max-w-md">
        <label className="text-label mb-2 block">Select bridge to investigate</label>
        <BridgeSelector value={bridgeId} onChange={setBridgeId} />
      </div>

      {error && <ErrorState onRetry={() => window.location.reload()} />}
      {loading && !error && <LoadingState />}
      {!loading && !error && readings.length === 0 && <EmptyState title="No telemetry" message="No sensor readings found for this bridge." />}

      {!loading && !error && readings.length > 0 && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <AnomalyTimeSeriesChart readings={readings} dataKey="strain_microstrain" label="Strain" unit="µε" color="#38bdf8" events={events} />
              <AnomalyTimeSeriesChart readings={readings} dataKey="vibration_g" label="Vibration" unit="g" color="#f87171" events={events} />
              <AnomalyTimeSeriesChart readings={readings} dataKey="displacement_mm" label="Displacement" unit="mm" color="#fb923c" events={events} />
            </div>

            <div className="space-y-4">
              <Card>
                <h3 className="font-[family-name:var(--font-display)] text-[16px] font-bold">Risk breakdown</h3>
                {bridge && (
                  <div className="mt-4 flex flex-col items-center">
                    <RiskGauge score={bridge.latest_risk_score} size={130} />
                    <PriorityBadge priority={bridge.latest_inspection_priority} />
                  </div>
                )}
                {risk && (
                  <dl className="mt-4 space-y-2 text-[13px]">
                    <div className="flex justify-between"><dt>Confidence</dt><dd className="font-mono font-bold">{risk.confidence_score.toFixed(0)}%</dd></div>
                    <div className="flex justify-between"><dt>Uncertainty</dt><dd className="font-mono">±{risk.uncertainty.toFixed(1)}</dd></div>
                    <div className="flex justify-between"><dt>Sensor agreement</dt><dd className="font-mono font-bold">{sensorsAgreeing}/4 sensors</dd></div>
                  </dl>
                )}
              </Card>

              <Card>
                <h3 className="font-[family-name:var(--font-display)] text-[16px] font-bold">Environmental context</h3>
                <div className="mt-4 grid gap-4">
                  <SensorChart readings={readings} dataKey="traffic_load_percent" label="Traffic load (%)" color="#a78bfa" />
                  <SensorChart readings={readings} dataKey="rainfall_mm" label="Rainfall (mm)" color="#38bdf8" />
                  <SensorChart readings={readings} dataKey="temperature_c" label="Temperature (°C)" color="#fbbf24" />
                </div>
              </Card>
            </div>
          </div>

          <Card className="mt-6">
            <h3 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-[16px] font-bold">
              <Clock size={18} /> Event timeline
            </h3>
            {timeline.length === 0 ? (
              <p className="mt-4 text-[14px] text-[var(--color-ink-muted)]">No anomaly events recorded.</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {timeline.map((step, i) => (
                  <li key={i} className="flex gap-3 text-[14px]">
                    <ArrowDown size={14} className="mt-1 shrink-0 text-[var(--color-accent)]" />
                    <div>
                      <p className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-ink-muted)]">{step.time}</p>
                      <p className="font-medium text-[var(--color-ink)]">{step.label}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card className="mt-6 overflow-hidden p-0">
            <div className="border-b border-[var(--color-hairline)] px-5 py-4">
              <h3 className="font-[family-name:var(--font-display)] text-[16px] font-bold">Anomaly event log</h3>
            </div>
            {events.length === 0 ? (
              <p className="px-5 py-10 text-center text-[14px] text-[var(--color-ink-muted)]">No open events for this bridge.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-[14px]">
                  <thead>
                    <tr className="border-b border-[var(--color-hairline)] bg-[var(--color-surface-sunken)] text-[12px] uppercase text-[var(--color-ink-muted)]">
                      <th className="px-5 py-3">Start</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Severity</th>
                      <th className="px-5 py-3">Duration</th>
                      <th className="px-5 py-3">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e) => (
                      <tr key={e.id} className="border-b border-[var(--color-hairline)] last:border-0 hover:bg-[var(--color-surface-hover)]">
                        <td className="px-5 py-3 font-mono text-[12px]">{e.start_time}</td>
                        <td className="px-5 py-3">{e.anomaly_type.replace(/_/g, " ")}</td>
                        <td className="px-5 py-3"><span className="font-semibold">{e.severity}</span></td>
                        <td className="px-5 py-3">{e.duration_minutes} min</td>
                        <td className="px-5 py-3 text-[var(--color-ink-muted)]">{e.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {bridge && (
            <p className="mt-4 text-[13px]">
              <Link href={`/reports?bridge=${bridge.bridge_id}`} className="font-semibold text-[var(--color-accent)] hover:underline">
                Generate engineer report for {bridge.bridge_name} →
              </Link>
            </p>
          )}
        </>
      )}
    </>
  );
}

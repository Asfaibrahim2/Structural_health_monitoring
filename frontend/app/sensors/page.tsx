"use client";

import { useEffect, useState } from "react";
import { api, type BridgeSummary, type SensorHealth, type SensorReading, type RiskAssessment } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import DigitalTwinSvg, { TWIN_NODES } from "@/components/DigitalTwinSvg";
import SensorDetailPanel from "@/components/SensorDetailPanel";
import BridgeSelector from "@/components/BridgeSelector";
import { Card } from "@/components/Card";
import PriorityBadge from "@/components/PriorityBadge";
import RiskGauge from "@/components/RiskGauge";
import { LoadingState, ErrorState } from "@/components/ui/AsyncState";
import ForecastCard from "@/components/ForecastCard";

export default function SensorsPage() {
  const [bridgeId, setBridgeId] = useState("");
  const [bridges, setBridges] = useState<BridgeSummary[]>([]);
  const [health, setHealth] = useState<SensorHealth[]>([]);
  const [reading, setReading] = useState<SensorReading | null>(null);
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [selectedSensor, setSelectedSensor] = useState<string | null>("S04");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.bridges().then((b) => {
      setBridges(b);
      if (b.length > 0) setBridgeId(b[0].bridge_id);
    }).catch(() => setError(true));
  }, []);

  useEffect(() => {
    if (!bridgeId) return;
    setLoading(true);
    setError(false);
    Promise.all([
      api.sensorHealth(bridgeId),
      api.bridgeLatest(bridgeId),
      api.timeseries(bridgeId, 120).catch(() => [] as SensorReading[]),
    ])
      .then(([h, latest, ts]) => {
        setHealth(h);
        // Prefer last timeseries point (includes adaptive expected); fallback to latest_reading
        const withBaseline = [...ts].reverse().find((r) => r.strain_microstrain_expected != null) ?? ts[ts.length - 1];
        setReading(withBaseline ?? latest.latest_reading);
        setRisk(latest.latest_risk);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [bridgeId]);

  const bridge = bridges.find((b) => b.bridge_id === bridgeId);
  const selectedNode = TWIN_NODES.find((n) => n.id === selectedSensor);
  const selectedHealth = health.find((h) => h.sensor_id.endsWith(`_${selectedSensor}`));

  return (
    <>
      <PageHeader
        title="Digital twin"
        description="Bridge model with sensor nodes, readings, and adaptive expected values."
      />

      <div className="mb-5 max-w-sm">
        <label className="mb-1.5 block text-[12px] font-medium text-[var(--color-ink-muted)]">Bridge</label>
        <BridgeSelector value={bridgeId} onChange={setBridgeId} />
      </div>

      {error && <ErrorState onRetry={() => window.location.reload()} />}
      {loading && !error && <LoadingState message="Loading digital twin data…" />}

      {!loading && !error && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            <DigitalTwinSvg
              healthData={health}
              reading={reading}
              bridgeName={bridge?.bridge_name ?? bridgeId}
              structureType={bridge?.structure_type}
              selectedId={selectedSensor}
              onSelect={setSelectedSensor}
            />
            {selectedNode && (
              <SensorDetailPanel
                node={selectedNode}
                reading={reading}
                health={selectedHealth}
                risk={risk}
                onClose={() => setSelectedSensor(null)}
              />
            )}
          </div>

          <div className="space-y-4 lg:col-span-1 flex flex-col">
            <Card glow className="flex flex-col">
              <p className="text-label text-[var(--color-accent)]">Risk summary</p>
              <h3 className="mt-2 font-[family-name:var(--font-display)] text-[18px] font-bold">{bridge?.bridge_name}</h3>
              <div className="my-6 flex flex-col items-center">
                <RiskGauge score={risk?.risk_score ?? bridge?.latest_risk_score ?? 0} size={150} />
                <div className="mt-4">
                  <PriorityBadge priority={risk?.inspection_priority ?? bridge?.latest_inspection_priority ?? "P4"} />
                </div>
              </div>
              <p className="text-[13px] text-[var(--color-ink-muted)]">
                Priority labels use text + color — not color alone — for accessibility.
              </p>
            </Card>

            <ForecastCard bridgeId={bridgeId} />
          </div>
        </div>
      )}
    </>
  );
}

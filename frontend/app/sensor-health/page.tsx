"use client";

import { useEffect, useState } from "react";
import { api, type SensorHealth } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import BridgeSelector from "@/components/BridgeSelector";
import { Card } from "@/components/Card";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/AsyncState";
import { Activity, RefreshCw } from "lucide-react";
import { STATUS } from "@/lib/status";

function healthStatus(score: number) {
  if (score >= 85) return STATUS.normal;
  if (score >= 65) return STATUS.warning;
  if (score >= 40) return STATUS.elevated;
  return STATUS.critical;
}

export default function SensorHealthPage() {
  const [bridgeId, setBridgeId] = useState("");
  const [fleetMode, setFleetMode] = useState(false);
  const [data, setData] = useState<SensorHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    const req = fleetMode ? api.sensorHealth() : bridgeId ? api.sensorHealth(bridgeId) : Promise.resolve([]);
    req.then(setData).catch(() => setError(true)).finally(() => setLoading(false));
  }

  useEffect(() => {
    api.bridges().then((b) => { if (b.length > 0 && !bridgeId) setBridgeId(b[0].bridge_id); });
  }, [bridgeId]);

  useEffect(() => { if (fleetMode || bridgeId) load(); }, [bridgeId, fleetMode]);

  return (
    <>
      <PageHeader
        title="Sensor health"
        description="Reliability scores, dropout, noise, and drift flags."
      />

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFleetMode(false)}
            className={`rounded-xl px-4 py-2.5 text-[14px] font-semibold ${!fleetMode ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]" : "text-[var(--color-ink-muted)]"}`}
          >
            Per bridge
          </button>
          <button
            onClick={() => setFleetMode(true)}
            className={`rounded-xl px-4 py-2.5 text-[14px] font-semibold ${fleetMode ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]" : "text-[var(--color-ink-muted)]"}`}
          >
            Entire fleet
          </button>
        </div>
        {!fleetMode && (
          <div className="min-w-[240px] max-w-sm flex-1">
            <label className="text-label mb-2 block">Bridge</label>
            <BridgeSelector value={bridgeId} onChange={setBridgeId} />
          </div>
        )}
        <button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-xl border border-[var(--color-hairline)] px-4 py-2.5 text-[14px] font-medium">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && <ErrorState onRetry={load} />}
      {loading && !error && <LoadingState />}
      {!loading && !error && data.length === 0 && <EmptyState title="No sensor health data" />}
      {!loading && !error && data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((s) => {
            const st = healthStatus(s.health_score);
            return (
              <Card key={`${s.bridge_id}-${s.sensor_id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[15px] font-bold text-[var(--color-ink)]">{s.sensor_id.split("_").pop()}</p>
                    <p className="font-mono text-[11px] text-[var(--color-ink-muted)]">{s.bridge_id}</p>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase"
                    style={{ background: st.bg, color: st.fg }}
                  >
                    {st.label}
                  </span>
                </div>
                <p className="mt-3 font-[family-name:var(--font-display)] text-[36px] font-bold" style={{ color: st.fg }}>
                  {s.health_score.toFixed(0)}<span className="text-[16px] text-[var(--color-ink-muted)]">%</span>
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-2 text-[13px]">
                  <div><dt className="text-[var(--color-ink-muted)]">Dropout</dt><dd className="font-mono font-semibold">{(s.missing_ratio * 100).toFixed(0)}%</dd></div>
                  <div><dt className="text-[var(--color-ink-muted)]">Flatline</dt><dd className="font-semibold">{s.flatline_flag ? "Yes" : "No"}</dd></div>
                  <div><dt className="text-[var(--color-ink-muted)]">Noise</dt><dd className="font-semibold">{s.noise_flag ? "Elevated" : "Normal"}</dd></div>
                  <div><dt className="text-[var(--color-ink-muted)]">Drift</dt><dd className="font-mono">{s.drift_score.toFixed(2)}</dd></div>
                </dl>
                <p className="mt-3 text-[12px] text-[var(--color-ink-muted)]">Last update: {s.last_seen}</p>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

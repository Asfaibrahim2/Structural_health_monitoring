"use client";

import { useEffect, useState } from "react";
import { api, type SensorHealth } from "@/lib/api";
import { Card } from "@/components/Card";
import { Activity, RefreshCw } from "lucide-react";

function healthColor(score: number) {
  if (score >= 85) return "var(--color-sage)";
  if (score >= 65) return "var(--color-amber)";
  return "var(--color-brick)";
}

export default function SensorHealthPanel({ bridgeId }: { bridgeId?: string }) {
  const [data, setData] = useState<SensorHealth[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setData(await api.sensorHealth(bridgeId));
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [bridgeId]);

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-[var(--color-hairline)] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-accent-soft)]">
            <Activity size={16} className="text-[var(--color-accent)]" />
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-[16px] font-bold text-[var(--color-ink)]">
              Sensor Health Matrix
            </h3>
            <p className="text-[12px] text-[var(--color-ink-muted)]">Reliability scores per sensor node</p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface-sunken)] px-3 py-2 text-[12px] font-medium text-[var(--color-ink-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-[var(--color-surface-hover)]" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <p className="px-5 py-12 text-center text-[14px] text-[var(--color-ink-muted)]">No sensor data available.</p>
      ) : (
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((s) => (
            <div
              key={`${s.bridge_id}-${s.sensor_id}`}
              className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-sunken)] p-4 transition-all hover:border-[var(--color-hairline-strong)]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[14px] font-semibold text-[var(--color-ink)]">
                    {s.sensor_id.split("_").pop()?.replace("S0", "Sensor ") ?? s.sensor_id}
                  </p>
                  <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink-muted)]">{s.sensor_id}</p>
                </div>
                <span className="font-[family-name:var(--font-mono)] text-[22px] font-bold" style={{ color: healthColor(s.health_score) }}>
                  {s.health_score.toFixed(0)}
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-hover)]">
                <div className="h-full rounded-full transition-all" style={{ width: `${s.health_score}%`, backgroundColor: healthColor(s.health_score) }} />
              </div>
              <div className="mt-3 flex gap-3 text-[11px] text-[var(--color-ink-muted)]">
                <span>Missing {(s.missing_ratio * 100).toFixed(0)}%</span>
                {s.flatline_flag ? <span className="text-[var(--color-amber)]">Flatline</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

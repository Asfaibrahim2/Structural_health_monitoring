"use client";

import { useEffect, useState } from "react";
import { api, type BridgeSummary } from "@/lib/api";
import { Radio, Building2, CheckCircle2, AlertTriangle, Flame } from "lucide-react";

export default function GlobalStatusStrip() {
  const [bridges, setBridges] = useState<BridgeSummary[]>([]);

  useEffect(() => {
    api.bridges().then(setBridges).catch(() => setBridges([]));
    const id = setInterval(() => api.bridges().then(setBridges).catch(() => {}), 30000);
    return () => clearInterval(id);
  }, []);

  const activeAnomalies = bridges.reduce((s, b) => s + b.active_anomaly_count, 0);
  const p1p2 = bridges.filter((b) => ["P1", "P2"].includes(b.latest_inspection_priority)).length;
  const normal = bridges.filter((b) => b.latest_inspection_priority === "P4" && b.active_anomaly_count === 0).length;

  const stats = [
    { label: "Bridges", value: bridges.length || "—", icon: Building2, alert: false },
    { label: "Normal", value: normal, icon: CheckCircle2, alert: false },
    { label: "Anomalies", value: activeAnomalies, icon: AlertTriangle, alert: activeAnomalies > 0 },
    { label: "P1 / P2", value: p1p2, icon: Flame, alert: p1p2 > 0 },
  ];

  return (
    <div className="border-t border-[var(--color-hairline)] bg-[var(--color-bg)]/60 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-3 px-5 py-3 lg:px-8">
        <div className="flex flex-wrap gap-2.5">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="stat-pill">
                <Icon size={15} className={s.alert ? "text-[var(--color-brick)]" : "text-[var(--color-accent)]"} />
                <span className="text-[13px] font-semibold text-[var(--color-ink-muted)]">{s.label}</span>
                <span className={`font-[family-name:var(--font-mono)] text-[17px] font-bold ${s.alert ? "text-[var(--color-brick)]" : "text-[var(--color-ink)]"}`}>
                  {s.value}
                </span>
              </div>
            );
          })}
        </div>
        <div className="stat-pill">
          <Radio size={14} className="text-[var(--color-accent)] animate-pulse-soft" />
          <span className="text-[13px] font-bold text-[var(--color-ink-secondary)]">Live · Synthetic Data</span>
        </div>
      </div>
    </div>
  );
}

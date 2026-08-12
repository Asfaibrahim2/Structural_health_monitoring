"use client";

import { Activity, Radio } from "lucide-react";

export default function LiveMonitorStrip({
  bridges,
  anomalies,
  critical,
}: {
  bridges: number;
  anomalies: number;
  critical: number;
}) {
  return (
    <div className="scan-bar animate-fade-up mb-5 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-ink)] px-4 py-3 text-white shadow-[var(--shadow-card)]">
      <div className="relative z-10 flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="live-dot" />
          <span className="text-[12px] font-semibold uppercase tracking-wide text-white/90">
            Live monitoring
          </span>
        </div>

        <div className="hidden h-4 w-px bg-white/15 sm:block" />

        <div className="flex items-center gap-1.5 text-[12px] text-white/70">
          <Radio size={13} className="text-[var(--color-accent-bright)]" />
          <span>
            <strong className="font-[family-name:var(--font-mono)] text-white">{bridges}</strong> bridges streaming
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[12px] text-white/70">
          <Activity size={13} className="animate-pulse-soft text-[var(--color-amber-soft)]" />
          <span>
            <strong className="font-[family-name:var(--font-mono)] text-white">{anomalies}</strong> open anomalies
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2 rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-semibold">
          <span
            className={critical > 0 ? "text-[#fda4af] animate-pulse-soft" : "text-[#6ee7b7]"}
          >
            {critical > 0 ? `${critical} P1/P2 active` : "Fleet stable"}
          </span>
        </div>
      </div>
    </div>
  );
}

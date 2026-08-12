"use client";

// UI/UX cleanup: bridge risk card with tooltips for confidence/uncertainty.
import RiskGauge from "@/components/RiskGauge";
import Tooltip from "@/components/Tooltip";
import { TOOLTIPS } from "@/lib/status";
import type { RiskAssessment } from "@/lib/api";

export default function BridgeRiskCard({
  score,
  risk,
}: {
  score: number;
  risk?: RiskAssessment | null;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
        Risk indicator (0–100)
      </p>
      <RiskGauge score={score} label="/ 100" />
      {risk && (
        <p className="mt-3 text-[12px] text-[var(--color-ink-muted)]">
          Confidence: {risk.confidence_score.toFixed(0)}%
          <br />
          Uncertainty: ±{risk.uncertainty.toFixed(1)}
        </p>
      )}
    </div>
  );
}

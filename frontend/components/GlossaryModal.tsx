"use client";

// UI/UX cleanup: adjusted layout/labels for clarity
import React from "react";
import { X, HelpCircle, AlertCircle, TrendingUp, CloudRain, ShieldCheck } from "lucide-react";

interface GlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlossaryModal({ isOpen, onClose }: GlossaryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-lg rounded-2xl border border-[var(--color-hairline-strong)] bg-[#0d1420] p-6 shadow-2xl animate-fade-up max-h-[85vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="glossary-title"
      >
        <div className="flex items-start justify-between border-b border-[var(--color-hairline)] pb-4 mb-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="text-[var(--color-accent)]" size={20} />
            <h2 id="glossary-title" className="font-[family-name:var(--font-display)] text-[18px] font-bold text-[var(--color-ink)]">
              What do these terms mean?
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="rounded-lg p-1.5 text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)] transition-colors"
            aria-label="Close glossary"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 text-[14px]">
          {/* Section: Core Metrics */}
          <div>
            <h3 className="text-label text-[var(--color-accent-bright)] mb-2.5">Core Analytics Metrics</h3>
            <div className="space-y-3">
              <div className="rounded-xl bg-[var(--color-surface-sunken)] p-3 border border-[var(--color-hairline)]">
                <p className="font-semibold text-[var(--color-ink)]">Risk Indicator (0–100)</p>
                <p className="mt-1 text-[13px] text-[var(--color-ink-muted)] leading-relaxed">
                  Overall score showing how unusual the bridge telemetry behavior is. A higher score directly maps to a higher inspection priority band (P1 to P4).
                </p>
              </div>

              <div className="rounded-xl bg-[var(--color-surface-sunken)] p-3 border border-[var(--color-hairline)]">
                <p className="font-semibold text-[var(--color-ink)]">Confidence (%)</p>
                <p className="mt-1 text-[13px] text-[var(--color-ink-muted)] leading-relaxed">
                  How sure the AI system is of its assessment, derived from sensor operational health, noise checks, and sensor-to-sensor trend agreement.
                </p>
              </div>

              <div className="rounded-xl bg-[var(--color-surface-sunken)] p-3 border border-[var(--color-hairline)]">
                <p className="font-semibold text-[var(--color-ink)]">Uncertainty (± points)</p>
                <p className="mt-1 text-[13px] text-[var(--color-ink-muted)] leading-relaxed">
                  Estimated margin of error around the risk indicator score. This range expands when packet drops occur or when sensor inputs are heavily noisy.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Anomaly Types */}
          <div>
            <h3 className="text-label text-[var(--color-accent-bright)] mb-2.5">Telemetry Anomaly Categories</h3>
            <ul className="space-y-3 pl-1">
              <li className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 text-[var(--color-brick)] shrink-0" size={16} />
                <div>
                  <p className="font-semibold text-[var(--color-ink)] leading-snug">Sudden Spike</p>
                  <p className="text-[13px] text-[var(--color-ink-muted)] leading-relaxed">
                    Sharp, short-term telemetry deviations occurring rapidly (e.g. from extreme impact or sudden overload).
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <TrendingUp className="mt-0.5 text-[var(--color-orange)] shrink-0" size={16} />
                <div>
                  <p className="font-semibold text-[var(--color-ink)] leading-snug">Persistent Anomaly</p>
                  <p className="text-[13px] text-[var(--color-ink-muted)] leading-relaxed">
                    Abnormal structural behavior that continues sustained for many minutes or hours, indicating non-transient load holding.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 text-[var(--color-amber)] shrink-0" size={16} />
                <div>
                  <p className="font-semibold text-[var(--color-ink)] leading-snug">Gradual Deterioration</p>
                  <p className="text-[13px] text-[var(--color-ink-muted)] leading-relaxed">
                    Slow, steady increase in strain or displacement telemetry drift over days/weeks, suggesting wear.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <CloudRain className="mt-0.5 text-[var(--color-accent)] shrink-0" size={16} />
                <div>
                  <p className="font-semibold text-[var(--color-ink)] leading-snug">Environmental Disturbance</p>
                  <p className="text-[13px] text-[var(--color-ink-muted)] leading-relaxed">
                    Telemetry deviations mainly explained by local ambient context: air temperature cycles, rainfall, or brief wind spikes.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-[var(--color-hairline)] pt-4">
          <button 
            onClick={onClose} 
            className="rounded-xl bg-[var(--color-accent)] px-5 py-2 text-[13px] font-semibold text-[var(--color-bg)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

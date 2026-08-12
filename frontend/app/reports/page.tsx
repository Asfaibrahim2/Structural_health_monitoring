"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api, type BridgeSummary, type AnomalyEvent, type SensorHealth, type SensorReading, type RiskAssessment } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import BridgeSelector from "@/components/BridgeSelector";
import { Card } from "@/components/Card";
import PriorityBadge from "@/components/PriorityBadge";
import RiskGauge from "@/components/RiskGauge";
import SensorChart from "@/components/SensorChart";
import SensorHealthPanel from "@/components/SensorHealthPanel";
import { LoadingState, ErrorState } from "@/components/ui/AsyncState";
import { Download, FileText } from "lucide-react";

function ReportsContent() {
  const searchParams = useSearchParams();
  const [bridgeId, setBridgeId] = useState("");
  const [bridges, setBridges] = useState<BridgeSummary[]>([]);
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [events, setEvents] = useState<AnomalyEvent[]>([]);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [health, setHealth] = useState<SensorHealth[]>([]);
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
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
    Promise.all([
      api.bridgeLatest(bridgeId),
      api.events(bridgeId, 20),
      api.timeseries(bridgeId, 80),
      api.sensorHealth(bridgeId),
    ])
      .then(([latest, ev, ts, h]) => {
        setRisk(latest.latest_risk);
        setEvents(ev);
        setReadings(ts);
        setHealth(h);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [bridgeId]);

  const bridge = bridges.find((b) => b.bridge_id === bridgeId);

  async function generateReport() {
    if (!bridge) return;
    setGenerating(true);
    try {
      const res = await api.generateReport(bridgeId, `Engineer Report — ${bridge.bridge_name}`);
      setReportHtml(res.report_html);
      setReportId(res.report_id);
    } catch {
      alert("Report generation failed. Is the backend running?");
    } finally {
      setGenerating(false);
    }
  }

  function downloadReport() {
    if (!reportHtml || !bridge) return;
    const blob = new Blob([reportHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `infrashield-report-${bridgeId}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadPdf() {
    if (!reportId || !bridge) return;
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    window.open(`${baseUrl}/api/reports/${reportId}/download`, "_blank");
  }

  return (
    <>
      <PageHeader
        title="Reports"
        description="Review evidence and generate an inspection report for a bridge."
      />

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="min-w-[240px] flex-1 max-w-md">
          <label className="mb-1.5 block text-[12px] font-medium text-[var(--color-ink-muted)]">Bridge</label>
          <BridgeSelector value={bridgeId} onChange={setBridgeId} />
        </div>
        <button
          onClick={generateReport}
          disabled={generating || !bridgeId}
          className="flex items-center gap-2 rounded-[var(--radius-btn)] bg-[var(--color-accent)] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          <FileText size={16} />
          {generating ? "Generating…" : "Generate report"}
        </button>
        {reportHtml && (
          <>
            <button
              onClick={downloadReport}
              className="flex items-center gap-2 rounded-xl border border-[var(--color-hairline)] px-5 py-3 text-[14px] font-semibold hover:border-[var(--color-accent)]"
            >
              <Download size={16} /> Download HTML
            </button>
            <button
              onClick={downloadPdf}
              className="flex items-center gap-2 rounded-xl border border-[var(--color-hairline)] px-5 py-3 text-[14px] font-semibold hover:border-[var(--color-accent)]"
            >
              <FileText size={16} /> Download PDF
            </button>
          </>
        )}
      </div>

      {error && <ErrorState onRetry={() => window.location.reload()} />}
      {loading && !error && <LoadingState />}
      {!loading && !error && bridge && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <h3 className="font-[family-name:var(--font-display)] text-[17px] font-bold">Risk evidence</h3>
            <div className="mt-4 flex flex-col items-center">
              <RiskGauge score={risk?.risk_score ?? bridge.latest_risk_score} size={140} />
              <PriorityBadge priority={risk?.inspection_priority ?? bridge.latest_inspection_priority} />
            </div>
            {risk && (
              <div className="mt-4 space-y-2 text-[13px] text-[var(--color-ink-secondary)]">
                <p>Confidence: <strong>{risk.confidence_score.toFixed(0)}%</strong></p>
                <p>Uncertainty: <strong>±{risk.uncertainty.toFixed(1)}</strong></p>
                <p className="mt-3 rounded-lg bg-[var(--color-surface-sunken)] p-3 text-[12px] leading-relaxed">{risk.risk_explanation}</p>
              </div>
            )}
          </Card>

          <Card className="lg:col-span-2">
            <h3 className="font-[family-name:var(--font-display)] text-[17px] font-bold">Structural charts</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <SensorChart readings={readings} dataKey="strain_microstrain" label="Strain" color="#38bdf8" tall />
              <SensorChart readings={readings} dataKey="vibration_g" label="Vibration" color="#f87171" tall />
              <SensorChart readings={readings} dataKey="displacement_mm" label="Displacement" color="#fb923c" tall />
            </div>
          </Card>

          <Card className="lg:col-span-3">
            <h3 className="font-[family-name:var(--font-display)] text-[17px] font-bold">Anomaly timeline</h3>
            {events.length === 0 ? (
              <p className="mt-3 text-[14px] text-[var(--color-ink-muted)]">No anomaly events recorded.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {events.map((e) => (
                  <li key={e.id} className="flex flex-wrap gap-3 rounded-lg border border-[var(--color-hairline)] px-4 py-3 text-[13px]">
                    <span className="font-mono text-[var(--color-ink-muted)]">{e.start_time}</span>
                    <span className="font-semibold">{e.anomaly_type.replace(/_/g, " ")}</span>
                    <span>{e.severity}</span>
                    <span className="text-[var(--color-ink-muted)]">{e.duration_minutes} min · {e.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="lg:col-span-3">
            <SensorHealthPanel bridgeId={bridgeId} />
          </div>
        </div>
      )}

      {reportHtml && (
        <Card className="mt-6 overflow-hidden p-0">
          <div className="border-b border-[var(--color-hairline)] px-5 py-3">
            <h3 className="font-semibold">Report preview</h3>
          </div>
          <iframe title="Report preview" srcDoc={reportHtml} className="h-[500px] w-full bg-white" />
        </Card>
      )}
    </>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ReportsContent />
    </Suspense>
  );
}

"use client";

// UI/UX cleanup: ESP32 hardware bridge demo page with live/demo mode.
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import Disclaimer from "@/components/Disclaimer";
import { Card } from "@/components/Card";
import StatusChip from "@/components/StatusChip";
import PriorityBadge from "@/components/PriorityBadge";
import RiskGauge from "@/components/RiskGauge";
import SensorChart from "@/components/SensorChart";
import Tooltip from "@/components/Tooltip";
import { TOOLTIPS, riskToPriority } from "@/lib/status";
import type { SensorReading } from "@/lib/api";
import { Wifi, WifiOff } from "lucide-react";

const HW_BRIDGE_ID = "TS-STR-001"; // demo: use first bridge data as proxy

interface HwEvent {
  time: string;
  status: string;
  risk: number;
  action: string;
}

function demoReading(prev?: SensorReading): SensorReading {
  const base = prev ?? {
    bridge_id: HW_BRIDGE_ID,
    sensor_id: "ESP32_NODE",
    timestamp: new Date().toISOString(),
    strain_microstrain: 48,
    vibration_g: 0.012,
    displacement_mm: 10.1,
    temperature_c: 28,
    humidity_percent: 55,
    rainfall_mm: 0,
    traffic_load_percent: 45,
    wind_speed_mps: 2,
    scenario: "hardware",
    ground_truth_anomaly: 0,
  };
  const jitter = () => (Math.random() - 0.5) * 0.002;
  return {
    ...base,
    timestamp: new Date().toISOString(),
    vibration_g: Math.max(0.001, (base.vibration_g ?? 0.012) + jitter()),
    displacement_mm: (base.displacement_mm ?? 10.1) + jitter() * 10,
    temperature_c: (base.temperature_c ?? 28) + (Math.random() - 0.5) * 0.5,
    traffic_load_percent: Math.min(100, Math.max(0, (base.traffic_load_percent ?? 45) + (Math.random() - 0.5) * 5)),
  };
}

function hwStatus(vib: number): "normal" | "warning" | "critical" {
  if (vib > 0.025) return "critical";
  if (vib > 0.018) return "warning";
  return "normal";
}

export default function HardwarePage() {
  const [mode, setMode] = useState<"live" | "demo">("demo");
  const [online, setOnline] = useState(false);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [latest, setLatest] = useState<SensorReading | null>(null);
  const [risk, setRisk] = useState(15);
  const [events, setEvents] = useState<HwEvent[]>([]);

  const pushEvent = useCallback((status: string, riskVal: number, action: string) => {
    setEvents((prev) => [
      { time: new Date().toLocaleTimeString(), status, risk: riskVal, action },
      ...prev.slice(0, 19),
    ]);
  }, []);

  useEffect(() => {
    if (mode === "demo") {
      setOnline(true);
      localStorage.setItem("infrashield_hw_online", "true");
      const tick = () => {
        setLatest((prev) => {
          const next = demoReading(prev ?? undefined);
          setReadings((r) => [...r.slice(-59), next]);
          const vib = next.vibration_g ?? 0.012;
          const newRisk = Math.min(100, 12 + vib * 800 + (next.traffic_load_percent ?? 0) * 0.2);
          setRisk(newRisk);
          const st = hwStatus(vib);
          if (st === "critical") pushEvent("HIGH ANOMALY", newRisk, "Buzzer ON · LED RED");
          else if (st === "warning") pushEvent("WARNING", newRisk, "LED YELLOW");
          return next;
        });
      };
      tick();
      const id = setInterval(tick, 3000);
      return () => clearInterval(id);
    }

    // Live mode: poll backend for proxy bridge
    setOnline(false);
    localStorage.setItem("infrashield_hw_online", "false");
    api.bridgeLatest(HW_BRIDGE_ID)
      .then((res) => {
        if (res.latest_reading) {
          setLatest(res.latest_reading);
          setReadings((r) => [...r.slice(-59), res.latest_reading!]);
          setOnline(true);
          localStorage.setItem("infrashield_hw_online", "true");
          const rs = res.latest_risk?.risk_score ?? 15;
          setRisk(rs);
        }
      })
      .catch(() => setOnline(false));
  }, [mode, pushEvent]);

  const vib = latest?.vibration_g ?? 0;
  const status = hwStatus(vib);
  const priority = riskToPriority(risk);

  return (
    <>
      <PageHeader
        eyebrow="System B · Independent Demo"
        title="Hardware Prototype"
        description="ESP32 mini-bridge with MPU6050, displacement sensor, and local LED/OLED risk indication. Runs independently — no connection to the AI software dashboard required."
        breadcrumbs={[{ label: "Command Center", href: "/" }, { label: "Hardware Prototype" }]}
      />
      <Disclaimer className="mb-4" />

      <Card className="mb-6 border-[var(--color-accent)]/25 bg-[var(--color-accent-soft)]/40">
        <p className="text-[13px] leading-relaxed text-[var(--color-ink-secondary)]">
          <strong className="text-[var(--color-ink)]">Hackathon strategy:</strong> The hardware demonstrates the physical sensing layer (vibration, displacement, local LEDs).
          The software platform uses synthetic data for the full AI monitoring pipeline. They are shown together conceptually but do not depend on each other.
        </p>
      </Card>

      {/* Status strip */}
      <Card className="mb-6 flex flex-wrap items-center gap-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2">
          {online ? <Wifi size={16} className="text-[#15803d]" /> : <WifiOff size={16} className="text-[var(--color-grey)]" />}
          <span className="text-[13px] font-medium">{online ? "Online" : "Offline"}</span>
        </div>
        <span className="text-[var(--color-hairline)]">|</span>
        <span className="text-[13px] text-[var(--color-ink-muted)]">
          Bridge: <strong className="text-[var(--color-ink)]">ESP32-MINI-01</strong>
        </span>
        <span className="text-[var(--color-hairline)]">|</span>
        <div className="flex gap-2">
          {(["demo", "live"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-3 py-1 text-[12px] font-medium capitalize ${
                mode === m ? "bg-[var(--color-structural)] text-white" : "bg-[var(--color-paper)] text-[var(--color-ink-muted)]"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[12px] text-[var(--color-ink-muted)]">
          Last update: {latest ? new Date(latest.timestamp).toLocaleTimeString() : "—"}
        </span>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left: hardware readings */}
        <div className="space-y-4">
          <Card className="shadow-[var(--shadow-card)]">
            <h3 className="font-[family-name:var(--font-display)] text-[16px] font-semibold">Live hardware readings</h3>
            <p className="text-[12.5px] text-[var(--color-ink-muted)]">Raw sensor values from ESP32</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                ["Vibration (g)", latest?.vibration_g?.toFixed(4) ?? "—"],
                ["Displacement (mm)", latest?.displacement_mm?.toFixed(2) ?? "—"],
                ["Temperature (°C)", latest?.temperature_c?.toFixed(1) ?? "—"],
                ["Traffic / load (%)", latest?.traffic_load_percent?.toFixed(0) ?? "—"],
              ].map(([label, val]) => (
                <div key={String(label)} className="rounded-lg bg-[var(--color-paper)] px-3 py-2.5">
                  <p className="text-[10.5px] text-[var(--color-ink-muted)]">{label}</p>
                  <p className="font-[family-name:var(--font-mono)] text-[20px] font-semibold">{val}</p>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <StatusChip kind={status === "normal" ? "normal" : status === "warning" ? "warning" : "critical"} />
            </div>
          </Card>
          {readings.length > 2 && (
            <Card className="shadow-[var(--shadow-card)]">
              <SensorChart readings={readings} dataKey="vibration_g" label="Vibration trend" color="#b91c1c" tall />
            </Card>
          )}
        </div>

        {/* Right: software interpretation */}
        <div className="space-y-4">
          <Card className="shadow-[var(--shadow-card)]">
            <h3 className="font-[family-name:var(--font-display)] text-[16px] font-semibold">Software interpretation</h3>
            <p className="text-[12.5px] text-[var(--color-ink-muted)]">Same risk engine as synthetic mode</p>
            <div className="mt-4 flex flex-col items-center">
              <RiskGauge score={risk} size={140} label="/ 100" />
              <div className="mt-2"><PriorityBadge priority={priority} /></div>
            </div>
            <p className="mt-3 text-center text-[12px] text-[var(--color-ink-muted)]">
              Risk indicator <Tooltip text={TOOLTIPS.risk} />
            </p>
          </Card>

          <Card className="overflow-hidden p-0 shadow-[var(--shadow-card)]">
            <div className="border-b border-[var(--color-hairline)] px-4 py-3">
              <h3 className="font-[family-name:var(--font-display)] text-[15px] font-semibold">Event log</h3>
              <p className="text-[12px] text-[var(--color-ink-muted)]">Hardware alerts and actions</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-[var(--color-hairline)] bg-[var(--color-paper)] text-[10px] uppercase text-[var(--color-ink-muted)]">
                    <th className="px-4 py-2">Time</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Risk</th>
                    <th className="px-4 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-[var(--color-ink-muted)]">Waiting for events…</td></tr>
                  ) : (
                    events.map((e, i) => (
                      <tr key={i} className="border-b border-[var(--color-hairline)] last:border-0">
                        <td className="px-4 py-2 font-[family-name:var(--font-mono)] text-[11px]">{e.time}</td>
                        <td className="px-4 py-2">{e.status}</td>
                        <td className="px-4 py-2 font-[family-name:var(--font-mono)]">{e.risk.toFixed(1)}</td>
                        <td className="px-4 py-2 text-[var(--color-ink-muted)]">{e.action}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-6 shadow-[var(--shadow-card)]">
        <p className="text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
          This mini bridge uses an <strong>ESP32</strong> with strain, vibration, and displacement sensors.
          It sends live data to InfraShield AI, which runs the same anomaly detection and risk scoring engine as the synthetic fleet.
        </p>
      </Card>
    </>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/Card";
import { AreaChart, Area, XAxis, YAxis, Tooltip as ChartTooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Info, TrendingUp } from "lucide-react";
import PriorityBadge from "@/components/PriorityBadge";

interface ForecastItem {
  timestamp: string;
  risk_score: number;
  risk_lower: number;
  risk_upper: number;
  sensor_trend: number;
  sensor_lower: number;
  sensor_upper: number;
}

export default function ForecastCard({ bridgeId }: { bridgeId: string }) {
  const [horizon, setHorizon] = useState<number>(10);
  const [method, setMethod] = useState<string>("rolling_regression");
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"risk" | "sensor">("risk");

  useEffect(() => {
    if (!bridgeId) return;
    setLoading(true);
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    fetch(`${baseUrl}/api/bridges/${bridgeId}/forecast?horizon=${horizon}&method=${method}`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Forecast failed");
      })
      .then((data) => {
        setForecast(data.forecast ?? []);
      })
      .catch((err) => {
        console.error(err);
        setForecast([]);
      })
      .finally(() => setLoading(false));
  }, [bridgeId, horizon, method]);

  const chartData = forecast.map((item) => {
    const time = new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return {
      time,
      risk: item.risk_score,
      riskLower: Math.max(0, item.risk_lower),
      riskUpper: Math.min(100, item.risk_upper),
      riskBand: Math.max(0, Math.min(100, item.risk_upper) - Math.max(0, item.risk_lower)),
      sensor: item.sensor_trend,
      sensorLower: Math.max(0, item.sensor_lower),
      sensorUpper: item.sensor_upper,
      sensorBand: Math.max(0, item.sensor_upper - Math.max(0, item.sensor_lower)),
    };
  });

  const getSimulatedPriority = (score: number) => {
    if (score >= 80) return "P1";
    if (score >= 60) return "P2";
    if (score >= 35) return "P3";
    return "P4";
  };

  const finalForecast = forecast[forecast.length - 1];

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--color-hairline)] pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-[var(--color-accent)]" size={18} />
          <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">Trend projection</h3>
        </div>
        <div className="flex gap-1 rounded-[var(--radius-btn)] border border-[var(--color-hairline)] bg-[var(--color-surface-sunken)] p-1">
          {(["risk", "sensor"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-[5px] px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors ${
                activeTab === tab
                  ? "bg-white text-[var(--color-accent)] shadow-sm"
                  : "text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]"
              }`}
            >
              {tab === "risk" ? "Risk score" : "Vibration"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-3 text-[12px]">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-secondary)]">
            Method
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full rounded-[var(--radius-btn)] border border-[var(--color-hairline)] bg-white px-2 py-1.5 text-[12px] font-medium text-[var(--color-ink)]"
          >
            <option value="rolling_regression">Rolling linear trend</option>
            <option value="exponential_smoothing">Holt linear smoothing</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-secondary)]">
            Horizon
          </label>
          <div className="flex gap-1">
            {[5, 10, 15, 20].map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`flex-1 rounded-[var(--radius-btn)] border py-1.5 text-[11px] font-semibold transition-colors ${
                  horizon === h
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                    : "border-[var(--color-hairline)] bg-white text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]"
                }`}
              >
                {h}m
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-[160px] w-full rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-white p-2">
        {loading ? (
          <div className="flex h-full w-full items-center justify-center text-[12px] text-[var(--color-ink-secondary)]">
            Calculating projection…
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center text-[12px] text-[var(--color-ink-secondary)]">
            No history to project.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="time" tick={{ fill: "#4b5563", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis
                domain={activeTab === "risk" ? [0, 100] : ["auto", "auto"]}
                tick={{ fill: "#4b5563", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
              <ChartTooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  color: "#111827",
                  boxShadow: "0 4px 12px rgba(17,24,39,0.08)",
                }}
                labelStyle={{ fontSize: 10, color: "#6b7280" }}
                itemStyle={{ fontSize: 11, color: "#111827" }}
              />
              {activeTab === "risk" ? (
                <>
                  <Area type="monotone" dataKey="riskLower" stackId="band" stroke="none" fill="transparent" />
                  <Area
                    type="monotone"
                    dataKey="riskBand"
                    stackId="band"
                    stroke="none"
                    fill="#0f766e"
                    fillOpacity={0.12}
                    name="Range"
                  />
                  <Area
                    type="monotone"
                    dataKey="risk"
                    stroke="#0f766e"
                    strokeWidth={2}
                    fill="#0f766e"
                    fillOpacity={0.08}
                    name="Risk projection"
                  />
                </>
              ) : (
                <>
                  <Area type="monotone" dataKey="sensorLower" stackId="sband" stroke="none" fill="transparent" />
                  <Area
                    type="monotone"
                    dataKey="sensorBand"
                    stackId="sband"
                    stroke="none"
                    fill="#ea580c"
                    fillOpacity={0.12}
                    name="Range"
                  />
                  <Area
                    type="monotone"
                    dataKey="sensor"
                    stroke="#ea580c"
                    strokeWidth={2}
                    fill="#ea580c"
                    fillOpacity={0.08}
                    name="Vibration projection"
                  />
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {finalForecast && (
        <div className="space-y-2 border-t border-[var(--color-hairline)] pt-3 text-[13px]">
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-ink-secondary)]">Projected risk range</span>
            <span className="font-[family-name:var(--font-mono)] font-semibold text-[var(--color-ink)]">
              {finalForecast.risk_lower.toFixed(0)} – {finalForecast.risk_upper.toFixed(0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-ink-secondary)]">Projected priority</span>
            <PriorityBadge priority={getSimulatedPriority(finalForecast.risk_score)} compact />
          </div>
        </div>
      )}

      <div className="flex gap-2 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface-sunken)] p-3 text-[12px] leading-relaxed text-[var(--color-ink-secondary)]">
        <Info className="mt-0.5 shrink-0 text-[var(--color-accent)]" size={15} />
        <div>
          <span className="mb-0.5 block font-semibold text-[var(--color-ink)]">Statistical trend boundary</span>
          Expected risk and telemetry range over the selected horizon.
        </div>
      </div>
    </Card>
  );
}

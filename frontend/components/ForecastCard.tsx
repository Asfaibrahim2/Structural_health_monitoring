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
        setForecast(data.forecast);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [bridgeId, horizon, method]);

  // Map data for charts
  const chartData = forecast.map((item) => {
    const time = new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return {
      time,
      risk: item.risk_score,
      riskLower: Math.max(0, item.risk_lower),
      riskUpper: Math.min(100, item.risk_upper),
      sensor: item.sensor_trend,
      sensorLower: Math.max(0, item.sensor_lower),
      sensorUpper: item.sensor_upper,
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
    <Card className="shadow-[var(--shadow-card)] space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--color-hairline)] pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-[var(--color-accent-bright)]" size={18} />
          <h3 className="font-[family-name:var(--font-display)] text-[15px] font-bold">
            Trend Projection
          </h3>
        </div>
        <div className="flex gap-1.5 bg-[var(--color-surface-sunken)] p-1 rounded-lg border border-[var(--color-hairline)]">
          {(["risk", "sensor"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded px-2.5 py-1 text-[11px] font-bold capitalize transition-all ${
                activeTab === tab
                  ? "bg-[var(--color-accent)] text-[var(--color-bg)]"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              {tab === "risk" ? "Risk Score" : "Vibration"}
            </button>
          ))}
        </div>
      </div>

      {/* Configuration Controls */}
      <div className="grid grid-cols-2 gap-3 text-[12px] bg-[var(--color-surface-sunken)] p-3 rounded-xl border border-[var(--color-hairline)]">
        <div>
          <label className="text-[10px] uppercase font-bold text-[var(--color-ink-muted)] block mb-1">Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-lg px-2 py-1 text-[11px] text-[var(--color-ink)]"
          >
            <option value="rolling_regression">Rolling Linear Trend</option>
            <option value="exponential_smoothing">Holt Linear smoothing</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold text-[var(--color-ink-muted)] block mb-1">Horizon</label>
          <div className="flex gap-1">
            {[5, 10, 15, 20].map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`flex-1 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                  horizon === h
                    ? "bg-[var(--color-surface)] border-[var(--color-accent)] text-[var(--color-accent-bright)]"
                    : "bg-[var(--color-surface)] border-[var(--color-hairline)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                }`}
              >
                {h}m
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Projection Chart */}
      <div className="h-[150px] w-full rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-sunken)]/40 p-2">
        {loading ? (
          <div className="flex h-full w-full items-center justify-center text-[12px] text-[var(--color-ink-muted)]">
            Calculating projection...
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center text-[12px] text-[var(--color-ink-muted)]">
            No history to project.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <XAxis dataKey="time" tick={{ fill: "var(--color-ink-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis
                domain={activeTab === "risk" ? [0, 100] : ["auto", "auto"]}
                tick={{ fill: "var(--color-ink-muted)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <CartesianGrid stroke="var(--color-hairline)" strokeDasharray="3 3" vertical={false} />
              <ChartTooltip
                contentStyle={{ background: "#0d1420", border: "1px solid var(--color-hairline)", borderRadius: 8 }}
                labelStyle={{ fontSize: 10, color: "var(--color-ink-muted)" }}
                itemStyle={{ fontSize: 11, color: "var(--color-ink)" }}
              />
              {activeTab === "risk" ? (
                <>
                  <Area
                    type="monotone"
                    dataKey="riskUpper"
                    stroke="none"
                    fill="var(--color-accent)"
                    fillOpacity={0.06}
                  />
                  <Area
                    type="monotone"
                    dataKey="riskLower"
                    stroke="none"
                    fill="#0d1420"
                    fillOpacity={1}
                  />
                  <Area
                    type="monotone"
                    dataKey="risk"
                    stroke="var(--color-accent-bright)"
                    strokeWidth={2}
                    fill="var(--color-accent)"
                    fillOpacity={0.12}
                    name="Risk projection"
                  />
                </>
              ) : (
                <>
                  <Area
                    type="monotone"
                    dataKey="sensorUpper"
                    stroke="none"
                    fill="var(--color-orange)"
                    fillOpacity={0.06}
                  />
                  <Area
                    type="monotone"
                    dataKey="sensorLower"
                    stroke="none"
                    fill="#0d1420"
                    fillOpacity={1}
                  />
                  <Area
                    type="monotone"
                    dataKey="sensor"
                    stroke="var(--color-orange)"
                    strokeWidth={2}
                    fill="var(--color-orange)"
                    fillOpacity={0.12}
                    name="Vibration projection"
                  />
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {finalForecast && (
        <div className="space-y-2 border-t border-[var(--color-hairline)] pt-3 text-[12.5px]">
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-ink-muted)]">Projected Risk boundary</span>
            <span className="font-mono font-bold text-[var(--color-ink)]">
              {finalForecast.risk_lower.toFixed(0)} - {finalForecast.risk_upper.toFixed(0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-ink-muted)]">Projected Priority band</span>
            <PriorityBadge priority={getSimulatedPriority(finalForecast.risk_score)} compact />
          </div>
        </div>
      )}

      {/* Info & Warning */}
      <div className="flex gap-2 rounded-lg bg-[var(--color-surface-sunken)] p-3 border border-[var(--color-hairline)] text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
        <Info className="text-[var(--color-accent)] shrink-0 mt-0.5" size={15} />
        <div>
          <span className="font-semibold text-[var(--color-ink)] block">Statistical Trend Boundary</span>
          Expected risk indicator and telemetry limits projected over the selected time horizon.
        </div>
      </div>
    </Card>
  );
}

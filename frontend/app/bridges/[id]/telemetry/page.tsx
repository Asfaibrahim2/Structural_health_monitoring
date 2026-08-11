import { api } from "@/lib/api";
import { Card } from "@/components/Card";
import SensorChart from "@/components/SensorChart";

export default async function BridgeTelemetryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const readings = await api.timeseries(id, 300).catch(() => []);

  return (
  <div className="space-y-6">
      <Card className="shadow-[var(--shadow-card)]">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
          Structural sensors
        </p>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <SensorChart readings={readings} dataKey="strain_microstrain" label="Strain (µε)" color="var(--color-structural)" tall />
          <SensorChart readings={readings} dataKey="vibration_g" label="Vibration (g)" color="var(--color-rose)" tall />
          <SensorChart readings={readings} dataKey="displacement_mm" label="Displacement (mm)" color="var(--color-amber)" tall />
        </div>
      </Card>

      <Card className="shadow-[var(--shadow-card)]">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
          Environmental & operational
        </p>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <SensorChart readings={readings} dataKey="temperature_c" label="Temperature (°C)" color="var(--color-brick)" tall />
          <SensorChart readings={readings} dataKey="rainfall_mm" label="Rainfall (mm)" color="#4a90a4" tall />
          <SensorChart readings={readings} dataKey="traffic_load_percent" label="Traffic load (%)" color="#6b5b95" tall />
          <SensorChart readings={readings} dataKey="humidity_percent" label="Humidity (%)" color="#7c9a85" tall />
          <SensorChart readings={readings} dataKey="wind_speed_mps" label="Wind speed (m/s)" color="#64748b" tall />
        </div>
      </Card>

      <p className="text-[12px] text-[var(--color-ink-muted)]">
        Showing last {readings.length} readings. Data refreshes on page load.
      </p>
    </div>
  );
}

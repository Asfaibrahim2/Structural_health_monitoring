import { api } from "@/lib/api";
import { Card } from "@/components/Card";

export default async function BridgeEventsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const events = await api.events(id, 50).catch(() => []);

  return (
    <Card className="overflow-hidden p-0 shadow-[var(--shadow-card)]">
      {events.length === 0 ? (
        <p className="px-5 py-10 text-center text-[13px] text-[var(--color-ink-muted)]">
          No anomaly events logged for this structure.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-hairline)] bg-[var(--color-paper)] text-[11px] uppercase tracking-wide text-[var(--color-ink-muted)]">
                <th className="px-5 py-3 font-semibold">Start</th>
                <th className="px-5 py-3 font-semibold">End</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold">Severity</th>
                <th className="px-5 py-3 font-semibold">Duration</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-b border-[var(--color-hairline)] last:border-0 hover:bg-[var(--color-paper)]/50">
                  <td className="px-5 py-3 font-[family-name:var(--font-mono)] text-[11.5px] text-[var(--color-ink-muted)]">
                    {e.start_time}
                  </td>
                  <td className="px-5 py-3 font-[family-name:var(--font-mono)] text-[11.5px] text-[var(--color-ink-muted)]">
                    {e.end_time ?? "—"}
                  </td>
                  <td className="px-5 py-3 font-medium">{e.anomaly_type.replace(/_/g, " ")}</td>
                  <td className="px-5 py-3">
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        backgroundColor: e.severity === "CRITICAL" ? "var(--color-brick-soft)" : "var(--color-amber-soft)",
                        color: e.severity === "CRITICAL" ? "var(--color-brick)" : "var(--color-amber)",
                      }}
                    >
                      {e.severity}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[var(--color-ink-muted)]">{e.duration_minutes} min</td>
                  <td className="px-5 py-3 text-[var(--color-ink-muted)]">{e.status}</td>
                  <td className="max-w-xs px-5 py-3 text-[var(--color-ink-muted)]">{e.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

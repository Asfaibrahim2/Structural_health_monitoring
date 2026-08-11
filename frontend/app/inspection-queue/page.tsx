"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { api, type InspectionQueueItem, type InspectionPriority } from "@/lib/api";
import { Card } from "@/components/Card";
import PriorityBadge from "@/components/PriorityBadge";
import PageHeader from "@/components/PageHeader";
import Disclaimer from "@/components/Disclaimer";
import Tooltip from "@/components/Tooltip";
import { TOOLTIPS, PRIORITY_STATUS } from "@/lib/status";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/AsyncState";
import clsx from "clsx";
import { ArrowUpDown } from "lucide-react";

type SortKey = "priority" | "risk" | "confidence" | "uncertainty" | "bridge";
const PRIORITY_ORDER: Record<InspectionPriority, number> = { P1: 0, P2: 1, P3: 2, P4: 3 };

export default function InspectionQueuePage() {
  const [queue, setQueue] = useState<InspectionQueueItem[]>([]);
  const [filter, setFilter] = useState<InspectionPriority | "ALL">("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [sortAsc, setSortAsc] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    api.inspectionQueue().then(setQueue).catch(() => setError(true)).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const sorted = useMemo(() => {
    let items = filter === "ALL" ? [...queue] : queue.filter((i) => i.inspection_priority === filter);
    items.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "priority") cmp = PRIORITY_ORDER[a.inspection_priority] - PRIORITY_ORDER[b.inspection_priority];
      else if (sortKey === "risk") cmp = a.risk_score - b.risk_score;
      else if (sortKey === "confidence") cmp = a.confidence_score - b.confidence_score;
      else if (sortKey === "uncertainty") cmp = a.uncertainty - b.uncertainty;
      else cmp = a.bridge_name.localeCompare(b.bridge_name);
      return sortAsc ? cmp : -cmp;
    });
    return items;
  }, [queue, filter, sortKey, sortAsc]);

  const counts = { P1: 0, P2: 0, P3: 0, P4: 0 };
  queue.forEach((i) => counts[i.inspection_priority]++);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(key === "bridge"); }
  }

  function SortHeader({ label, col }: { label: string; col: SortKey }) {
    return (
      <button onClick={() => toggleSort(col)} className="flex items-center gap-1 font-semibold hover:text-[var(--color-accent)]">
        {label} <ArrowUpDown size={12} />
      </button>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Stage F · Page 4"
        title="Inspection Queue"
        description="Sortable priority table — the main decision-support output. Each row shows risk, confidence, uncertainty, main reason, and recommended action."
        breadcrumbs={[{ label: "Command Center", href: "/" }, { label: "Inspection Queue" }]}
      />
      <Disclaimer className="mb-6" />

      <div className="mb-4 flex flex-wrap gap-2">
        {(["ALL", "P1", "P2", "P3", "P4"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            className={clsx("rounded-full px-4 py-2 text-[13px] font-semibold transition-colors", filter === p && "ring-2 ring-[var(--color-accent)]")}
            style={p === "ALL" ? { background: "var(--color-grey-soft)", color: "var(--color-ink)" } : { background: PRIORITY_STATUS[p].bg, color: PRIORITY_STATUS[p].fg }}
          >
            {p === "ALL" ? `All (${queue.length})` : `${p} (${counts[p]})`}
          </button>
        ))}
      </div>

      {error && <ErrorState onRetry={load} />}
      {loading && !error && <LoadingState message="Loading inspection queue…" />}
      {!loading && !error && sorted.length === 0 && <EmptyState title="No matches" message="No structures match this filter." />}

      {!loading && !error && sorted.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-[14px]">
              <thead>
                <tr className="border-b border-[var(--color-hairline)] bg-[var(--color-surface-sunken)] text-[12px] uppercase tracking-wide text-[var(--color-ink-muted)]">
                  <th className="px-4 py-3.5">#</th>
                  <th className="px-4 py-3.5"><SortHeader label="Bridge" col="bridge" /></th>
                  <th className="px-4 py-3.5"><SortHeader label="Risk" col="risk" /></th>
                  <th className="px-4 py-3.5"><SortHeader label="Confidence" col="confidence" /></th>
                  <th className="px-4 py-3.5"><SortHeader label="Uncertainty" col="uncertainty" /></th>
                  <th className="px-4 py-3.5"><SortHeader label="Priority" col="priority" /></th>
                  <th className="px-4 py-3.5">Main reason</th>
                  <th className="px-4 py-3.5">Recommended action</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((item, i) => (
                  <tr key={item.bridge_id} className="border-b border-[var(--color-hairline)] last:border-0 hover:bg-[var(--color-surface-hover)]">
                    <td className="px-4 py-4 font-mono text-[var(--color-ink-muted)]">{String(i + 1).padStart(2, "0")}</td>
                    <td className="px-4 py-4">
                      <Link href={`/bridges/${item.bridge_id}`} className="font-semibold hover:text-[var(--color-accent)]">{item.bridge_name}</Link>
                      <p className="font-mono text-[11px] text-[var(--color-ink-muted)]">{item.bridge_id}</p>
                    </td>
                    <td className="px-4 py-4 font-mono text-[16px] font-bold">{item.risk_score.toFixed(1)}</td>
                    <td className="px-4 py-4 font-mono">{((item.confidence_score ?? 0)).toFixed(0)}% <Tooltip text={TOOLTIPS.confidence} /></td>
                    <td className="px-4 py-4 font-mono text-[var(--color-ink-muted)]">±{item.uncertainty.toFixed(1)}</td>
                    <td className="px-4 py-4"><PriorityBadge priority={item.inspection_priority} /></td>
                    <td className="max-w-[200px] px-4 py-4 text-[13px] text-[var(--color-ink-secondary)]">{item.main_reason ?? item.active_anomaly_type}</td>
                    <td className="max-w-[180px] px-4 py-4 text-[13px] font-medium text-[var(--color-ink)]">{item.recommended_action ?? "Continue monitoring"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

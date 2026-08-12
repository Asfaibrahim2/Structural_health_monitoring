"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { api, type InspectionQueueItem, type InspectionPriority } from "@/lib/api";
import { getPlainMainReason } from "@/lib/bridgeHelpers";
import { Card } from "@/components/Card";
import PriorityBadge from "@/components/PriorityBadge";
import PageHeader from "@/components/PageHeader";
import Tooltip from "@/components/Tooltip";
import { TOOLTIPS } from "@/lib/status";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/AsyncState";
import clsx from "clsx";
import { ArrowUpDown } from "lucide-react";

type SortKey = "priority" | "risk" | "confidence" | "uncertainty" | "bridge";
const PRIORITY_ORDER: Record<InspectionPriority, number> = { P1: 0, P2: 1, P3: 2, P4: 3 };

export default function InspectionQueuePage() {
  const [queue, setQueue] = useState<InspectionQueueItem[]>([]);
  const [filter, setFilter] = useState<InspectionPriority | "ALL">("ALL");
  const [modeFilter, setModeFilter] = useState<"BOTH" | "SYNTHETIC" | "HARDWARE">("BOTH");
  
  // Default sort: highest risk first
  const [sortKey, setSortKey] = useState<SortKey>("risk");
  const [sortAsc, setSortAsc] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    api.inspectionQueue().then(setQueue).catch(() => setError(true)).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const sorted = useMemo(() => {
    // 1. Filter by Priority
    let items = filter === "ALL" ? [...queue] : queue.filter((i) => i.inspection_priority === filter);
    
    // 2. Filter by Mode (TS-STR-001 represents hardware, all others synthetic)
    if (modeFilter === "SYNTHETIC") {
      items = items.filter((i) => i.bridge_id !== "TS-STR-001");
    } else if (modeFilter === "HARDWARE") {
      items = items.filter((i) => i.bridge_id === "TS-STR-001");
    }

    // 3. Sort
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
  }, [queue, filter, modeFilter, sortKey, sortAsc]);

  const counts = { P1: 0, P2: 0, P3: 0, P4: 0 };
  queue.forEach((i) => counts[i.inspection_priority]++);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { 
      setSortKey(key); 
      // Default to desc for numeric scores (risk, confidence, uncertainty) and asc for name/priority
      setSortAsc(key === "bridge" || key === "priority"); 
    }
  }

  function SortHeader({ label, col }: { label: string; col: SortKey }) {
    return (
      <button onClick={() => toggleSort(col)} className="flex items-center gap-1 font-semibold hover:text-[var(--color-accent)]">
        {label} <ArrowUpDown size={12} className="shrink-0" />
      </button>
    );
  }

  return (
    <>
      <PageHeader
        title="Inspection queue"
        description="Prioritized bridges with risk, confidence, and recommended action."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["ALL", "P1", "P2", "P3", "P4"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            className={clsx(
              "rounded-[var(--radius-btn)] border px-3 py-1.5 text-[12px] font-medium transition-colors",
              filter === p
                ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                : "border-[var(--color-hairline)] bg-[var(--color-surface)] text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-hover)]"
            )}
          >
            {p === "ALL" ? `All (${queue.length})` : `${p} (${counts[p]})`}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1 rounded-[var(--radius-btn)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-0.5">
          {(["BOTH", "SYNTHETIC", "HARDWARE"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setModeFilter(m)}
              className={clsx(
                "rounded-[5px] px-2.5 py-1 text-[11px] font-medium capitalize",
                modeFilter === m
                  ? "bg-[var(--color-ink)] text-white"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              )}
            >
              {m.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorState onRetry={load} />}
      {loading && !error && <LoadingState message="Loading inspection queue…" />}
      {!loading && !error && sorted.length === 0 && <EmptyState title="No matches" message="No structures match this filter combination." />}

      {!loading && !error && sorted.length > 0 && (
        <Card className="overflow-hidden p-0 shadow-[var(--shadow-card)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-[14px]">
              <thead>
                <tr className="border-b border-[var(--color-hairline)] bg-[var(--color-surface-sunken)] text-[12px] uppercase tracking-wide text-[var(--color-ink-muted)]">
                  <th className="px-4 py-3.5 w-12 text-center">#</th>
                  <th className="px-4 py-3.5"><SortHeader label="Bridge" col="bridge" /></th>
                  <th className="px-4 py-3.5"><SortHeader label="Risk (0–100)" col="risk" /></th>
                  <th className="px-4 py-3.5"><SortHeader label="Confidence (%)" col="confidence" /></th>
                  <th className="px-4 py-3.5"><SortHeader label="Uncertainty (±)" col="uncertainty" /></th>
                  <th className="px-4 py-3.5"><SortHeader label="Priority" col="priority" /></th>
                  <th className="px-4 py-3.5">Main reason</th>
                  <th className="px-4 py-3.5 min-w-[280px]">Recommended action</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((item, i) => (
                  <tr key={item.bridge_id} className="border-b border-[var(--color-hairline)] last:border-0 hover:bg-[var(--color-surface-hover)]">
                    <td className="px-4 py-4 font-mono text-[var(--color-ink-muted)] text-center">{String(i + 1).padStart(2, "0")}</td>
                    <td className="px-4 py-4">
                      <Link href={`/bridges/${item.bridge_id}`} className="font-semibold hover:text-[var(--color-accent)]">{item.bridge_name}</Link>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-[11px] text-[var(--color-ink-muted)]">{item.bridge_id}</span>
                        <span className={clsx(
                          "rounded px-1.5 py-0.5 text-[10px] font-medium",
                          item.bridge_id === "TS-STR-001" ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]" : "bg-[var(--color-grey-soft)] text-[var(--color-ink-muted)]"
                        )}>
                          {item.bridge_id === "TS-STR-001" ? "Hardware" : "Synthetic"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono">
                      <span
                        className="inline-block rounded-lg px-2.5 py-1 text-[14px] font-bold shadow-sm"
                        style={{
                          backgroundColor:
                            item.inspection_priority === "P1"
                              ? "var(--color-brick-soft)"
                              : item.inspection_priority === "P2"
                              ? "var(--color-orange-soft)"
                              : item.inspection_priority === "P3"
                              ? "var(--color-amber-soft)"
                              : "var(--color-sage-soft)",
                          color:
                            item.inspection_priority === "P1"
                              ? "var(--color-brick)"
                              : item.inspection_priority === "P2"
                              ? "var(--color-orange)"
                              : item.inspection_priority === "P3"
                              ? "var(--color-amber)"
                              : "var(--color-sage)",
                        }}
                      >
                        {item.risk_score.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono font-semibold">{((item.confidence_score ?? 0)).toFixed(0)}%</td>
                    <td className="px-4 py-4 font-mono text-[var(--color-ink-muted)]">±{item.uncertainty.toFixed(1)}</td>
                    <td className="px-4 py-4"><PriorityBadge priority={item.inspection_priority} /></td>
                    <td className="max-w-[240px] px-4 py-4 text-[13px] text-[var(--color-ink-secondary)] leading-relaxed">{getPlainMainReason(item)}</td>
                    <td className="max-w-[340px] px-4 py-4 text-[12.5px] leading-snug font-medium text-[var(--color-ink-secondary)]">{item.recommended_action ?? "Continue monitoring"}</td>
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

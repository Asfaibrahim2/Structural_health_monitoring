"use client";

import { useEffect, useState } from "react";
import { api, type BridgeSummary } from "@/lib/api";
import { ChevronDown } from "lucide-react";

export default function BridgeSelector({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const [bridges, setBridges] = useState<BridgeSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.bridges().then(setBridges).catch(() => setBridges([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading || bridges.length === 0}
        className="w-full appearance-none rounded-[var(--radius-btn)] border border-[var(--color-hairline)] bg-[var(--color-surface)] py-2.5 pl-3.5 pr-10 text-[14px] font-medium text-[var(--color-ink)] shadow-[var(--shadow-btn)] outline-none transition-all focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)] disabled:opacity-50"
      >
        {loading && <option>Loading…</option>}
        {!loading && bridges.length === 0 && <option>No structures</option>}
        {bridges.map((b) => (
          <option key={b.bridge_id} value={b.bridge_id} className="bg-[var(--color-surface)]">
            {b.bridge_name} · {b.bridge_id}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
    </div>
  );
}

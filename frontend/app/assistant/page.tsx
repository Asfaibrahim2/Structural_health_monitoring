"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import BridgeSelector from "@/components/BridgeSelector";
import AssistantBox from "@/components/AssistantBox";
import { api } from "@/lib/api";
import { Sparkles } from "lucide-react";

export default function AssistantPage() {
  const [bridgeId, setBridgeId] = useState("");

  useEffect(() => {
    api.bridges().then((b) => {
      if (b.length > 0) setBridgeId(b[0].bridge_id);
    });
  }, []);

  return (
    <>
      <PageHeader
        title="AI Engineer Assistant"
        description="Ask natural-language questions about structural health, risk drivers, sensor contributions, and recommended next steps."
        breadcrumbs={[{ label: "Command Center", href: "/" }, { label: "AI Assistant" }]}
      />

      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 shadow-sm sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-2 flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
            <Sparkles size={14} /> Context structure
          </label>
          <BridgeSelector value={bridgeId} onChange={setBridgeId} />
        </div>
        <p className="text-[12px] text-[var(--color-ink-muted)] sm:max-w-xs">
          The assistant uses live data from the selected structure to ground its answers.
        </p>
      </div>

      {bridgeId ? (
        <div className="max-w-3xl">
          <AssistantBox bridgeId={bridgeId} expanded />
        </div>
      ) : (
        <p className="text-[13px] text-[var(--color-ink-muted)]">Loading…</p>
      )}
    </>
  );
}

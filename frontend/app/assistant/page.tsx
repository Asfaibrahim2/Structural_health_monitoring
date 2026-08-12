"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import BridgeSelector from "@/components/BridgeSelector";
import AssistantBox from "@/components/AssistantBox";
import { api } from "@/lib/api";

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
        title="Assistant"
        description="Ask questions about risk, sensors, and recommended next steps."
      />

      <div className="mb-5 max-w-sm">
        <label className="mb-1.5 block text-[12px] font-medium text-[var(--color-ink-muted)]">Bridge</label>
        <BridgeSelector value={bridgeId} onChange={setBridgeId} />
      </div>

      {bridgeId ? <AssistantBox bridgeId={bridgeId} /> : null}
    </>
  );
}

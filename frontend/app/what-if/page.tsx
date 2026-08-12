"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import BridgeSelector from "@/components/BridgeSelector";
import WhatIfSimulator from "@/components/WhatIfSimulator";
import { api } from "@/lib/api";

export default function WhatIfPage() {
  const router = useRouter();
  const [bridgeId, setBridgeId] = useState("");

  useEffect(() => {
    api.bridges().then((b) => {
      if (b.length > 0 && !bridgeId) setBridgeId(b[0].bridge_id);
    });
  }, [bridgeId]);

  return (
    <>
      <PageHeader
        title="What-if"
        description="Adjust conditions and compare current vs simulated risk."
      />

      <div className="mb-5 max-w-sm">
        <label className="mb-1.5 block text-[12px] font-medium text-[var(--color-ink-muted)]">Bridge</label>
        <BridgeSelector
          value={bridgeId}
          onChange={(id) => {
            setBridgeId(id);
            router.replace(`/what-if?bridge=${id}`, { scroll: false });
          }}
        />
      </div>

      {bridgeId ? (
        <div className="max-w-2xl">
          <WhatIfSimulator bridgeId={bridgeId} expanded />
        </div>
      ) : (
        <p className="text-[13px] text-[var(--color-ink-muted)]">Loading…</p>
      )}
    </>
  );
}

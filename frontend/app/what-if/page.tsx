"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import BridgeSelector from "@/components/BridgeSelector";
import WhatIfSimulator from "@/components/WhatIfSimulator";
import { api } from "@/lib/api";
import Disclaimer from "@/components/Disclaimer";
import { SlidersHorizontal } from "lucide-react";

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
        title="What-If Simulator"
        description="Adjust traffic, rainfall, temperature, maintenance delay, and simulation duration. Compare current vs simulated risk with affected evidence and disclaimer."
        breadcrumbs={[
          { label: "Command Center", href: "/" },
          { label: "What-If Simulator" },
        ]}
      />

      <div className="mb-6 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-structural)] text-white">
            <SlidersHorizontal size={18} />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-medium text-[var(--color-ink)]">Select a structure to simulate</p>
            <p className="mt-1 text-[12.5px] text-[var(--color-ink-muted)]">
              Adjust environmental and operational parameters, then compare current vs simulated risk scores.
            </p>
            <div className="mt-4 max-w-md">
              <BridgeSelector
                value={bridgeId}
                onChange={(id) => {
                  setBridgeId(id);
                  router.replace(`/what-if?bridge=${id}`, { scroll: false });
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {bridgeId ? (
        <div className="max-w-2xl">
          <WhatIfSimulator bridgeId={bridgeId} expanded />
        </div>
      ) : (
        <p className="text-[13px] text-[var(--color-ink-muted)]">Loading structures…</p>
      )}
    </>
  );
}

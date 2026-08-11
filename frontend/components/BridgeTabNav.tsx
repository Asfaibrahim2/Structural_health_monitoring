"use client";

import TabNav from "@/components/TabNav";
import { LayoutGrid, LineChart, AlertTriangle, SlidersHorizontal, Sparkles } from "lucide-react";

export default function BridgeTabNav({ bridgeId }: { bridgeId: string }) {
  const base = `/bridges/${bridgeId}`;
  return (
    <TabNav
      tabs={[
        { href: base, label: "Overview", icon: LayoutGrid, exact: true },
        { href: `${base}/telemetry`, label: "Telemetry", icon: LineChart },
        { href: `${base}/events`, label: "Events", icon: AlertTriangle },
        { href: `${base}/what-if`, label: "What-If", icon: SlidersHorizontal },
        { href: `${base}/assistant`, label: "Assistant", icon: Sparkles },
      ]}
    />
  );
}

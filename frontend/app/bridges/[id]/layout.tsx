import Link from "next/link";
import { api } from "@/lib/api";
import PriorityBadge from "@/components/PriorityBadge";
import ReportButton from "@/components/ReportButton";
import BridgeTabNav from "@/components/BridgeTabNav";
import { ArrowLeft } from "lucide-react";

export default async function BridgeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bridge = await api.bridge(id).catch(() => null);

  if (!bridge) {
    return (
      <div className="py-16 text-center">
        <p className="text-[15px] text-[var(--color-ink-muted)]">
          Couldn&apos;t load structure {id}.
        </p>
        <Link href="/bridges" className="mt-4 inline-block text-[13.5px] text-[var(--color-structural)] hover:underline">
          Back to Fleet Registry
        </Link>
      </div>
    );
  }

  return (
    <>
      <Link
        href="/bridges"
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-structural)]"
      >
        <ArrowLeft size={14} /> Fleet Registry
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-ink-muted)]">
              {bridge.bridge_id}
            </p>
            <PriorityBadge priority={bridge.latest_inspection_priority} compact />
          </div>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-[clamp(1.5rem,3vw,2rem)] font-semibold text-[var(--color-ink)]">
            {bridge.bridge_name}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-[var(--color-ink-muted)]">
            {bridge.structure_type} · Built {bridge.construction_year} ({bridge.age_years} yrs) · Span{" "}
            {bridge.span_length_m}m · {bridge.sensor_count} sensors · {bridge.scenario_type.replace(/_/g, " ")}
          </p>
        </div>
        <ReportButton bridgeId={bridge.bridge_id} bridgeName={bridge.bridge_name} />
      </header>

      <BridgeTabNav bridgeId={id} />
      {children}
    </>
  );
}

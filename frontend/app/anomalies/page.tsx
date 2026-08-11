import { Suspense } from "react";
import AnomaliesPageClient from "./AnomaliesPageClient";

export default function AnomaliesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[var(--color-ink-muted)]">Loading…</div>}>
      <AnomaliesPageClient />
    </Suspense>
  );
}

"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { FileText } from "lucide-react";

export default function ReportButton({ bridgeId, bridgeName }: { bridgeId: string; bridgeName: string }) {
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await api.generateReport(bridgeId, `Structural Health Report — ${bridgeName}`);
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(res.report_html);
        win.document.close();
      }
    } catch {
      alert("Couldn't generate the report. Confirm the backend is reachable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={generate}
      disabled={loading}
      className="flex items-center gap-2 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface)] px-4 py-2.5 text-[13px] font-medium text-[var(--color-ink)] transition-colors hover:border-[var(--color-structural)] hover:text-[var(--color-structural)] disabled:opacity-50"
    >
      <FileText size={15} />
      {loading ? "Generating…" : "Generate engineer report"}
    </button>
  );
}

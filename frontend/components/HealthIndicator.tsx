"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import clsx from "clsx";

export default function HealthIndicator() {
  const [status, setStatus] = useState<"loading" | "healthy" | "degraded" | "offline">("loading");

  useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        const res = await api.health();
        if (mounted) setStatus(res.status === "healthy" && res.database === "connected" ? "healthy" : "degraded");
      } catch {
        if (mounted) setStatus("offline");
      }
    }
    check();
    const id = setInterval(check, 30000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const config = {
    healthy: { label: "API Online", color: "var(--color-sage)", bg: "var(--color-sage-soft)", border: "rgba(74,222,128,0.35)" },
    degraded: { label: "Degraded", color: "var(--color-amber)", bg: "var(--color-amber-soft)", border: "rgba(251,191,36,0.35)" },
    offline: { label: "Offline", color: "var(--color-brick)", bg: "var(--color-brick-soft)", border: "rgba(248,113,113,0.35)" },
    loading: { label: "Connecting…", color: "var(--color-ink-muted)", bg: "var(--color-surface)", border: "var(--color-hairline)" },
  };
  const c = config[status];

  return (
    <div
      className="flex items-center gap-2.5 rounded-full border px-5 py-2.5 text-[14px] font-bold shadow-[var(--shadow-btn)]"
      style={{ backgroundColor: c.bg, borderColor: c.border, color: c.color }}
    >
      <span
        className={clsx("h-2.5 w-2.5 rounded-full", status === "healthy" && "animate-pulse-soft")}
        style={{ backgroundColor: c.color, boxShadow: status === "healthy" ? `0 0 10px ${c.color}` : undefined }}
      />
      {c.label}
    </div>
  );
}

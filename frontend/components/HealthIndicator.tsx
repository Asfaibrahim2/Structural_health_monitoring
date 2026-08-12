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
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const label =
    status === "healthy" ? "Online" : status === "degraded" ? "Degraded" : status === "offline" ? "Offline" : "…";
  const color =
    status === "healthy"
      ? "var(--color-sage)"
      : status === "degraded"
        ? "var(--color-amber)"
        : status === "offline"
          ? "var(--color-brick)"
          : "var(--color-ink-muted)";

  return (
    <div className="flex items-center gap-2.5 rounded-[var(--radius-btn)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-ink-secondary)] transition-shadow hover:shadow-sm">
      <span className="relative inline-flex h-2 w-2">
        <span
          className={clsx("absolute inset-0 rounded-full", status === "healthy" && "animate-[pulse-ring_1.8s_ease-out_infinite]")}
          style={{ backgroundColor: color, opacity: 0.45 }}
        />
        <span className="relative h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      </span>
      API {label}
    </div>
  );
}

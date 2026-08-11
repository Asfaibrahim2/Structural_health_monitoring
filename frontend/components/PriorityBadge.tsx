import type { InspectionPriority } from "@/lib/api";
import { PRIORITY_STATUS } from "@/lib/status";

export default function PriorityBadge({
  priority,
  compact = false,
}: {
  priority: InspectionPriority;
  compact?: boolean;
}) {
  const s = PRIORITY_STATUS[priority] ?? PRIORITY_STATUS.P4;
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] font-bold uppercase tracking-wide whitespace-nowrap shadow-[var(--shadow-btn)]"
      style={{ backgroundColor: s.bg, color: s.fg, border: `1px solid ${s.fg}44` }}
      aria-label={`Inspection priority ${s.label}`}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.fg, boxShadow: `0 0 8px ${s.fg}` }} />
      {compact ? s.short : s.label}
    </span>
  );
}

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
      className="inline-flex items-center rounded-[4px] px-2 py-0.5 text-[11px] font-semibold tracking-wide"
      style={{ backgroundColor: s.bg, color: s.fg }}
      aria-label={`Inspection priority ${s.label}`}
    >
      {compact ? s.short : s.label}
    </span>
  );
}

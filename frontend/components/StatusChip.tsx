// UI/UX cleanup: consistent hardware/software status chips.
import { STATUS } from "@/lib/status";

type StatusKind = "normal" | "warning" | "elevated" | "critical" | "offline";

export default function StatusChip({ kind }: { kind: StatusKind }) {
  const s = STATUS[kind];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.fg }} />
      {s.label}
    </span>
  );
}

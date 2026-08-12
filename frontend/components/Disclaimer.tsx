import { Info } from "lucide-react";

export default function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-[var(--radius-card)] border border-[var(--color-amber)]/25 bg-[var(--color-amber-soft)] px-5 py-4 ${className}`}
      role="note"
    >
      <Info size={18} className="mt-0.5 shrink-0 text-[var(--color-amber)]" />
      <p className="text-[14px] font-medium leading-relaxed text-[var(--color-ink-secondary)]">
        <span className="font-bold text-[var(--color-amber)]">Disclaimer:</span>{" "}
        InfraShield AI is a decision-support prototype. It does not certify structural safety or structural failure.
      </p>
    </div>
  );
}

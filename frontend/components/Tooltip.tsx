"use client";

import { useState } from "react";
import { Info } from "lucide-react";

export default function Tooltip({ text, label = "Help" }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="ml-1 inline-flex text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-accent)] animate-pulse-soft"
      >
        <Info size={13} />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-52 -translate-x-1/2 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-2.5 text-[12px] leading-snug text-[var(--color-ink-muted)] shadow-xl"
        >
          {text}
        </span>
      )}
    </span>
  );
}

import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { Card } from "@/components/Card";

export function LoadingState({ message = "Loading data…" }: { message?: string }) {
  return (
    <Card hover={false} className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <Loader2 size={32} className="animate-spin text-[var(--color-accent-bright)]" aria-hidden />
      <p className="text-[16px] font-semibold text-[var(--color-ink-secondary)]" role="status">{message}</p>
    </Card>
  );
}

export function EmptyState({ title = "No data yet", message = "There is nothing to display for this selection." }: { title?: string; message?: string }) {
  return (
    <Card hover={false} className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <Inbox size={36} className="text-[var(--color-ink-muted)]" aria-hidden />
      <p className="text-[18px] font-bold text-[var(--color-ink)]">{title}</p>
      <p className="max-w-sm text-[15px] text-[var(--color-ink-muted)]">{message}</p>
    </Card>
  );
}

export function ErrorState({ title = "Could not load data", message = "Check that the backend is running on port 8000.", onRetry }: { title?: string; message?: string; onRetry?: () => void }) {
  return (
    <Card hover={false} className="flex flex-col items-center justify-center gap-4 border-[var(--color-brick)]/30 bg-[var(--color-brick-soft)] py-20 text-center">
      <AlertCircle size={36} className="text-[var(--color-brick)]" aria-hidden />
      <p className="text-[18px] font-bold text-[var(--color-ink)]">{title}</p>
      <p className="max-w-md text-[15px] text-[var(--color-ink-secondary)]">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="nav-btn nav-btn-active mt-2">Retry</button>
      )}
    </Card>
  );
}

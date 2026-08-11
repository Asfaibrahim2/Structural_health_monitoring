"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/Card";
import { Sparkles, Send, Loader2 } from "lucide-react";

const SUGGESTIONS = [
  "Why is this bridge flagged?",
  "What sensors are contributing to the risk?",
  "What should I do next?",
  "Explain the current risk score breakdown.",
  "Are there any active anomalies?",
];

export default function AssistantBox({
  bridgeId,
  expanded = false,
}: {
  bridgeId: string;
  expanded?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function ask(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setQuery(q);
    try {
      const res = await api.askAssistant(q, bridgeId);
      setAnswer(res.answer);
      setSources(res.data_sources_used ?? []);
      setActions(res.suggested_actions);
    } catch {
      setAnswer("Couldn't reach the assistant service. Confirm the backend is running.");
      setSources([]);
      setActions([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className={expanded ? "shadow-[var(--shadow-card)]" : ""}>
      <div className="mb-5 flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-structural-soft)] text-[var(--color-structural)]">
          <Sparkles size={16} />
        </div>
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-[17px] font-semibold text-[var(--color-ink)]">
            AI Engineer Assistant
          </h3>
          <p className="text-[12px] text-[var(--color-ink-muted)]">Ask about risk, sensors, and recommended actions</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            disabled={loading}
            className="rounded-full border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-1.5 text-[12px] text-[var(--color-ink-muted)] transition-colors hover:border-[var(--color-structural)] hover:text-[var(--color-structural)] disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(query);
        }}
        className="flex gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about this structure's status, risk drivers, or next steps…"
          className="flex-1 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] px-4 py-3 text-[14px] outline-none transition-colors focus:border-[var(--color-structural)]"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--color-structural)] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </form>

      {answer && (
        <div className="mt-5 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-5">
          <p className="whitespace-pre-line text-[14px] leading-relaxed text-[var(--color-ink)]">{answer}</p>

          {sources.length > 0 && (
            <div className="mt-4 border-t border-[var(--color-hairline)] pt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                Data sources
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sources.map((s, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-[var(--color-structural-soft)] px-2.5 py-0.5 font-[family-name:var(--font-mono)] text-[10.5px] text-[var(--color-structural)]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {actions.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-[var(--color-hairline)] pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                Suggested actions
              </p>
              {actions.map((a, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-[var(--color-ink)]">
                  <span className="font-medium text-[var(--color-structural)]">{i + 1}.</span> {a}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

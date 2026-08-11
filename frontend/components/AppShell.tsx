"use client";

import TopNav from "@/components/TopNav";
import GlobalStatusStrip from "@/components/GlobalStatusStrip";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-mesh-bg flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <TopNav />
        <GlobalStatusStrip />
      </header>

      <main className="flex-1 px-5 py-8 lg:px-8 lg:py-10">
        <div className="mx-auto max-w-[1680px] animate-fade-up">{children}</div>
      </main>

      <footer className="border-t border-[var(--color-hairline)] bg-[var(--color-bg-elevated)]/90 px-5 py-5 text-center backdrop-blur-sm lg:px-8">
        <p className="text-[14px] font-medium text-[var(--color-ink-muted)]">
          InfraShield AI — decision-support prototype only. Not a structural safety certification.
        </p>
        <p className="mt-1 text-[12px] text-[var(--color-ink-muted)]/70">
          Always verify with licensed engineering inspection.
        </p>
      </footer>
    </div>
  );
}

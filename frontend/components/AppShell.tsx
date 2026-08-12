"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import TopNav from "@/components/TopNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [enterKey, setEnterKey] = useState(0);

  useEffect(() => {
    setEnterKey((k) => k + 1);
  }, [pathname]);

  return (
    <div className="app-mesh-bg flex min-h-screen flex-col">
      <TopNav />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
        <div key={enterKey} className="page-enter mx-auto max-w-[1400px]">
          {children}
        </div>
      </main>

      <footer className="border-t border-[var(--color-hairline)] bg-white px-4 py-3.5 text-[12px] text-[var(--color-ink-secondary)] sm:px-6 lg:px-8">
        InfraShield AI — decision support only. Not a structural safety certification.
      </footer>
    </div>
  );
}

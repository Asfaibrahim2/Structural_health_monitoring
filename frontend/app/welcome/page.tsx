"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, Activity, ShieldCheck, Cpu, LineChart, Sparkles } from "lucide-react";

// Custom Interactive Canvas Bridge Scan Animation
function CanvasBridge() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    // Coordinates mapping
    const nodes = [
      { x: 0.15, r: 4, delay: 0 },
      { x: 0.32, r: 5, delay: 1 },
      { x: 0.50, r: 6, delay: 2 },
      { x: 0.68, r: 5, delay: 3 },
      { x: 0.85, r: 4, delay: 4 }
    ];

    let scanX = 0;
    let scanDirection = 1;
    let time = 0;

    const animate = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      // Draw vector structural background grids
      ctx.strokeStyle = "rgba(2, 132, 199, 0.05)";
      ctx.lineWidth = 1;
      const gridSize = 25;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Calculations for suspended structures
      const startX = width * 0.1;
      const endX = width * 0.9;
      const deckY = height * 0.65;
      const archTopY = height * 0.3;

      // 1. Draw solid deck roadway line
      ctx.beginPath();
      ctx.moveTo(startX, deckY);
      ctx.lineTo(endX, deckY);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
      ctx.lineWidth = 3;
      ctx.stroke();

      // 2. Draw suspended support arch curve
      ctx.beginPath();
      ctx.moveTo(startX, deckY);
      ctx.quadraticCurveTo(width * 0.5, archTopY, endX, deckY);
      ctx.strokeStyle = "var(--color-accent)";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 3. Draw vertical suspender lines
      const cables = 24;
      ctx.strokeStyle = "rgba(148, 163, 184, 0.18)";
      ctx.lineWidth = 1;
      for (let i = 1; i < cables; i++) {
        const t = i / cables;
        const x = startX + (endX - startX) * t;
        const curveY = (1-t)*(1-t)*deckY + 2*(1-t)*t*archTopY + t*t*deckY;
        
        ctx.beginPath();
        ctx.moveTo(x, deckY);
        ctx.lineTo(x, curveY);
        ctx.stroke();

        // Small pulsing stress packet indicators sliding on lines
        const offset = (time + t * 4) % 1;
        const packetY = curveY + (deckY - curveY) * offset;
        ctx.beginPath();
        ctx.arc(x, packetY, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(2, 132, 199, 0.6)";
        ctx.fill();
      }

      // 4. Draw horizontal scanning wave beam
      scanX += 2.5 * scanDirection;
      if (scanX > width * 0.95 || scanX < width * 0.05) {
        scanDirection *= -1;
      }
      ctx.beginPath();
      ctx.moveTo(scanX, height * 0.15);
      ctx.lineTo(scanX, height * 0.8);
      const gradient = ctx.createLinearGradient(scanX - 15, 0, scanX + 15, 0);
      gradient.addColorStop(0, "rgba(2, 132, 199, 0)");
      gradient.addColorStop(0.5, "rgba(2, 132, 199, 0.2)");
      gradient.addColorStop(1, "rgba(2, 132, 199, 0)");
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 25;
      ctx.stroke();

      // 5. Draw active structural sensor nodes
      nodes.forEach((node) => {
        const nx = width * node.x;
        const nt = node.x;
        const ny = (1-nt)*(1-nt)*deckY + 2*(1-nt)*nt*archTopY + nt*nt*deckY;
        const isNearScan = Math.abs(nx - scanX) < 30;

        // Node pulse diameter scaling
        const pulse = Math.sin(time * 4.5 + node.delay) * 3;
        
        // Outer halo
        ctx.beginPath();
        ctx.arc(nx, ny, node.r + 5 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = isNearScan 
          ? "rgba(22, 163, 74, 0.15)"
          : "rgba(2, 132, 199, 0.08)";
        ctx.fill();

        // Inner core
        ctx.beginPath();
        ctx.arc(nx, ny, node.r, 0, Math.PI * 2);
        ctx.fillStyle = isNearScan
          ? "var(--color-sage)"
          : "var(--color-accent)";
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full min-h-[300px] md:min-h-[360px] block" />;
}

export default function WelcomeLandingPage() {
  return (
    <div className="min-h-screen app-mesh-bg py-12 px-6 lg:px-12 flex flex-col justify-between">
      {/* Top Header navbar */}
      <header className="flex items-center justify-between border-b border-[var(--color-hairline)] pb-6 mb-12">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[#0ea5e9] text-white shadow-[var(--shadow-glow)]">
            <Activity size={20} strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-[family-name:var(--font-display)] text-[17px] font-bold tracking-tight text-[var(--color-ink)]">
              InfraShield
            </p>
            <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wider">AI Digital Twin Platform</p>
          </div>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent-soft)] px-5 py-2.5 text-[14px] font-bold text-[var(--color-accent)] transition-all hover:scale-[1.02] hover:bg-[var(--color-accent)] hover:text-white"
        >
          Enter Dashboard <ArrowRight size={15} />
        </Link>
      </header>

      {/* Main hero grid */}
      <main className="grid grid-cols-1 gap-12 lg:grid-cols-12 items-center flex-1 max-w-7xl mx-auto w-full mb-12">
        {/* Left column hero info */}
        <div className="lg:col-span-6 space-y-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-soft)] px-3.5 py-1 text-[12px] font-bold uppercase tracking-wider text-[var(--color-accent)]">
            <Sparkles size={12} /> Hackathon Edition
          </span>
          <h1 className="text-display text-[clamp(2.2rem,6vw,4rem)] font-extrabold tracking-tight leading-tight gradient-text">
            Structural Health,<br />Reimagined.
          </h1>
          <p className="text-[16px] leading-relaxed text-[var(--color-ink-muted)] max-w-lg">
            InfraShield monitors key structural stresses (vibration, strain, displacement) using artificial intelligence and digital twins to automatically detect anomalies, project trends, and recommend inspection schedules before failure indicators escalate.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-6 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-[var(--color-accent-glow)] transition-all hover:scale-[1.02] hover:-translate-y-0.5 hover:brightness-110"
            >
              Enter CommandCenter <ArrowRight size={16} />
            </Link>
            <Link
              href="/hardware"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-hairline-strong)] bg-white px-6 py-3.5 text-[15px] font-semibold text-[var(--color-ink-secondary)] transition-all hover:scale-[1.02] hover:-translate-y-0.5 hover:bg-[var(--color-surface-hover)]"
            >
              Hardware Bridge
            </Link>
          </div>
        </div>

        {/* Right column AI canvas bridge scanner simulation */}
        <div className="lg:col-span-6">
          <div className="relative rounded-3xl overflow-hidden border border-[var(--color-hairline-strong)] bg-white p-2 shadow-2xl">
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
              BRIDGE MODEL VECTOR SCAN
            </div>
            
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center relative">
              <CanvasBridge />
            </div>
          </div>
        </div>
      </main>

      {/* Highlights footer grid */}
      <footer className="border-t border-[var(--color-hairline)] pt-8 mt-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 max-w-7xl mx-auto w-full">
          <div className="flex items-start gap-4">
            <span className="p-3 rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <ShieldCheck size={20} />
            </span>
            <div>
              <h4 className="font-[family-name:var(--font-display)] text-[14px] font-bold text-[var(--color-ink)]">Structural Health AI</h4>
              <p className="text-[12.5px] text-[var(--color-ink-muted)] mt-1">Multi-sensor anomaly alerts with baseline drift thresholds.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <span className="p-3 rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <LineChart size={20} />
            </span>
            <div>
              <h4 className="font-[family-name:var(--font-display)] text-[14px] font-bold text-[var(--color-ink)]">Trend Forecasts</h4>
              <p className="text-[12.5px] text-[var(--color-ink-muted)] mt-1">Exponential Holt double smoothing with confidence bands.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <span className="p-3 rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <Cpu size={20} />
            </span>
            <div>
              <h4 className="font-[family-name:var(--font-display)] text-[14px] font-bold text-[var(--color-ink)]">Physical ESP32 Gateway</h4>
              <p className="text-[12.5px] text-[var(--color-ink-muted)] mt-1">Real-time CSV logging and hardware telemetry feeds.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

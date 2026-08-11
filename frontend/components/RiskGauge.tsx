"use client";

const ZONES = [
  { from: 0, to: 35, color: "#4ade80" },
  { from: 35, to: 60, color: "#fbbf24" },
  { from: 60, to: 80, color: "#fb923c" },
  { from: 80, to: 100, color: "#f87171" },
];

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

const START_ANGLE = 200;
const END_ANGLE = -20;

function angleForValue(v: number) {
  const t = Math.max(0, Math.min(100, v)) / 100;
  return START_ANGLE + t * (END_ANGLE - START_ANGLE);
}

export default function RiskGauge({
  score,
  size = 168,
  label,
}: {
  score: number;
  size?: number;
  label?: string;
}) {
  const cx = size / 2;
  const cy = size / 2 + size * 0.08;
  const r = size * 0.38;
  const needleAngle = angleForValue(score);
  const needleTip = polar(cx, cy, r * 0.82, needleAngle);

  return (
    <svg width={size} height={size * 0.78} viewBox={`0 0 ${size} ${size * 0.78}`}>
      {ZONES.map((z) => {
        const a1 = angleForValue(z.from);
        const a2 = angleForValue(z.to);
        const p1 = polar(cx, cy, r, a1);
        const p2 = polar(cx, cy, r, a2);
        const largeArc = Math.abs(a1 - a2) > 180 ? 1 : 0;
        return (
          <path
            key={z.from}
            d={`M ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 0 ${p2.x} ${p2.y}`}
            stroke={z.color}
            strokeWidth={8}
            strokeLinecap="round"
            fill="none"
            opacity={0.85}
          />
        );
      })}
      <line x1={cx} y1={cy} x2={needleTip.x} y2={needleTip.y} stroke="#f1f5f9" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={5} fill="#f1f5f9" />
      <text x={cx} y={cy - size * 0.16} textAnchor="middle" fontSize={size * 0.2} fontWeight="700" fill="#f1f5f9" fontFamily="Plus Jakarta Sans">
        {Math.round(score)}
      </text>
      {label && (
        <text x={cx} y={cy - size * 0.03} textAnchor="middle" fontSize={size * 0.065} fill="#94a3b8" fontFamily="Plus Jakarta Sans">
          {label}
        </text>
      )}
    </svg>
  );
}

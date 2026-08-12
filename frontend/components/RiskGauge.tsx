"use client";

const ZONES = [
  { from: 0, to: 35, color: "#059669" },
  { from: 35, to: 60, color: "#d97706" },
  { from: 60, to: 80, color: "#ea580c" },
  { from: 80, to: 100, color: "#dc2626" },
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
            strokeWidth={10}
            strokeLinecap="round"
            fill="none"
            opacity={0.9}
          />
        );
      })}
      <line x1={cx} y1={cy} x2={needleTip.x} y2={needleTip.y} stroke="#111827" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={5} fill="#111827" />
      <circle cx={cx} cy={cy} r={2.5} fill="#ffffff" />
      <text
        x={cx}
        y={cy - size * 0.14}
        textAnchor="middle"
        fontSize={size * 0.2}
        fontWeight="700"
        fill="#111827"
        fontFamily="IBM Plex Sans, sans-serif"
      >
        {Math.round(score)}
      </text>
      {label && (
        <text
          x={cx}
          y={cy - size * 0.02}
          textAnchor="middle"
          fontSize={size * 0.065}
          fill="#6b7280"
          fontFamily="IBM Plex Sans, sans-serif"
        >
          {label}
        </text>
      )}
    </svg>
  );
}

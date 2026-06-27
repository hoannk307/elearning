'use client';

// Biểu đồ SVG tối giản, không phụ thuộc thư viện ngoài. Thang điểm 0–10.

function colorFor(score: number): string {
  if (score >= 8) return '#5BAD8F'; // success
  if (score >= 5) return '#F5A623'; // secondary
  return '#E07B6A'; // danger
}

export interface Point {
  label: string;
  score: number;
  type?: 'exam' | 'exercise';
}

/** Biểu đồ đường: điểm theo thời gian. */
export function LineChart({ points }: { points: Point[] }) {
  const W = 620;
  const H = 240;
  const pad = { l: 28, r: 12, t: 12, b: 28 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;

  if (points.length === 0) {
    return <p className="text-slate-400 text-sm">Chưa có dữ liệu điểm.</p>;
  }

  const x = (i: number) =>
    pad.l + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (s: number) => pad.t + innerH - (s / 10) * innerH;

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.score)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {/* Lưới ngang + nhãn trục y */}
      {[0, 2, 4, 6, 8, 10].map((g) => (
        <g key={g}>
          <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} stroke="#eef2f7" />
          <text x={4} y={y(g) + 4} fontSize="9" fill="#9aa6b2">
            {g}
          </text>
        </g>
      ))}
      <path d={path} fill="none" stroke="#4F86C6" strokeWidth="2" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.score)} r="4" fill={colorFor(p.score)}>
            <title>{`${p.label}: ${p.score}`}</title>
          </circle>
          {p.type === 'exam' && (
            <rect x={x(i) - 5} y={y(p.score) - 5} width="10" height="10" fill="none" stroke={colorFor(p.score)} />
          )}
        </g>
      ))}
    </svg>
  );
}

/** Thanh điểm ngang (0–10). */
export function ScoreBar({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  const pct = Math.max(0, Math.min(100, (value / 10) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colorFor(value) }} />
      </div>
      <span className="text-sm font-semibold w-8 text-right" style={{ color: colorFor(value) }}>
        {value}
      </span>
    </div>
  );
}

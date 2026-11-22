'use client';

import { useId } from 'react';

export type CashForecastPoint = { date: string; balance: number };

export type CashForecastChartProps = {
  series?: CashForecastPoint[] | null;
  horizonDays?: number;
};

const W = 640;
const H = 240;
const PAD_L = 64;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 32;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDay(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]}`;
}

// Indian digit grouping (1,00,000). Done by hand so server and client render identically.
function groupIndian(n: number): string {
  const s = String(Math.round(Math.abs(n)));
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

function formatInr(n: number): string {
  return `${n < 0 ? '-' : ''}Rs ${groupIndian(n)}`;
}

export default function CashForecastChart({ series, horizonDays }: CashForecastChartProps) {
  const uid = useId().replace(/:/g, '');
  const points = Array.isArray(series) ? series : [];

  if (points.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-card p-6 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          No balance to chart yet. Add your opening cash and some invoices or bills to see the forecast.
        </p>
      </div>
    );
  }

  const n = points.length;
  const values = points.map((p) => p.balance);
  const minV = Math.min(0, ...values);
  const maxV = Math.max(0, ...values);
  const span = maxV - minV || 1;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const x = (i: number) => PAD_L + (n > 1 ? i / (n - 1) : 0) * innerW;
  const y = (v: number) => PAD_T + ((maxV - v) / span) * innerH;
  const zeroY = y(0);

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.balance).toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L${x(n - 1).toFixed(1)},${zeroY.toFixed(1)} L${x(0).toFixed(1)},${zeroY.toFixed(1)} Z`;

  // Earliest index wins on ties because the comparison is strict.
  let lowIdx = 0;
  for (let i = 1; i < n; i++) {
    if (values[i] < values[lowIdx]) lowIdx = i;
  }
  const low = points[lowIdx];
  const lowX = x(lowIdx);
  const lowY = y(low.balance);
  const labelAnchor = lowX > W / 2 ? 'end' : 'start';
  const labelX = lowX > W / 2 ? lowX - 8 : lowX + 8;

  const yTicks = Array.from(new Set([maxV, 0, minV]));
  const xTickIdx = Array.from(new Set([0, Math.floor((n - 1) / 2), n - 1]));
  const hasNegative = minV < 0;
  const negClipId = `${uid}-neg`;

  return (
    <figure data-nexen-component="nx_components_CashForecastChart" className="w-full min-w-0 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
      <figcaption className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>Day-by-day cash balance</span>
        <span>{`Next ${horizonDays ?? n} days`}</span>
      </figcaption>

      <div className="w-full overflow-x-auto">
        <svg
          role="img"
          aria-label={`Cash balance line chart. Lowest balance ${formatInr(low.balance)} on ${formatDay(low.date)}.`}
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full min-w-[320px]"
        >
          <defs>
            <clipPath id={negClipId}>
              <rect x={PAD_L} y={zeroY} width={innerW} height={H - PAD_B - zeroY} />
            </clipPath>
          </defs>

          {yTicks.map((t) => (
            <g key={`tick-${t}`}>
              <line x1={PAD_L} x2={W - PAD_R} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth={1} />
              <text x={PAD_L - 6} y={y(t) + 4} textAnchor="end" className="fill-muted-foreground" fontSize={11}>
                {formatInr(t)}
              </text>
            </g>
          ))}

          {hasNegative && (
            <path d={areaPath} className="fill-destructive" opacity={0.18} clipPath={`url(#${negClipId})`} />
          )}

          <line
            x1={PAD_L}
            x2={W - PAD_R}
            y1={zeroY}
            y2={zeroY}
            className="stroke-muted-foreground"
            strokeWidth={1}
            strokeDasharray="4 4"
          />

          <path d={linePath} fill="none" className="stroke-primary" strokeWidth={2} strokeLinejoin="round" />

          {xTickIdx.map((i) => (
            <text
              key={`x-${i}`}
              x={x(i)}
              y={H - 8}
              textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
              className="fill-muted-foreground"
              fontSize={11}
            >
              {formatDay(points[i].date)}
            </text>
          ))}

          <circle
            cx={lowX}
            cy={lowY}
            r={5}
            className={low.balance < 0 ? 'fill-destructive' : 'fill-primary'}
            stroke="white"
            strokeWidth={2}
          />
          <text x={labelX} y={Math.max(PAD_T + 10, lowY - 10)} textAnchor={labelAnchor} className="fill-foreground" fontSize={11} fontWeight={600}>
            {`Lowest ${formatInr(low.balance)} · ${formatDay(low.date)}`}
          </text>
        </svg>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {hasNegative
          ? 'Shaded area shows days when the balance is below zero.'
          : 'The balance stays at or above zero for this period.'}
      </p>
    </figure>
  );
}
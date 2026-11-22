export type ForecastPoint = { day: number; balance: number };

type WhatIfComparisonChartProps = {
  baseline?: ForecastPoint[];
  scenario?: ForecastPoint[];
  scenarioLabel?: string;
};

const WIDTH = 640;
const HEIGHT = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 72 };

function formatAmount(value: number): string {
  return Math.round(value).toLocaleString('en-IN');
}

export default function WhatIfComparisonChart(props: WhatIfComparisonChartProps) {
  const baseline = Array.isArray(props.baseline) ? props.baseline : [];
  const scenario = Array.isArray(props.scenario) ? props.scenario : [];
  const scenarioLabel = props.scenarioLabel ?? 'Scenario';

  if (baseline.length === 0 && scenario.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-card p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-foreground">No comparison yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a scenario above to see how it changes your 30, 60 and 90 day cash balance against the baseline.
        </p>
      </div>
    );
  }

  const all = [...baseline, ...scenario];
  const maxDay = Math.max(1, ...all.map((p) => p.day));
  const values = all.map((p) => p.balance);
  const hi = Math.max(0, ...values);
  const lo = Math.min(0, ...values);
  const span = hi - lo || 1;

  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (day: number) => PAD.left + (day / maxDay) * innerW;
  const y = (value: number) => PAD.top + ((hi - value) / span) * innerH;

  const toPath = (points: ForecastPoint[]) =>
    points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.day).toFixed(1)},${y(p.balance).toFixed(1)}`)
      .join(' ');

  const zeroY = y(0);
  const hasNegative = lo < 0;
  const dayTicks = [30, 60, 90].filter((d) => d <= maxDay);
  const valueTicks = [hi, lo];

  return (
    <div data-nexen-component="nx_components_WhatIfComparisonChart" className="min-w-0 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <svg width="20" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="20" y2="4" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeDasharray="4 3" />
          </svg>
          Baseline forecast
        </span>
        <span className="inline-flex items-center gap-2">
          <svg width="20" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="20" y2="4" stroke="hsl(var(--primary))" strokeWidth="2.5" />
          </svg>
          {scenarioLabel}
        </span>
        {hasNegative && (
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-[4px]"
              style={{ background: 'hsl(var(--destructive) / 0.2)' }}
              aria-hidden="true"
            />
            Negative balance
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Cash balance over ${maxDay} days: baseline compared with ${scenarioLabel}`}
      >
        {hasNegative && (
          <rect
            x={PAD.left}
            y={zeroY}
            width={innerW}
            height={Math.max(0, y(lo) - zeroY)}
            style={{ fill: 'hsl(var(--destructive) / 0.08)' }}
          />
        )}

        {valueTicks.map((v, i) => (
          <g key={`vt-${i}`}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(v)}
              y2={y(v)}
              style={{ stroke: 'hsl(var(--border))' }}
              strokeWidth="1"
            />
            <text
              x={PAD.left - 8}
              y={y(v) + 4}
              textAnchor="end"
              fontSize="11"
              style={{ fill: 'hsl(var(--muted-foreground))' }}
            >
              {formatAmount(v)}
            </text>
          </g>
        ))}

        <line
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={zeroY}
          y2={zeroY}
          style={{ stroke: 'hsl(var(--destructive))' }}
          strokeWidth="1.5"
        />

        {dayTicks.map((d) => (
          <text
            key={`dt-${d}`}
            x={x(d)}
            y={HEIGHT - 8}
            textAnchor="middle"
            fontSize="11"
            style={{ fill: 'hsl(var(--muted-foreground))' }}
          >
            {`${d}d`}
          </text>
        ))}

        {baseline.length > 0 && (
          <path
            d={toPath(baseline)}
            fill="none"
            style={{ stroke: 'hsl(var(--muted-foreground))' }}
            strokeWidth="2"
            strokeDasharray="6 4"
            strokeLinejoin="round"
          />
        )}

        {scenario.length > 0 && (
          <path
            d={toPath(scenario)}
            fill="none"
            style={{ stroke: 'hsl(var(--primary))' }}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  );
}
export interface ForecastSnapshot {
  lowestBalance: number;
  lowestBalanceDate: string;
  shortfallDate: string | null;
}

interface WhatIfSummaryProps {
  baseline?: ForecastSnapshot | null;
  scenario?: ForecastSnapshot | null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toUtc(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function fmtRs(n: number): string {
  const r = Math.round(n);
  return `${r < 0 ? '-' : ''}Rs ${Math.abs(r).toLocaleString('en-IN')}`;
}

function fmtDelta(n: number): string {
  const r = Math.round(n);
  if (r === 0) return 'Rs 0';
  return `${r > 0 ? '+' : '-'}Rs ${Math.abs(r).toLocaleString('en-IN')}`;
}

function describeShortfallShift(base: string | null, scen: string | null): string {
  if (!base && !scen) return 'No shortfall in either forecast';
  if (!base && scen) return `New shortfall on ${fmtDate(scen)}`;
  if (base && !scen) return 'Scenario clears the baseline shortfall';
  const days = Math.round((toUtc(scen as string) - toUtc(base as string)) / 86400000);
  if (days === 0) return 'Shortfall on the same day';
  const unit = Math.abs(days) === 1 ? 'day' : 'days';
  return `${Math.abs(days)} ${unit} ${days < 0 ? 'earlier' : 'later'}`;
}

export default function WhatIfSummary({ baseline, scenario }: WhatIfSummaryProps) {
  if (!scenario) {
    return (
      <section className="w-full min-w-0 rounded-[var(--radius)] border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-foreground">Comparison summary</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a scenario above to compare its lowest balance and shortfall date with the baseline forecast.
        </p>
      </section>
    );
  }

  const base: ForecastSnapshot | null = baseline ?? null;
  const baseLowest = base ? base.lowestBalance : 0;
  const delta = scenario.lowestBalance - baseLowest;
  const deltaTone = delta < 0 ? 'text-destructive' : 'text-foreground';

  const columns: Array<{ label: string; snap: ForecastSnapshot | null }> = [
    { label: 'Baseline forecast', snap: base },
    { label: 'Scenario', snap: scenario },
  ];

  return (
    <section data-nexen-component="nx_components_WhatIfSummary" className="w-full min-w-0 rounded-[var(--radius)] border bg-card p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="text-base font-semibold text-foreground">Comparison summary</h2>
        <p className="text-xs text-muted-foreground">Scenario compared with the current baseline</p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {columns.map(({ label, snap }) => (
          <div
            key={label}
            className="min-w-0 rounded-[var(--radius)] border bg-background p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <dl className="mt-3 space-y-3">
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">Lowest balance</dt>
                <dd className="break-words text-lg font-semibold text-foreground">
                  {snap ? fmtRs(snap.lowestBalance) : '—'}
                </dd>
                <dd className="text-xs text-muted-foreground">
                  on {snap ? fmtDate(snap.lowestBalanceDate) : '—'}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">Shortfall date</dt>
                <dd className="text-sm font-medium text-foreground">
                  {snap?.shortfallDate ? fmtDate(snap.shortfallDate) : 'No shortfall'}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 rounded-[var(--radius)] border bg-background p-4 sm:grid-cols-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Change in lowest balance</p>
          <p className={`break-words text-lg font-semibold ${deltaTone}`}>
            {base ? fmtDelta(delta) : '—'}
          </p>
          <p className="text-xs text-muted-foreground">Scenario minus baseline</p>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Change in shortfall date</p>
          <p className="break-words text-sm font-medium text-foreground">
            {describeShortfallShift(base?.shortfallDate ?? null, scenario.shortfallDate)}
          </p>
        </div>
      </div>
    </section>
  );
}
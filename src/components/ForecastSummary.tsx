type Amount = number | string | null | undefined;

export type ForecastSummaryProps = {
  openingBalance?: Amount;
  lowestBalance?: Amount;
  lowestBalanceDate?: string | null;
  shortfallDate?: string | null;
};

function toNumber(value: Amount): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatInr(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

export default function ForecastSummary(props: ForecastSummaryProps) {
  const opening = toNumber(props.openingBalance);
  const lowest = toNumber(props.lowestBalance);
  const lowestDate = props.lowestBalanceDate ?? null;
  const shortfallDate = props.shortfallDate ?? null;

  if (lowest === null) {
    return (
      <section className="rounded-[var(--radius)] border bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Forecast summary</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No forecast yet. Add unpaid invoices, bills or a cash balance to see your projection.
        </p>
      </section>
    );
  }

  const isShort = lowest < 0;
  const shortfallAmount = isShort ? Math.abs(lowest) : 0;

  return (
    <section data-nexen-component="nx_components_ForecastSummary" aria-label="Forecast summary" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="min-w-0 rounded-[var(--radius)] border bg-card p-4 shadow-sm">
        <p className="text-sm text-muted-foreground">Opening cash</p>
        <p className="mt-1 break-words text-2xl font-bold text-foreground">
          {opening === null ? '—' : formatInr(opening)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Starting point of the forecast</p>
      </div>

      <div className="min-w-0 rounded-[var(--radius)] border bg-card p-4 shadow-sm">
        <p className="text-sm text-muted-foreground">Lowest balance</p>
        <p
          className={`mt-1 break-words text-2xl font-bold ${
            isShort ? 'text-destructive' : 'text-foreground'
          }`}
        >
          {formatInr(lowest)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">On {formatDate(lowestDate)}</p>
      </div>

      <div className="min-w-0 rounded-[var(--radius)] border bg-card p-4 shadow-sm">
        <p className="text-sm text-muted-foreground">Shortfall</p>
        {isShort ? (
          <>
            <p className="mt-1 break-words text-2xl font-bold text-destructive">
              {formatInr(shortfallAmount)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Balance first goes negative on {formatDate(shortfallDate)}
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 break-words text-2xl font-bold text-success">None</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Balance stays at or above zero in this horizon
            </p>
          </>
        )}
      </div>
    </section>
  );
}
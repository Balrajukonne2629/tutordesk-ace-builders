import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ForecastShortfallBannerProps {
  shortfallAmount?: number | string | null;
  shortfallDate?: string | null;
  horizonDays?: 30 | 60 | 90;
}

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});

function formatAmount(value: number): string {
  return inrFormatter.format(value);
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return dateFormatter.format(parsed);
}

export default function ForecastShortfallBanner({
  shortfallAmount,
  shortfallDate,
  horizonDays = 30,
}: ForecastShortfallBannerProps) {
  const rawAmount =
    shortfallAmount === null || shortfallAmount === undefined
      ? 0
      : Math.abs(Number(shortfallAmount));
  const amount = Number.isFinite(rawAmount) ? rawAmount : 0;
  const dateLabel = formatDate(shortfallDate);

  if (amount <= 0) {
    return (
      <div
        role="status"
        className="flex w-full min-w-0 items-start gap-3 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius)] bg-success/10 text-success">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            Cash stays above zero
          </p>
          <p className="text-sm text-muted-foreground">
            No shortfall is projected in the next {horizonDays} days.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-nexen-component="nx_components_ForecastShortfallBanner"
      role="alert"
      className="flex w-full min-w-0 flex-col gap-3 rounded-[var(--radius)] border border-destructive/40 bg-destructive/10 p-4 shadow-sm sm:flex-row sm:items-start"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius)] bg-destructive/15 text-destructive">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-semibold text-foreground">
          Cash runs short in the next {horizonDays} days
        </p>
        <p className="break-words text-sm text-foreground">
          You need{' '}
          <span className="font-semibold text-destructive">
            {formatAmount(amount)}
          </span>{' '}
          more to stay above zero
          {dateLabel ? (
            <>
              {' '}
              from{' '}
              <span className="font-medium">{dateLabel}</span>
            </>
          ) : null}
          .
        </p>
        <p className="text-sm text-muted-foreground">
          Chase overdue customers or move bill due dates to close the gap.
        </p>
      </div>
    </div>
  );
}
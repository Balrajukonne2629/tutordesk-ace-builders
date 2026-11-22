type HabitStatus = 'on_time' | 'late' | 'unpaid';

export interface PaymentHabitMarker {
  month: string;
  status: HabitStatus;
}

interface PaymentHabitMarkersProps {
  markers?: PaymentHabitMarker[];
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const STATUS_STYLES: Record<HabitStatus, { label: string; className: string; dot: string }> = {
  on_time: {
    label: 'On time',
    className: 'bg-primary/10 text-primary',
    dot: 'bg-primary',
  },
  late: {
    label: 'Late',
    className: 'bg-secondary text-secondary-foreground',
    dot: 'bg-secondary-foreground',
  },
  unpaid: {
    label: 'Unpaid',
    className: 'bg-destructive/10 text-destructive',
    dot: 'bg-destructive',
  },
};

// Formats a "YYYY-MM" key as a short month name. Pure and deterministic,
// so it renders identically on server and client.
function monthLabel(monthKey: string): string {
  const parts = String(monthKey ?? '').split('-');
  const index = Number(parts[1]) - 1;
  return MONTHS[index] ?? String(monthKey ?? '');
}

function isKnownStatus(value: unknown): value is HabitStatus {
  return value === 'on_time' || value === 'late' || value === 'unpaid';
}

export default function PaymentHabitMarkers({ markers }: PaymentHabitMarkersProps) {
  const safeMarkers = Array.isArray(markers) ? markers.slice(0, 6) : [];

  return (
    <section
      aria-label="Payment habit over the last six months"
      className="min-w-0 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm"
    >
      <div className="mb-3 flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-foreground">Payment habit</h3>
        <p className="text-xs text-muted-foreground">Last 6 months</p>
      </div>

      {safeMarkers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payment history yet.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {safeMarkers.map((marker, index) => {
            const status: HabitStatus = isKnownStatus(marker.status)
              ? marker.status
              : 'unpaid';
            const style = STATUS_STYLES[status];
            const key = `${marker.month ?? 'month'}-${index}`;

            return (
              <li data-nexen-component="nx_components_PaymentHabitMarkers"
                key={key}
                className="flex min-w-0 flex-col items-center gap-2 rounded-[var(--radius)] border border-border bg-background p-2"
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {monthLabel(marker.month)}
                </span>
                <span
                  className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${style.className}`}
                >
                  <span
                    aria-hidden="true"
                    className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`}
                  />
                  <span className="truncate">{style.label}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
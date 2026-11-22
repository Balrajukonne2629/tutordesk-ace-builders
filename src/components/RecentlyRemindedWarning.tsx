import { Fragment } from 'react';

type RecentlyRemindedWarningProps = {
  recentlyReminded?: boolean;
  lastSentAt?: string | null;
};

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});

function formatSentDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return dateFormatter.format(parsed);
}

export default function RecentlyRemindedWarning({
  recentlyReminded = false,
  lastSentAt = null,
}: RecentlyRemindedWarningProps) {
  if (!recentlyReminded) {
    return null;
  }

  const sentLabel = formatSentDate(lastSentAt);

  return (
    <div data-nexen-component="nx_components_RecentlyRemindedWarning"
      role="status"
      className="flex w-full min-w-0 flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] bg-accent text-accent-foreground">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">
          Recently reminded
        </p>
        <p className="text-sm text-muted-foreground">
          This customer was sent a reminder in the last 3 days. Wait a little
          before sending another one, so they do not feel chased.
        </p>
        {sentLabel ? (
          <Fragment>
            <p className="mt-1 text-xs text-muted-foreground">
              Last reminder sent on {sentLabel}
            </p>
          </Fragment>
        ) : null}
      </div>
    </div>
  );
}
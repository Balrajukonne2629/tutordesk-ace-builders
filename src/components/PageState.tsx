'use client';

import type { ReactNode } from 'react';

export type PageStateKind = 'loading' | 'empty' | 'error';

export type PageStateProps = {
  state: PageStateKind;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  rows?: number;
  icon?: ReactNode;
};

const DEFAULT_TITLE: Record<PageStateKind, string> = {
  loading: 'Loading…',
  empty: 'Nothing here yet',
  error: 'Something went wrong',
};

const DEFAULT_MESSAGE: Record<PageStateKind, string> = {
  loading: 'Fetching your latest data.',
  empty: 'Once you add records, they will appear here.',
  error: 'We could not load this page. Check your connection and try again.',
};

const DEFAULT_ACTION: Record<PageStateKind, string | undefined> = {
  loading: undefined,
  empty: undefined,
  error: 'Try again',
};

function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm"
        >
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-6 w-16 shrink-0 animate-pulse rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}

function StateIcon({ state, icon }: { state: PageStateKind; icon?: ReactNode }) {
  if (icon) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius)] bg-primary/10 text-primary">
        {icon}
      </div>
    );
  }

  const tone = state === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary';
  const path =
    state === 'error'
      ? 'M12 8v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'
      : 'M4 5h16M12 5v14';

  return (
    <div className={`flex h-10 w-10 items-center justify-center rounded-[var(--radius)] ${tone}`}>
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
        <path d={path} />
      </svg>
    </div>
  );
}

export default function PageState({
  state,
  title,
  message,
  actionLabel,
  onAction,
  rows = 3,
  icon,
}: PageStateProps) {
  const safeRows = Number.isFinite(rows) && rows > 0 ? Math.min(Math.floor(rows), 12) : 3;
  const resolvedTitle = title ?? DEFAULT_TITLE[state];
  const resolvedMessage = message ?? DEFAULT_MESSAGE[state];
  const resolvedAction = actionLabel ?? DEFAULT_ACTION[state];

  if (state === 'loading') {
    return (
      <div role="status" aria-live="polite" aria-busy="true" className="w-full min-w-0">
        <span className="sr-only">{resolvedTitle}</span>
        <SkeletonRows count={safeRows} />
      </div>
    );
  }

  const isError = state === 'error';

  return (
    <div data-nexen-component="nx_components_PageState"
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      className="flex w-full min-w-0 flex-col items-center gap-3 rounded-[var(--radius)] border border-border bg-card p-6 text-center shadow-sm sm:p-8"
    >
      <StateIcon state={state} icon={icon} />
      <div className="w-full max-w-sm min-w-0 space-y-1">
        <h2 className="break-words text-base font-semibold text-foreground">{resolvedTitle}</h2>
        <p className="break-words text-sm text-muted-foreground">{resolvedMessage}</p>
      </div>
      {resolvedAction && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-1 inline-flex h-10 items-center justify-center rounded-[var(--radius)] bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {resolvedAction}
        </button>
      ) : null}
    </div>
  );
}
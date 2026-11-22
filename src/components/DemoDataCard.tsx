'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createDemoData, deleteDemoData, getDemoData } from '@/lib/api';

type DemoDataCardProps = {
  onLoaded?: () => void;
};

function sumCounts(state: unknown): number {
  const values: unknown[] = Array.isArray(state)
    ? state
    : state && typeof state === 'object'
      ? Object.values(state as Record<string, unknown>)
      : [];
  return values.reduce<number>(
    (total, value) =>
      typeof value === 'number' && Number.isFinite(value) ? total + value : total,
    0,
  );
}

function messageOf(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

export default function DemoDataCard({ onLoaded }: DemoDataCardProps) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const state = await getDemoData();
      setLoaded(sumCounts(state) > 0);
    } catch (e) {
      setError(messageOf(e, 'Could not check demo data.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  async function runAction(action: () => Promise<unknown>, fallback: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setLoaded(true);
      if (onLoaded) {
        onLoaded();
      } else {
        router.push('/');
      }
    } catch (e) {
      setError(messageOf(e, fallback));
      await refetch();
    } finally {
      setBusy(false);
    }
  }

  function handleLoad() {
    return runAction(() => createDemoData({}), 'Could not load demo data. Please try again.');
  }

  function handleReset() {
    return runAction(async () => {
      await deleteDemoData();
      await createDemoData({});
    }, 'Could not reset demo data. Please try again.');
  }

  const disabled = busy || isLoading;

  return (
    <section data-nexen-component="nx_components_DemoDataCard" className="min-w-0 space-y-3 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-foreground">Demo data</h2>
        <p className="text-sm text-muted-foreground">
          Load sample students, invoices and payments to explore TutorDesk straight away.
          Names, dates and amounts are sample data.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Checking demo data…</p>
      ) : loaded ? (
        <p className="inline-block max-w-full rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          Demo data is loaded
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          No demo data yet. Load it to see how invoices, payments and forecasts look.
        </p>
      )}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleLoad}
          disabled={disabled || loaded}
          className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius)] bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm disabled:opacity-50 sm:w-auto"
        >
          {busy && !loaded ? 'Loading…' : 'Load demo data'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={disabled || !loaded}
          className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius)] border border-border bg-background px-4 text-sm font-medium text-foreground disabled:opacity-50 sm:w-auto"
        >
          Reset demo data
        </button>
      </div>
    </section>
  );
}
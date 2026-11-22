
'use client';

import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import Link from 'next/link';
import AgingBucketCards from '@/components/AgingBucketCards';
import ChaseTable from '@/components/ChaseTable';
import InrAmount from '@/components/InrAmount';
import PageState from '@/components/PageState';
import SummaryStatCards from '@/components/SummaryStatCards';
import { getBadDay, getDashboard, getDashboardAgingBucketCustomers } from '@/lib/api';

type BucketSummaries = NonNullable<ComponentProps<typeof AgingBucketCards>['buckets']>;
type BucketKey = NonNullable<ComponentProps<typeof AgingBucketCards>['activeBucket']>;
type ChaseRows = ComponentProps<typeof ChaseTable>['rows'];

type DashboardView = { aging_buckets: BucketSummaries; chase_table: ChaseRows };
type BadDayView = { is_active: boolean; late_customer_count: number; estimated_recovery: number };
type BucketCustomerRow = { customer_id: string; customer_name: string; balance: number; days_past_due: number };

const BUCKET_LABELS: Record<string, string> = {
  not_due: 'Not due yet',
  '1-7': '1 to 7 days late',
  '8-30': '8 to 30 days late',
  '30+': 'More than 30 days late',
};

export default function Page() {
  const [dash, setDash] = useState<DashboardView | null>(null);
  const [badDay, setBadDay] = useState<BadDayView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [activeBucket, setActiveBucket] = useState<BucketKey | null>(null);
  const [bucketRows, setBucketRows] = useState<BucketCustomerRow[] | null>(null);
  const [bucketError, setBucketError] = useState<string | null>(null);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    const dashP: Promise<unknown> = getDashboard();
    const badP: Promise<unknown> = getBadDay().catch(() => null);
    Promise.all([dashP, badP])
      .then(([rawDash, rawBad]) => {
        if (cancelled) return;
        setDash(rawDash as DashboardView);
        setBadDay(rawBad as BadDayView | null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load your dashboard.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!activeBucket) {
      setBucketRows(null);
      setBucketError(null);
      return;
    }
    let cancelled = false;
    setBucketRows(null);
    setBucketError(null);
    const p: Promise<unknown> = getDashboardAgingBucketCustomers(activeBucket);
    p.then((raw) => {
      if (!cancelled) setBucketRows(Array.isArray(raw) ? (raw as BucketCustomerRow[]) : []);
    }).catch((e: unknown) => {
      if (!cancelled) setBucketError(e instanceof Error ? e.message : 'Could not load this bucket.');
    });
    return () => {
      cancelled = true;
    };
  }, [activeBucket, reloadKey]);

  const handleSelect = (bucket: BucketKey) => {
    setActiveBucket((prev) => (prev === bucket ? null : bucket));
  };

  const buckets = dash?.aging_buckets ?? null;
  const chaseRows = dash?.chase_table ?? null;

  return (
    <div data-nexen-component="nx_app_page" className="mx-auto w-full max-w-3xl min-w-0 space-y-6 px-4 py-6 sm:px-6">
      {badDay?.is_active && (
        <Link
          href="/bad-day"
          className="block min-w-0 rounded-[var(--radius)] bg-primary p-4 text-primary-foreground shadow-md"
        >
          <p className="text-sm font-semibold">Bad-day mode: {badDay.late_customer_count} customers are late</p>
          <p className="text-sm opacity-90">
            Estimated recovery <InrAmount value={badDay.estimated_recovery} decimals={0} className="font-semibold" />.
            Review reminders now
          </p>
        </Link>
      )}

      <header className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">TutorDesk</p>
        <h1 className="text-2xl font-bold text-foreground">Who owes me</h1>
        <p className="text-sm text-muted-foreground">See who owes you, how much, and since when.</p>
      </header>

      {error ? (
        <PageState
          state="error"
          title="Could not load your dashboard"
          message={error}
          actionLabel="Try again"
          onAction={refetch}
        />
      ) : (
        <>
          <SummaryStatCards />

          <section className="min-w-0 space-y-3">
            <h2 className="text-base font-semibold text-foreground">Aging buckets</h2>
            <AgingBucketCards buckets={buckets} activeBucket={activeBucket} onSelect={handleSelect} />
          </section>

          {activeBucket ? (
            <section className="min-w-0 rounded-[var(--radius)] border border-border bg-card shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 p-4">
                <h2 className="min-w-0 text-base font-semibold text-foreground">
                  {BUCKET_LABELS[activeBucket] ?? activeBucket}
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveBucket(null)}
                  className="h-10 rounded-[var(--radius)] border border-border px-4 text-sm font-medium text-foreground"
                >
                  Show all
                </button>
              </div>
              {bucketError ? (
                <div className="p-4">
                  <PageState
                    state="error"
                    title="Could not load customers"
                    message={bucketError}
                    actionLabel="Try again"
                    onAction={refetch}
                  />
                </div>
              ) : bucketRows === null ? (
                <p className="p-4 text-sm text-muted-foreground">Loading customers…</p>
              ) : bucketRows.length === 0 ? (
                <div className="p-4">
                  <PageState
                    state="empty"
                    title="No customers in this bucket"
                    message="Pick another bucket or show all customers."
                    actionLabel="Show all"
                    onAction={() => setActiveBucket(null)}
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[20rem] text-left text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 font-medium">Customer</th>
                        <th className="px-4 py-2 font-medium">Days late</th>
                        <th className="px-4 py-2 text-right font-medium">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bucketRows.map((row) => (
                        <tr key={row.customer_id} className="border-t border-border">
                          <td className="min-w-0 px-4 py-3">
                            <Link
                              href={`/customers/${row.customer_id}`}
                              className="font-medium text-foreground underline-offset-4 hover:underline"
                            >
                              {row.customer_name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{row.days_past_due}</td>
                          <td className="px-4 py-3 text-right">
                            <InrAmount value={row.balance} decimals={0} className="font-semibold" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : (
            <section className="min-w-0 space-y-3">
              <h2 className="text-base font-semibold text-foreground">Who to chase</h2>
              {isLoading && !dash ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <ChaseTable rows={chaseRows} />
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
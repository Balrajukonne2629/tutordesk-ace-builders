'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import InrAmount from '@/components/InrAmount';
import { ApiError, createReminderDraftsBulk, getBadDay, getBadDayDrafts } from '@/lib/api';
import type { Reminder } from '@/types/reminder';

type BadDayView = Awaited<ReturnType<typeof getBadDay>>;

const TONE_LABEL: Record<string, string> = {
  friendly: 'Friendly',
  firm: 'Firm',
  final_notice: 'Final notice',
};

function errorMessage(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Something went wrong. Please try again.';
}

export default function BadDayPage() {
  const [view, setView] = useState<BadDayView | null>(null);
  const [drafts, setDrafts] = useState<Reminder[]>([]);
  const [index, setIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrafting, setIsDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [v, d] = await Promise.all([getBadDay(), getBadDayDrafts()]);
      setView(v);
      setDrafts(Array.isArray(d) ? d : []);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ranked = view?.ranked ?? [];
  const nameFor = (customerId: string) =>
    ranked.find((r) => r.customer_id === customerId)?.customer_name ?? 'Customer';

  async function handleDraftAll() {
    const ids = ranked.map((r) => r.customer_id);
    if (ids.length === 0) {
      setError('No late customers to draft reminders for.');
      return;
    }
    setIsDrafting(true);
    setError(null);
    setNotice(null);
    try {
      const created = await createReminderDraftsBulk({ customer_ids: ids });
      const fresh = await getBadDayDrafts();
      setDrafts(Array.isArray(fresh) ? fresh : []);
      setIndex(0);
      setNotice(
        `${created.length} draft${created.length === 1 ? '' : 's'} ready. Nothing has been sent.`,
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setIsDrafting(false);
    }
  }

  if (isLoading) {
    return <p className="p-4 text-sm text-muted-foreground">Loading bad-day view…</p>;
  }

  if (error && !view) {
    return (
      <div className="space-y-3 p-4">
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="h-11 rounded-[var(--radius)] border border-border px-4 text-sm"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!view) return null;

  const current = drafts[index];

  return (
    <div data-nexen-component="nx_app_bad_day_page" className="mx-auto w-full max-w-3xl space-y-6 p-4">
      <PageHeader
        title="Bad-day mode"
        subtitle="Chase the biggest and oldest debts first"
        eyebrow="Cash recovery"
        count={view.late_customer_count}
        countLabel="late customers"
        backHref="/"
        backLabel="Dashboard"
        actions={null}
      />

      {!view.is_active ? (
        <div className="rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium">Bad-day mode is off</p>
          <p className="mt-1 text-sm text-muted-foreground">
            It turns on when 5 or more customers are late. For now, use normal follow-ups.
          </p>
          <Link href="/reminders" className="mt-3 inline-block text-sm font-medium underline">
            Go to reminders
          </Link>
        </div>
      ) : (
        <>
          <section className="rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">Estimated recovery if the top 3 pay in full</p>
            <div className="mt-1 text-2xl font-semibold">
              <InrAmount value={view.estimated_recovery} decimals={0} className="" />
            </div>
            <button
              type="button"
              onClick={() => void handleDraftAll()}
              disabled={isDrafting}
              className="mt-4 h-11 w-full rounded-[var(--radius)] bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50 sm:w-auto"
            >
              {isDrafting ? 'Drafting…' : 'Draft all reminders'}
            </button>
            {notice && <p className="mt-2 text-sm text-muted-foreground">{notice}</p>}
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </section>

          <section className="rounded-[var(--radius)] border border-border bg-card shadow-sm">
            <h2 className="border-b border-border p-4 text-sm font-semibold">Ranked chase list</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Overdue</th>
                    <th className="p-3">Days late</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((r, i) => (
                    <tr key={r.customer_id} className="border-t border-border">
                      <td className="p-3">{i + 1}</td>
                      <td className="p-3">{r.customer_name}</td>
                      <td className="p-3">
                        <InrAmount value={r.overdue_amount} decimals={0} className="" />
                      </td>
                      <td className="p-3">{r.days_late} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {drafts.length > 0 && current && (
            <section className="rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">
                Draft {index + 1} of {drafts.length}
              </p>
              <h2 className="mt-1 text-base font-semibold">{nameFor(current.customerId)}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Tone: {TONE_LABEL[current.tone] ?? current.tone}
              </p>
              <Link
                href={`/reminders/${current.id}`}
                className="mt-3 inline-flex h-11 items-center rounded-[var(--radius)] bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                Open draft
              </Link>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  disabled={index === 0}
                  className="h-11 flex-1 rounded-[var(--radius)] border border-border text-sm disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setIndex((i) => Math.min(drafts.length - 1, i + 1))}
                  disabled={index >= drafts.length - 1}
                  className="h-11 flex-1 rounded-[var(--radius)] border border-border text-sm disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
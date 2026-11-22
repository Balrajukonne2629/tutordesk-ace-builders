'use client';

import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import Link from 'next/link';
import ChaseTable from '@/components/ChaseTable';
import PageHeader from '@/components/PageHeader';
import PageState from '@/components/PageState';
import ReminderList from '@/components/ReminderList';
import { getDashboard, getReminders } from '@/lib/api';
import type { Reminder } from '@/types/reminder';

type ChaseRow = NonNullable<ComponentProps<typeof ChaseTable>['rows']>[number];
type ReminderItems = ComponentProps<typeof ReminderList>['reminders'];
type Filter = 'all' | 'draft' | 'sent';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'sent', label: 'Sent' },
];

export default function RemindersPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [reminders, setReminders] = useState<ReminderItems>(null);
  const [chaseRows, setChaseRows] = useState<ChaseRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [list, drafts, dash] = await Promise.all([
        getReminders(filter === 'all' ? undefined : { status: filter }),
        getReminders({ status: 'draft' }),
        getDashboard(),
      ]);
      const draftCustomerIds = new Set(drafts.map((d: Reminder) => d.customerId));
      const chase: ChaseRow[] = Array.isArray(dash?.chase_table) ? dash.chase_table : [];
      setReminders(list);
      setChaseRows(chase.filter((r: ChaseRow) => !draftCustomerIds.has(r.customer_id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load reminders');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div data-nexen-component="nx_app_reminders_page" className="mx-auto w-full max-w-3xl min-w-0 space-y-6 px-4 py-6">
      <PageHeader
        eyebrow="Follow-ups"
        title="Reminders"
        subtitle="Chase overdue invoices on WhatsApp, one customer at a time."
        count={reminders?.length ?? 0}
        countLabel="reminders"
        backHref="/"
        backLabel="Dashboard"
        actions={
          <Link
            href="/reminders/new"
            className="inline-flex h-10 items-center rounded-[var(--radius)] bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            New reminder
          </Link>
        }
      />

      {error ? (
        <PageState
          state="error"
          title="Could not load reminders"
          message={error}
          actionLabel="Try again"
          onAction={() => void load()}
        />
      ) : null}

      <section className="min-w-0 space-y-3">
        <h2 className="text-base font-semibold text-foreground">Customers to chase</h2>
        <div className="min-w-0 overflow-x-auto rounded-[var(--radius)] border border-border bg-card shadow-sm">
          <ChaseTable rows={chaseRows} />
        </div>
      </section>

      <section className="min-w-0 space-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter reminders">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={`h-10 rounded-full border px-4 text-sm font-medium ${
                filter === f.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="min-w-0 overflow-x-auto">
          <ReminderList reminders={isLoading ? null : reminders} status={filter} />
        </div>
      </section>
    </div>
  );
}
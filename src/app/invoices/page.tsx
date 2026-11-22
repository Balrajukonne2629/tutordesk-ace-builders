'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import InvoiceStatusFilter from '@/components/InvoiceStatusFilter';
import InvoiceTable from '@/components/InvoiceTable';
import PageState from '@/components/PageState';
import { getInvoices } from '@/lib/api';

type InvoiceList = Awaited<ReturnType<typeof getInvoices>>;

const FILTER_KEYS = ['all', 'draft', 'sent', 'partial', 'paid', 'overdue'] as const;
type FilterKey = (typeof FILTER_KEYS)[number];
type StatusKey = Exclude<FilterKey, 'all'>;

function isFilterKey(value: string): value is FilterKey {
  return (FILTER_KEYS as readonly string[]).includes(value);
}

const noop = () => {};

const linkPrimary =
  'inline-flex h-11 items-center justify-center rounded-[var(--radius)] bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm';
const linkOutline =
  'inline-flex h-11 items-center justify-center rounded-[var(--radius)] border border-border bg-card px-4 text-sm font-medium text-foreground shadow-sm';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceList | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [filterError, setFilterError] = useState('');

  const load = useCallback(async () => {
    setLoadError(false);
    setInvoices(null);
    try {
      const rows = await getInvoices();
      setInvoices(Array.isArray(rows) ? rows : []);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const tally: Record<StatusKey, number> = { draft: 0, sent: 0, partial: 0, paid: 0, overdue: 0 };
    for (const row of invoices ?? []) {
      const status: string = row.status;
      if (status === 'draft' || status === 'sent' || status === 'partial' || status === 'paid' || status === 'overdue') {
        tally[status] += 1;
      }
    }
    return tally;
  }, [invoices]);

  const visible = useMemo(() => {
    if (!invoices) return null;
    if (filter === 'all') return invoices;
    return invoices.filter((row) => {
      const status: string = row.status;
      return status === filter;
    });
  }, [invoices, filter]);

  const handleFilterChange = (value: string) => {
    if (!isFilterKey(value)) {
      setFilterError('Choose a valid status: All, Draft, Sent, Partial, Paid, or Overdue.');
      return;
    }
    setFilterError('');
    setFilter(value);
  };

  const renderBody = () => {
    if (loadError) {
      return (
        <PageState
          state="error"
          title="Invoices could not be loaded"
          message="Check your connection and try again."
          actionLabel="Try again"
          onAction={() => void load()}
          rows={0}
          icon={null}
        />
      );
    }
    if (visible === null) {
      return (
        <PageState
          state="loading"
          title="Loading invoices"
          message=""
          actionLabel=""
          onAction={noop}
          rows={6}
          icon={null}
        />
      );
    }
    if (visible.length === 0) {
      const none = invoices?.length === 0;
      return (
        <div className="rounded-[var(--radius)] border border-border bg-card p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-foreground">
            {none ? 'No invoices yet' : `No ${filter} invoices right now`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {none
              ? 'Create one invoice or generate this month’s invoices for all your students.'
              : 'Choose another status to see more invoices.'}
          </p>
          {none && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/invoices/new" className={linkPrimary}>New invoice</Link>
              <Link href="/generate-invoices" className={linkOutline}>Generate monthly invoices</Link>
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="w-full overflow-x-auto rounded-[var(--radius)] border border-border bg-card shadow-sm">
        <InvoiceTable invoices={visible} isFiltered={filter !== 'all'} />
      </div>
    );
  };

  return (
    <main data-nexen-component="nx_app_invoices_page" className="mx-auto w-full max-w-5xl min-w-0 space-y-4 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Invoices</h1>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/invoices/new" className={linkPrimary}>New invoice</Link>
          <Link href="/generate-invoices" className={linkOutline}>Generate monthly invoices</Link>
        </div>
      </div>

      <div className="min-w-0">
        <InvoiceStatusFilter
          value={filter}
          onChange={handleFilterChange}
          counts={counts}
        />
        {filterError && (
          <p role="alert" className="mt-2 text-sm text-destructive">{filterError}</p>
        )}
      </div>

      {renderBody()}
    </main>
  );
}
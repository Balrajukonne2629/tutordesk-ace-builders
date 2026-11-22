'use client';

import Link from 'next/link';
import { useEffect, useState, type ComponentProps } from 'react';
import PaymentsTable from '@/components/PaymentsTable';
import PageState from '@/components/PageState';
import { ApiError, getCustomers, getPayments } from '@/lib/api';
import type { Customer } from '@/types/customer';

type PaymentRows = ComponentProps<typeof PaymentsTable>['payments'];
type MethodFilter = '' | 'upi' | 'cash' | 'bank';

const inputClass =
  'h-10 w-full min-w-0 rounded-[var(--radius)] border border-border bg-background px-3 text-sm text-foreground';
const labelClass = 'flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground';

export default function PaymentsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [method, setMethod] = useState<MethodFilter>('');
  const [customerId, setCustomerId] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<PaymentRows>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    getCustomers()
      .then((list) => {
        if (active) setCustomers(list);
      })
      .catch(() => {
        if (active) setCustomers([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    getPayments({
      from: from || undefined,
      to: to || undefined,
      method: method || undefined,
      customer_id: customerId || undefined,
    })
      .then((list) => {
        if (active) setPayments(list);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof ApiError ? err.message : 'Could not load the payments. Check your connection and try again.');
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [from, to, method, customerId, reloadKey]);

  const hasFilters = Boolean(from || to || method || customerId);
  const dateRangeInvalid = Boolean(from && to && from > to);

  function clearFilters() {
    setFrom('');
    setTo('');
    setMethod('');
    setCustomerId('');
  }

  return (
    <main data-nexen-component="nx_app_payments_page" className="mx-auto w-full max-w-5xl min-w-0 space-y-4 p-4 sm:p-6">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Payments</h1>
        <Link
          href="/payments/new"
          className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm"
        >
          New payment
        </Link>
      </div>

      <section className="grid min-w-0 grid-cols-1 gap-3 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <label className={labelClass}>
          From date
          <input type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className={labelClass}>
          To date
          <input type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className={labelClass}>
          Method
          <select
            className={inputClass}
            value={method}
            onChange={(e) => setMethod(e.target.value as MethodFilter)}
          >
            <option value="">All methods</option>
            <option value="upi">UPI</option>
            <option value="cash">Cash</option>
            <option value="bank">Bank</option>
          </select>
        </label>
        <label className={labelClass}>
          Customer
          <select
            className={inputClass}
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">All customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parentName} · {c.studentName}
              </option>
            ))}
          </select>
        </label>
        {dateRangeInvalid ? (
          <p className="text-sm text-danger sm:col-span-2 lg:col-span-4">
            The from date is after the to date. Change the dates to see payments.
          </p>
        ) : null}
        {hasFilters ? (
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-10 items-center rounded-[var(--radius)] border border-border px-4 text-sm font-medium text-foreground"
            >
              Clear filters
            </button>
          </div>
        ) : null}
      </section>

      {isLoading ? (
        <PageState
          state="loading"
          title="Loading payments"
          message="Fetching the payments you have recorded."
          rows={5}
          icon={null}
        />
      ) : error ? (
        <PageState
          state="error"
          title="Payments could not be loaded"
          message={error}
          actionLabel="Try again"
          onAction={() => setReloadKey((k) => k + 1)}
          rows={5}
          icon={null}
        />
      ) : (
        <div className="min-w-0 overflow-x-auto rounded-[var(--radius)] border border-border bg-card shadow-sm">
          <PaymentsTable payments={payments} />
        </div>
      )}
    </main>
  );
}
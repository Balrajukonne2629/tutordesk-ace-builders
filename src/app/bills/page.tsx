
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ApiError, createBillMarkPaid, getBills } from '@/lib/api';
import type { Bill } from '@/types/bill';

const WINDOW_DAYS = 90;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dayPart(value: unknown): string {
  return String(value ?? '').slice(0, 10);
}

function formatRs(value: number | string): string {
  const n = Number(value);
  if (Number.isNaN(n)) return 'Rs 0';
  return `Rs ${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function formatDate(value: unknown): string {
  const iso = dayPart(value);
  if (!iso) return '';
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
}

function validatePaidOn(value: string): string | null {
  if (!value) return 'Enter the date the bill was paid.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
    return 'Enter a valid date in DD/MM/YYYY format.';
  }
  if (value > todayIso()) return 'The paid date cannot be in the future.';
  return null;
}

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [paidOn, setPaidOn] = useState('');
  const [paidError, setPaidError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await getBills();
      setBills(Array.isArray(rows) ? rows : []);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : 'Could not load bills.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const limit = addDaysIso(WINDOW_DAYS);
    const all = bills ?? [];
    const inWindow = all.filter(
      (b) => b.status === 'paid' || dayPart(b.dueDate) <= limit,
    );
    return [...inWindow].sort((a, b) => {
      const aPaid = a.status === 'paid' ? 1 : 0;
      const bPaid = b.status === 'paid' ? 1 : 0;
      if (aPaid !== bPaid) return aPaid - bPaid;
      return dayPart(a.dueDate).localeCompare(dayPart(b.dueDate));
    });
  }, [bills]);

  const upcomingTotal = visible
    .filter((b) => b.status !== 'paid')
    .reduce((sum, b) => sum + Number(b.amount), 0);

  function startMarking(billId: string) {
    setMarkingId(billId);
    setPaidOn(todayIso());
    setPaidError(null);
  }

  async function confirmPaid(bill: Bill) {
    const error = validatePaidOn(paidOn);
    if (error) {
      setPaidError(error);
      return;
    }
    setSaving(true);
    try {
      await createBillMarkPaid(bill.id, { paid_on: paidOn });
      setMarkingId(null);
      await load();
    } catch (e) {
      setPaidError(
        e instanceof ApiError ? e.message : 'Could not mark this bill paid. Try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 p-4 text-foreground">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Bills</h1>
          <p className="text-sm text-muted-foreground">
            Rent, internet and materials due in the next {WINDOW_DAYS} days.
          </p>
        </div>
        <Link
          href="/bills/new"
          className="inline-flex h-11 items-center justify-center rounded-[var(--radius)] bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm"
        >
          Add bill
        </Link>
      </header>

      <section className="rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
        <p className="text-sm text-muted-foreground">Unpaid bills in this window</p>
        <p className="text-2xl font-bold">{formatRs(upcomingTotal)}</p>
      </section>

      {loadError && (
        <div className="rounded-[var(--radius)] border border-border bg-card p-4 text-sm">
          <p className="mb-3">{loadError}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="h-11 rounded-[var(--radius)] border border-border px-4 text-sm font-medium"
          >
            Try again
          </button>
        </div>
      )}

      {!loadError && bills === null && (
        <p className="text-sm text-muted-foreground">Loading bills…</p>
      )}

      {bills !== null && !loadError && visible.length === 0 && (
        <div className="rounded-[var(--radius)] border border-dashed border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">No bills due in the next 90 days.</p>
        </div>
      )}

      {visible.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-sm">
          {visible.map((bill) => {
            const isPaid = bill.status === 'paid';
            const isMarking = markingId === bill.id;
            return (
              <li data-nexen-component="nx_app_bills_page" key={bill.id} className="flex flex-col gap-3 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/bills/${bill.id}`}
                      className="block truncate font-medium underline-offset-4 hover:underline"
                    >
                      {bill.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {capitalize(String(bill.category ?? 'other'))} · Due {formatDate(bill.dueDate)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="font-medium">{formatRs(bill.amount)}</span>
                    <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                      {isPaid ? `Paid ${formatDate(bill.paidOn)}` : 'Unpaid'}
                    </span>
                  </div>
                </div>

                {!isPaid && !isMarking && (
                  <button
                    type="button"
                    onClick={() => startMarking(bill.id)}
                    className="h-11 w-full rounded-[var(--radius)] border border-border text-sm font-medium sm:w-auto sm:self-end sm:px-4"
                  >
                    Mark paid
                  </button>
                )}

                {!isPaid && isMarking && (
                  <div className="space-y-3 rounded-[var(--radius)] bg-background p-3">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="paid-on" className="text-sm font-medium">
                        Date paid (DD/MM/YYYY)
                      </label>
                      <input
                        id="paid-on"
                        type="date"
                        max={todayIso()}
                        value={paidOn}
                        onChange={(e) => {
                          setPaidOn(e.target.value);
                          setPaidError(null);
                        }}
                        className="h-11 w-full min-w-0 rounded-[var(--radius)] border border-border bg-card px-3 text-sm"
                      />
                      {paidError && (
                        <p role="alert" className="text-sm text-red-600">
                          {paidError}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setMarkingId(null)}
                        disabled={saving}
                        className="h-11 rounded-[var(--radius)] border border-border px-4 text-sm font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void confirmPaid(bill)}
                        disabled={saving}
                        className="h-11 rounded-[var(--radius)] bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
                      >
                        {saving ? 'Saving…' : 'Confirm paid'}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
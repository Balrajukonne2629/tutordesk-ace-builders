'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBillMarkPaid, deleteBill, getBillById, updateBill } from '@/lib/api';
import type { Bill } from '@/types/bill';
import InrAmount from '@/components/InrAmount';

type BillCategory = 'rent' | 'internet' | 'materials' | 'other';

const CATEGORY_OPTIONS: { value: BillCategory; label: string }[] = [
  { value: 'rent', label: 'Rent' },
  { value: 'internet', label: 'Internet' },
  { value: 'materials', label: 'Materials' },
  { value: 'other', label: 'Other' },
];

type FormState = {
  name: string;
  category: BillCategory;
  amount: string;
  dueDate: string;
  isRecurring: boolean;
};

type FormErrors = Partial<Record<'name' | 'amount' | 'dueDate' | 'paidOn', string>>;

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function toIsoDay(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '';
}

function formatIndianDate(value: string | null | undefined): string {
  const iso = toIsoDay(value);
  if (!iso) return '—';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

function isValidIsoDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && toIsoDay(parsed.toISOString()) !== '' && parsed.toISOString().slice(0, 10) !== '' ? true : false;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.';
}

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};
  const name = form.name.trim();
  if (!name) {
    errors.name = 'Please enter a name for this bill.';
  } else if (name.length > 60) {
    errors.name = 'Bill name must be 60 characters or fewer.';
  }

  const amount = Number(form.amount);
  if (!form.amount || Number.isNaN(amount) || amount <= 0 || amount > 1000000) {
    errors.amount = 'Enter an amount between Rs 1 and Rs 10,00,000.';
  }

  if (!form.dueDate) {
    errors.dueDate = 'Please pick a due date for this bill.';
  } else if (!isValidIsoDay(form.dueDate)) {
    errors.dueDate = 'Enter a valid date in DD/MM/YYYY format.';
  }
  return errors;
}

function toFormState(bill: Bill): FormState {
  return {
    name: bill.name,
    category: bill.category as BillCategory,
    amount: String(bill.amount),
    dueDate: toIsoDay(bill.dueDate),
    isRecurring: bill.isRecurring,
  };
}

export default function BillDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const billId = params.id;

  const [bill, setBill] = useState<Bill | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [paidOn, setPaidOn] = useState('');
  const [paidError, setPaidError] = useState<string | null>(null);
  const [isMarking, setIsMarking] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const applyBill = useCallback((next: Bill) => {
    setBill(next);
    setForm(toFormState(next));
  }, []);

  const loadBill = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const loaded = await getBillById(billId);
      applyBill(loaded);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [billId, applyBill]);

  useEffect(() => {
    void loadBill();
  }, [loadBill]);

  useEffect(() => {
    setPaidOn(todayIso());
  }, []);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    setFormMessage(null);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      const updated = await updateBill(billId, {
        name: form.name.trim(),
        category: form.category,
        amount: Number(form.amount),
        dueDate: form.dueDate,
        isRecurring: form.isRecurring,
      });
      applyBill(updated);
      setFormMessage('Bill saved.');
    } catch (err) {
      setFormMessage(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMarkPaid() {
    setPaidError(null);
    setActionError(null);
    if (!paidOn) {
      setPaidError('Enter the date the bill was paid.');
      return;
    }
    if (paidOn > todayIso()) {
      setPaidError('The paid date cannot be in the future.');
      return;
    }
    setIsMarking(true);
    try {
      const updated = await createBillMarkPaid(billId, { paid_on: paidOn });
      applyBill(updated);
    } catch (err) {
      setPaidError(errorMessage(err));
    } finally {
      setIsMarking(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this bill? It will no longer appear as a cash outflow.')) return;
    setActionError(null);
    setIsDeleting(true);
    try {
      await deleteBill(billId);
      router.push('/bills');
    } catch (err) {
      setActionError(errorMessage(err));
      setIsDeleting(false);
    }
  }

  const inputClass =
    'w-full min-w-0 rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm text-foreground';
  const labelClass = 'block text-sm font-medium text-foreground';
  const errorClass = 'mt-1 text-sm text-destructive';

  if (isLoading && !bill) {
    return <div className="mx-auto w-full max-w-2xl p-4 text-sm text-muted-foreground">Loading bill…</div>;
  }

  if (loadError || !bill || !form) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 p-4">
        <Link href="/bills" className="text-sm text-muted-foreground underline">
          Back to bills
        </Link>
        <div className="rounded-[var(--radius)] border border-border bg-card p-4 text-sm text-destructive">
          {loadError ?? 'This bill could not be found.'}
        </div>
      </div>
    );
  }

  const isPaid = bill.status === 'paid';

  return (
    <div data-nexen-component="nx_app_bills__id__page" className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <Link href="/bills" className="text-sm text-muted-foreground underline">
        Back to bills
      </Link>

      <section className="min-w-0 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="break-words text-xl font-bold text-foreground">{bill.name}</h1>
            <p className="text-sm text-muted-foreground">
              Due {formatIndianDate(bill.dueDate)}
              {bill.isRecurring ? ' · Repeats monthly' : ''}
            </p>
          </div>
          <span
            className={`inline-flex shrink-0 rounded-[999px] px-3 py-1 text-xs font-medium ${
              isPaid ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            {isPaid ? 'Paid' : 'Unpaid'}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Amount</p>
            <InrAmount value={bill.amount} decimals={0} className="text-lg font-semibold text-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Paid on</p>
            <p className="text-sm text-foreground">{bill.paidOn ? formatIndianDate(bill.paidOn) : 'Not paid yet'}</p>
          </div>
        </div>
      </section>

      {!isPaid && (
        <section className="space-y-3 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">Mark as paid</h2>
          <div>
            <label htmlFor="paid-on" className={labelClass}>
              Date paid
            </label>
            <input
              id="paid-on"
              type="date"
              max={todayIso()}
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
              className={inputClass}
            />
            {paidError && <p className={errorClass}>{paidError}</p>}
          </div>
          <button
            type="button"
            onClick={handleMarkPaid}
            disabled={isMarking}
            className="h-11 w-full rounded-[var(--radius)] bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {isMarking ? 'Saving…' : 'Mark paid'}
          </button>
        </section>
      )}

      <form onSubmit={handleSave} noValidate className="space-y-4 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Edit bill</h2>

        <div>
          <label htmlFor="bill-name" className={labelClass}>
            Name
          </label>
          <input
            id="bill-name"
            type="text"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            className={inputClass}
          />
          {errors.name && <p className={errorClass}>{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="bill-category" className={labelClass}>
            Category
          </label>
          <select
            id="bill-category"
            value={form.category}
            onChange={(e) => updateField('category', e.target.value as BillCategory)}
            className={inputClass}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="bill-amount" className={labelClass}>
            Amount (Rs)
          </label>
          <input
            id="bill-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="1"
            value={form.amount}
            onChange={(e) => updateField('amount', e.target.value)}
            className={inputClass}
          />
          {errors.amount && <p className={errorClass}>{errors.amount}</p>}
        </div>

        <div>
          <label htmlFor="bill-due" className={labelClass}>
            Due date
          </label>
          <input
            id="bill-due"
            type="date"
            value={form.dueDate}
            onChange={(e) => updateField('dueDate', e.target.value)}
            className={inputClass}
          />
          {errors.dueDate && <p className={errorClass}>{errors.dueDate}</p>}
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={form.isRecurring}
            onChange={(e) => updateField('isRecurring', e.target.checked)}
            className="h-4 w-4"
          />
          Repeats every month
        </label>

        {formMessage && <p className="text-sm text-muted-foreground">{formMessage}</p>}

        <button
          type="submit"
          disabled={isSaving}
          className="h-11 w-full rounded-[var(--radius)] bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <section className="space-y-3 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Delete bill</h2>
        <p className="text-sm text-muted-foreground">
          Use this only for a bill entered by mistake. It will stop counting as a cash outflow.
        </p>
        {actionError && <p className={errorClass}>{actionError}</p>}
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="h-11 w-full rounded-[var(--radius)] border border-destructive px-4 text-sm font-medium text-destructive disabled:opacity-50"
        >
          {isDeleting ? 'Deleting…' : 'Delete bill'}
        </button>
      </section>
    </div>
  );
}
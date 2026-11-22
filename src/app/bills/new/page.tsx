'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ApiError, createBill } from '@/lib/api';
import InrAmount from '@/components/InrAmount';

type FormErrors = {
  name?: string;
  amount?: string;
  dueDate?: string;
};

const MAX_NAME_LENGTH = 60;
const MIN_AMOUNT = 1;
const MAX_AMOUNT = 1000000;

function validateBill(name: string, amountText: string, dueDate: string): FormErrors {
  const errors: FormErrors = {};
  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    errors.name = 'Please enter a name for this bill.';
  } else if (trimmedName.length > MAX_NAME_LENGTH) {
    errors.name = 'Bill name must be 60 characters or fewer.';
  }

  const amount = Number(amountText);
  if (amountText.trim() === '' || !Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    errors.amount = 'Enter an amount between Rs 1 and Rs 10,00,000.';
  }

  if (dueDate.trim() === '') {
    errors.dueDate = 'Please pick a due date for this bill.';
  } else if (Number.isNaN(new Date(`${dueDate}T00:00:00`).getTime())) {
    errors.dueDate = 'Enter a valid date in DD/MM/YYYY format.';
  }

  return errors;
}

export default function NewBillPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [amountText, setAmountText] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const amountValue = Number(amountText);
  const previewAmount =
    amountText.trim() !== '' && Number.isFinite(amountValue) ? amountValue : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    const nextErrors = validateBill(name, amountText, dueDate);
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      await createBill({
        name: name.trim(),
        amount: amountValue,
        dueDate,
        isRecurring,
      });
      router.push('/bills');
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Could not save the bill. Please try again.',
      );
      setIsSaving(false);
    }
  }

  const inputClass =
    'h-12 w-full min-w-0 rounded-[var(--radius)] border border-border bg-background px-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <main data-nexen-component="nx_app_bills_new_page" className="mx-auto w-full max-w-xl space-y-6 p-4 sm:p-6">
      <div className="space-y-2">
        <Link href="/bills" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          Back to bills
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">New bill</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm sm:p-6"
      >
        <div className="space-y-2">
          <label htmlFor="bill-name" className="block text-sm font-medium text-foreground">
            Bill name
          </label>
          <input
            id="bill-name"
            type="text"
            value={name}
            placeholder="e.g. Rent, Internet, Materials"
            maxLength={MAX_NAME_LENGTH + 20}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={Boolean(errors.name)}
            className={inputClass}
          />
          {errors.name ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="bill-amount" className="block text-sm font-medium text-foreground">
            Amount (Rs)
          </label>
          <input
            id="bill-amount"
            type="number"
            inputMode="decimal"
            min={MIN_AMOUNT}
            step="0.01"
            value={amountText}
            placeholder="0"
            onChange={(e) => setAmountText(e.target.value)}
            aria-invalid={Boolean(errors.amount)}
            className={inputClass}
          />
          {errors.amount ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.amount}
            </p>
          ) : (
            <div className="text-sm text-muted-foreground">
              <InrAmount value={previewAmount} decimals={0} className="font-medium" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="bill-due-date" className="block text-sm font-medium text-foreground">
            Due date
          </label>
          <input
            id="bill-due-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            aria-invalid={Boolean(errors.dueDate)}
            className={inputClass}
          />
          <p className="text-xs text-muted-foreground">Format: DD/MM/YYYY</p>
          {errors.dueDate ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.dueDate}
            </p>
          ) : null}
        </div>

        <label className="flex min-h-12 cursor-pointer items-center gap-3 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-5 w-5 shrink-0 accent-[hsl(var(--primary))]"
          />
          Recurs monthly
        </label>

        {formError ? (
          <p role="alert" className="rounded-[var(--radius)] bg-destructive/10 p-3 text-sm text-destructive">
            {formError}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/bills"
            className="inline-flex h-12 items-center justify-center rounded-[var(--radius)] border border-border px-6 text-sm font-medium text-foreground"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            aria-busy={isSaving}
            className="inline-flex h-12 items-center justify-center rounded-[var(--radius)] bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save bill'}
          </button>
        </div>
      </form>
    </main>
  );
}
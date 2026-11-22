'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError, createPayment } from '@/lib/api';

type Method = 'upi' | 'cash' | 'bank';

const METHODS: { value: Method; label: string }[] = [
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
];

interface PaymentFormProps {
  invoiceId: string | null;
  outstanding: number;
  onSaved?: () => void;
}

const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

const inputClass =
  'h-11 w-full min-w-0 rounded-[var(--radius)] border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

export default function PaymentForm({ invoiceId, outstanding, onSaved }: PaymentFormProps) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [today, setToday] = useState('');
  const [receivedOn, setReceivedOn] = useState('');
  const [method, setMethod] = useState<Method | null>(null);
  const [reference, setReference] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Computed after mount so server and client markup match.
  useEffect(() => {
    const d = new Date();
    const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    setToday(iso);
    setReceivedOn(iso);
  }, []);

  if (!invoiceId) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm">
        Select an open invoice above to record its payment.
      </div>
    );
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    const n = Number(amount);
    if (amount.trim() === '') e.amount = 'Enter the amount received.';
    else if (!(n > 0) || n > outstanding + 0.001)
      e.amount = `Amount must be more than Rs 0 and no more than the Rs ${fmt(outstanding)} still due on this invoice.`;
    if (!receivedOn) e.receivedOn = 'Enter the date the payment was received.';
    else if (today && receivedOn > today) e.receivedOn = 'The payment date cannot be later than today.';
    if (!method) e.method = 'Choose how the payment was received: UPI, cash or bank.';
    if (reference.length > 60) e.reference = 'Keep the reference or note under 60 characters.';
    return e;
  }

  async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const v = validate();
    setErrors(v);
    setFormError(null);
    if (Object.keys(v).length > 0 || !invoiceId || !method) return;

    setSaving(true);
    try {
      await createPayment({
        invoiceId,
        amount: Math.round(Number(amount) * 100) / 100,
        receivedOn,
        method,
        reference: reference.trim() || undefined,
      });
      if (onSaved) onSaved();
      else router.push('/payments');
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not save the payment. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="w-full max-w-xl space-y-5 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm sm:p-6"
    >
      <div className="space-y-1.5">
        <label htmlFor="payment-amount" className="text-sm font-medium text-foreground">
          Amount (Rs)
        </label>
        <input
          id="payment-amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inputClass}
          placeholder="0"
        />
        {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="payment-date" className="text-sm font-medium text-foreground">
          Date received
        </label>
        <input
          id="payment-date"
          type="date"
          max={today || undefined}
          value={receivedOn}
          onChange={(e) => setReceivedOn(e.target.value)}
          className={inputClass}
        />
        {errors.receivedOn && <p className="text-sm text-destructive">{errors.receivedOn}</p>}
      </div>

      <div className="space-y-1.5">
        <p id="payment-method-label" className="text-sm font-medium text-foreground">
          Method
        </p>
        <div role="radiogroup" aria-labelledby="payment-method-label" className="grid grid-cols-3 gap-2">
          {METHODS.map((m) => {
            const selected = method === m.value;
            return (
              <button data-nexen-component="nx_components_PaymentForm"
                key={m.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setMethod(m.value)}
                className={`h-11 rounded-[var(--radius)] border text-sm font-medium transition-colors ${
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:bg-muted'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
        {errors.method && <p className="text-sm text-destructive">{errors.method}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="payment-reference" className="text-sm font-medium text-foreground">
          Reference or note <span className="text-muted-foreground">(optional)</span>
        </label>
        <input
          id="payment-reference"
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          className={inputClass}
          placeholder="UPI reference, cheque no., or note"
        />
        {errors.reference && <p className="text-sm text-destructive">{errors.reference}</p>}
      </div>

      {formError && (
        <p role="alert" className="rounded-[var(--radius)] border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {formError}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Link
          href="/payments"
          className="inline-flex h-11 items-center justify-center rounded-[var(--radius)] px-4 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-11 items-center justify-center rounded-[var(--radius)] bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save payment'}
        </button>
      </div>
    </form>
  );
}
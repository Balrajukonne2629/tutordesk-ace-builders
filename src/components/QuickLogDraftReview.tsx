
'use client';

import { useMemo, useState, type FormEvent } from 'react';

export type QuickLogMethod = 'upi' | 'cash' | 'bank';

export interface QuickLogCandidate {
  id: string;
  name: string;
}

export interface QuickLogInvoiceOption {
  id: string;
  invoiceNumber: string;
  customerId: string;
  dueDate: string;
  outstanding: number;
}

export interface QuickLogDraftValues {
  payerName: string;
  amount: string;
  receivedOn: string;
  method: QuickLogMethod | '';
  customerId: string;
  invoiceId: string;
}

interface QuickLogDraftReviewProps {
  initial: QuickLogDraftValues;
  customers: QuickLogCandidate[];
  invoices: QuickLogInvoiceOption[];
  today: string;
  isSaving?: boolean;
  onConfirm: (values: QuickLogDraftValues, amount: number) => void | Promise<void>;
  onCancel: () => void;
}

const METHODS: { value: QuickLogMethod; label: string }[] = [
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
];

const INPUT =
  'h-10 w-full min-w-0 rounded-[var(--radius)] border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

export default function QuickLogDraftReview({
  initial,
  customers,
  invoices,
  today,
  isSaving = false,
  onConfirm,
  onCancel,
}: QuickLogDraftReviewProps) {
  const [draft, setDraft] = useState<QuickLogDraftValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const openInvoices = useMemo(
    () =>
      invoices
        .filter((inv) => inv.customerId === draft.customerId && inv.outstanding > 0)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [invoices, draft.customerId],
  );
  const selected = openInvoices.find((inv) => inv.id === draft.invoiceId);

  function update<K extends keyof QuickLogDraftValues>(key: K, value: QuickLogDraftValues[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function changeCustomer(customerId: string) {
    const first = invoices
      .filter((inv) => inv.customerId === customerId && inv.outstanding > 0)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
    setDraft((d) => ({ ...d, customerId, invoiceId: first?.id ?? '' }));
  }

  function validate(): number | null {
    const next: Record<string, string> = {};
    const amount = Number(draft.amount);
    const balance = selected?.outstanding ?? 0;
    const name = draft.payerName.trim();

    if (!draft.amount.trim()) {
      next.amount = 'Enter the amount received in rupees.';
    } else if (!Number.isFinite(amount) || amount <= 0 || (selected && amount > balance)) {
      next.amount = `Amount must be between Rs 1 and the Rs ${balance.toFixed(2)} still due on this invoice.`;
    }
    if (name.length < 2 || name.length > 60) {
      next.payerName = "Enter the payer's name (2 to 60 characters).";
    }
    if (!draft.receivedOn || draft.receivedOn > today) {
      next.receivedOn = 'Payment date cannot be in the future. Check the date in the message.';
    }
    if (!draft.method) {
      next.method = 'Choose how the money was received: UPI, cash or bank.';
    }
    if (!draft.customerId) {
      next.customerId = 'Pick the customer this payment is from.';
    }
    if (draft.customerId && openInvoices.length === 0) {
      next.invoiceId = 'This customer has no unpaid invoice. Pick another customer.';
    } else if (!draft.invoiceId) {
      next.invoiceId = 'Pick which invoice this payment is for.';
    }

    setErrors(next);
    return Object.keys(next).length === 0 ? amount : null;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const amount = validate();
    if (amount === null) return;
    await onConfirm(draft, amount);
  }

  return (
    <form data-nexen-component="nx_components_QuickLogDraftReview"
      onSubmit={handleSubmit}
      noValidate
      className="w-full max-w-xl min-w-0 space-y-4 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm sm:p-6"
    >
      <h2 className="text-lg font-semibold text-foreground">Review payment</h2>

      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground" htmlFor="ql-payer">Payer name</label>
        <input id="ql-payer" className={INPUT} value={draft.payerName} onChange={(e) => update('payerName', e.target.value)} />
        {errors.payerName && <p role="alert" className="text-sm text-destructive">{errors.payerName}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground" htmlFor="ql-amount">Amount (Rs)</label>
          <input id="ql-amount" inputMode="decimal" className={INPUT} value={draft.amount} onChange={(e) => update('amount', e.target.value)} />
          {errors.amount && <p role="alert" className="text-sm text-destructive">{errors.amount}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground" htmlFor="ql-date">Received on</label>
          <input id="ql-date" type="date" max={today} className={INPUT} value={draft.receivedOn} onChange={(e) => update('receivedOn', e.target.value)} />
          {errors.receivedOn && <p role="alert" className="text-sm text-destructive">{errors.receivedOn}</p>}
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-sm font-medium text-foreground">Method</span>
        <div className="flex flex-wrap gap-2">
          {METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              aria-pressed={draft.method === m.value}
              onClick={() => update('method', m.value)}
              className={`h-9 rounded-full border px-4 text-sm font-medium ${
                draft.method === m.value
                  ? 'border-transparent bg-primary text-primary-foreground'
                  : 'border-border bg-background text-foreground'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {errors.method && <p role="alert" className="text-sm text-destructive">{errors.method}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground" htmlFor="ql-customer">Customer</label>
          <select id="ql-customer" className={INPUT} value={draft.customerId} onChange={(e) => changeCustomer(e.target.value)}>
            <option value="">Select a customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.customerId && <p role="alert" className="text-sm text-destructive">{errors.customerId}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground" htmlFor="ql-invoice">Applies to invoice</label>
          <select id="ql-invoice" className={INPUT} value={draft.invoiceId} onChange={(e) => update('invoiceId', e.target.value)} disabled={openInvoices.length === 0}>
            <option value="">No open invoice</option>
            {openInvoices.map((inv) => (
              <option key={inv.id} value={inv.id}>{inv.invoiceNumber}</option>
            ))}
          </select>
          {errors.invoiceId && <p role="alert" className="text-sm text-destructive">{errors.invoiceId}</p>}
        </div>
      </div>

      {selected && (
        <p className="min-w-0 break-words text-sm text-muted-foreground">
          Invoice {selected.invoiceNumber} · due {selected.dueDate} · still due Rs {selected.outstanding.toFixed(2)}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="h-10 rounded-[var(--radius)] border border-border bg-transparent px-4 text-sm font-medium text-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="h-10 rounded-[var(--radius)] bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm disabled:opacity-60"
        >
          {isSaving ? 'Saving…' : 'Confirm payment'}
        </button>
      </div>
    </form>
  );
}
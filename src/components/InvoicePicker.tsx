
'use client';

import Link from 'next/link';

export interface OpenInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  dueDate: string;
  outstandingAmount: number;
  status: 'sent' | 'partial' | 'overdue';
}

interface InvoicePickerProps {
  invoices: OpenInvoice[];
  value: string;
  onChange: (invoiceId: string) => void;
  error?: string;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function formatRs(amount: number): string {
  const n = Number(amount) || 0;
  return `Rs ${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function InvoicePicker({ invoices, value, onChange, error }: InvoicePickerProps) {
  const safeInvoices = Array.isArray(invoices) ? invoices : [];
  const errorId = 'invoice-picker-error';

  if (safeInvoices.length === 0) {
    return (
      <div
        role="status"
        className="w-full min-w-0 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm"
      >
        <p className="text-sm font-medium text-foreground">No open invoices to pay</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Only sent, partial or overdue invoices can take a payment. Send an invoice first, then record the payment here.
        </p>
        <Link
          href="/invoices"
          className="mt-3 inline-flex h-10 items-center rounded-[var(--radius)] border border-border px-4 text-sm font-medium text-foreground"
        >
          Go to Invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <span className="text-sm font-medium text-foreground" id="invoice-picker-label">
        Invoice
      </span>
      <div
        role="group"
        aria-labelledby="invoice-picker-label"
        aria-describedby={error ? errorId : undefined}
        className="flex w-full min-w-0 flex-col gap-2"
      >
        {safeInvoices.map((inv) => {
          const active = inv.id === value;
          return (
            <button data-nexen-component="nx_components_InvoicePicker"
              key={inv.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(inv.id)}
              className={`flex w-full min-w-0 flex-col gap-2 rounded-[var(--radius)] border p-3 text-left sm:flex-row sm:items-center sm:gap-3 ${
                active
                  ? 'border-primary bg-background ring-1 ring-primary'
                  : 'border-border bg-card'
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-xs text-muted-foreground">{inv.invoiceNumber}</span>
                <span className="block truncate text-sm font-medium text-foreground">{inv.customerName}</span>
                <span className="block text-xs text-muted-foreground">Due {formatDate(inv.dueDate)}</span>
              </span>
              <span className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                  {inv.status}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {formatRs(inv.outstandingAmount)} due
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
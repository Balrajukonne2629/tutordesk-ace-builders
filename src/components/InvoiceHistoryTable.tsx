import { Fragment } from 'react';
import type { Invoice } from '@/types/invoice';
import type { Payment } from '@/types/payment';

export type InvoiceHistoryRow = Invoice & { payments?: Payment[] | null };

interface InvoiceHistoryTableProps {
  invoices?: InvoiceHistoryRow[] | null;
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  partial: 'Partial',
  paid: 'Paid',
  overdue: 'Overdue',
};

const STATUS_CLASS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-muted text-foreground',
  partial: 'bg-accent/40 text-foreground',
  paid: 'bg-primary/10 text-primary',
  overdue: 'bg-destructive/10 text-destructive',
};

const METHOD_LABEL: Record<string, string> = {
  upi: 'UPI',
  cash: 'Cash',
  bank: 'Bank',
};

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatRs(value: unknown): string {
  return `Rs ${toNumber(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function formatDate(value: unknown): string {
  const d = new Date(value as string);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(d);
}

function timeOf(value: unknown): number {
  const t = new Date(value as string).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export default function InvoiceHistoryTable({ invoices }: InvoiceHistoryTableProps) {
  const rows = Array.isArray(invoices) ? invoices : [];

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No invoices yet for this customer.</p>
    );
  }

  const sorted = [...rows].sort((a, b) => timeOf(b.issuedDate) - timeOf(a.issuedDate));

  return (
    <div className="w-full overflow-x-auto rounded-[var(--radius)] border border-border bg-card shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Invoice</th>
            <th className="px-4 py-3 font-medium">Issued</th>
            <th className="px-4 py-3 font-medium">Due</th>
            <th className="px-4 py-3 text-right font-medium">Total</th>
            <th className="px-4 py-3 text-right font-medium">Outstanding</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((inv) => {
            const payments = Array.isArray(inv.payments) ? inv.payments : [];
            const paidSum = payments.reduce((sum, p) => sum + toNumber(p.amount), 0);
            const outstanding = Math.max(0, toNumber(inv.totalAmount) - paidSum);
            const status = String(inv.status);

            return (
              <Fragment key={inv.id}>
                <tr data-nexen-component="nx_components_InvoiceHistoryTable" className="border-t border-border align-top">
                  <td className="px-4 py-3 font-mono text-xs">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(inv.issuedDate)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(inv.dueDate)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {formatRs(inv.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {formatRs(outstanding)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_CLASS[status] ?? STATUS_CLASS.draft
                      }`}
                    >
                      {STATUS_LABEL[status] ?? status}
                    </span>
                  </td>
                </tr>
                {payments.length > 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 pb-3">
                      <ul className="space-y-1 rounded-[var(--radius)] bg-muted/40 p-3 text-xs text-muted-foreground">
                        {payments.map((p, idx) => (
                          <li
                            key={p.id ?? idx}
                            className="flex flex-wrap items-center gap-x-3 gap-y-1"
                          >
                            <span className="whitespace-nowrap">{formatDate(p.receivedOn)}</span>
                            <span>{METHOD_LABEL[String(p.method)] ?? String(p.method)}</span>
                            {p.reference ? (
                              <span className="font-mono break-all">{p.reference}</span>
                            ) : null}
                            <span className="ml-auto whitespace-nowrap text-foreground">
                              {formatRs(p.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
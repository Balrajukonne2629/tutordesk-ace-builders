import Link from 'next/link';
import type { Payment } from '@/types/payment';

export type PaymentRow = Payment & {
  customerName?: string;
  invoiceNumber?: string;
};

interface PaymentsTableProps {
  payments?: PaymentRow[] | null;
}

const METHOD_LABELS: Record<string, string> = {
  upi: 'UPI',
  cash: 'Cash',
  bank: 'Bank',
};

function formatDate(value: unknown): string {
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

function formatRupees(value: unknown): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Rs 0';
  return `Rs ${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function formatMethod(method: unknown): string {
  return METHOD_LABELS[String(method)] ?? String(method ?? '—');
}

export default function PaymentsTable({ payments }: PaymentsTableProps) {
  const rows = Array.isArray(payments) ? payments : [];

  if (rows.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-card p-6 text-center shadow-sm">
        <p className="font-medium text-foreground">No payments recorded yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Record money as it arrives so you can see who has paid.
        </p>
        <Link
          href="/payments/new"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-[var(--radius)] bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm"
        >
          New payment
        </Link>
      </div>
    );
  }

  return (
    <div data-nexen-component="nx_components_PaymentsTable" className="overflow-x-auto rounded-[var(--radius)] border border-border bg-card shadow-sm">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Date
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Customer
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Invoice
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Amount
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Method
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-muted/40">
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                {formatDate(row.receivedOn)}
              </td>
              <td className="min-w-0 px-4 py-3">
                <Link
                  href={`/payments/${row.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {row.customerName ?? '—'}
                </Link>
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                {row.invoiceNumber ?? '—'}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-foreground">
                {formatRupees(row.amount)}
              </td>
              <td className="px-4 py-3">
                <span className="inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {formatMethod(row.method)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
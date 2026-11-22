import Link from 'next/link';
import type { Invoice } from '@/types/invoice';

type InvoiceRow = Invoice & {
  customerName: string;
  outstandingAmount: number | string;
};

interface InvoiceTableProps {
  invoices?: InvoiceRow[] | null;
  isFiltered?: boolean;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-secondary text-muted-foreground',
  sent: 'bg-secondary text-foreground',
  partial: 'bg-accent text-accent-foreground',
  paid: 'bg-success/10 text-success',
  overdue: 'bg-destructive/10 text-destructive',
};

// Deterministic Indian-grouped rupee formatter (safe for SSR/CSR hydration).
function formatRupees(value: number | string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'Rs 0';
  const [intPart, dec] = Math.abs(n).toFixed(2).split('.');
  let grouped = intPart;
  if (intPart.length > 3) {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    grouped = `${rest},${last3}`;
  }
  const sign = n < 0 ? '-' : '';
  const decimals = dec === '00' ? '' : `.${dec}`;
  return `Rs ${sign}${grouped}${decimals}`;
}

// Deterministic date formatter (UTC, no locale APIs).
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function InvoiceTable({ invoices, isFiltered = false }: InvoiceTableProps) {
  const safeInvoices: InvoiceRow[] = Array.isArray(invoices) ? invoices : [];

  if (safeInvoices.length === 0) {
    return (
      <div className="w-full rounded-[var(--radius)] border border-border bg-card p-6 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          {isFiltered
            ? 'No invoices match this status.'
            : "No invoices yet. Create one, or generate this month's invoices."}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-[var(--radius)] border border-border bg-card shadow-sm">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Invoice</th>
            <th scope="col" className="px-4 py-3 font-medium">Customer</th>
            <th scope="col" className="px-4 py-3 font-medium">Due date</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Amount</th>
            <th scope="col" className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {safeInvoices.map((invoice) => {
            const href = `/invoices/${invoice.id}`;
            const statusClass = STATUS_STYLES[invoice.status] ?? STATUS_STYLES.draft;
            return (
              <tr data-nexen-component="nx_components_InvoiceTable"
                key={invoice.id}
                className="border-t border-border align-middle hover:bg-muted/30"
              >
                <td className="px-4 py-3">
                  <Link
                    href={href}
                    className="font-mono text-xs font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {invoice.invoiceNumber}
                  </Link>
                </td>
                <td className="min-w-0 px-4 py-3">
                  <Link href={href} className="block max-w-[12rem] truncate text-foreground hover:underline">
                    {invoice.customerName}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {formatDate(invoice.dueDate)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <span className="font-medium text-foreground">{formatRupees(invoice.totalAmount)}</span>
                  {Number(invoice.outstandingAmount) > 0 && invoice.status !== 'draft' && (
                    <span className="block text-xs text-muted-foreground">
                      Due {formatRupees(invoice.outstandingAmount)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass}`}
                  >
                    {statusLabel(invoice.status)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
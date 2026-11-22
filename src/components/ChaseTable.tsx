import Link from 'next/link';

export type ChaseRow = {
  customerId: string;
  parentName: string;
  studentName: string;
  phone: string;
  overdueAmount: number | string;
  maxDaysPastDue: number;
  invoiceCount?: number;
};

interface ChaseTableProps {
  rows?: ChaseRow[] | null;
}

function toNumber(value: number | string | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatInr(value: number): string {
  return `Rs ${Math.round(value).toLocaleString('en-IN')}`;
}

export default function ChaseTable({ rows }: ChaseTableProps) {
  const safeRows = Array.isArray(rows) ? rows : [];

  const sorted = safeRows
    .map((row) => ({
      ...row,
      amount: toNumber(row.overdueAmount),
      days: toNumber(row.maxDaysPastDue),
    }))
    .sort((a, b) => b.amount * b.days - a.amount * a.days);

  if (sorted.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm">
        No overdue customers. Nothing to chase today.
      </div>
    );
  }

  return (
    <div data-nexen-component="nx_components_ChaseTable" className="w-full overflow-x-auto rounded-[var(--radius)] border border-border bg-card shadow-sm">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Customer
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Phone
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Overdue
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Days late
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={row.customerId}
              className="border-b border-border last:border-b-0"
            >
              <td className="px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {row.parentName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.studentName}
                    {row.invoiceCount !== undefined
                      ? ` · ${row.invoiceCount} open`
                      : ''}
                  </p>
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                {row.phone}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-destructive">
                {formatInr(row.amount)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-foreground">
                {row.days}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <Link
                  href={`/customers/${row.customerId}`}
                  className="inline-flex h-8 items-center justify-center rounded-[var(--radius)] border border-border px-3 text-xs font-medium text-foreground hover:bg-muted"
                >
                  Chase
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
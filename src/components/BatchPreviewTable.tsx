
'use client';

export type BatchPreviewRow = {
  customerId: string;
  parentName: string;
  studentName: string;
  monthlyFee: number;
  billingDay: number;
  dueDate: string;
};

type Props = {
  rows?: BatchPreviewRow[] | null;
  selectedIds?: string[] | null;
  onToggle?: (customerId: string) => void;
  onToggleAll?: () => void;
};

function formatInr(value: number): string {
  const raw = Math.round(value).toString();
  const negative = raw.startsWith('-');
  const digits = negative ? raw.slice(1) : raw;
  if (digits.length <= 3) return `${negative ? '-' : ''}${digits}`;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${rest},${last3}`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

export default function BatchPreviewTable({ rows, selectedIds, onToggle, onToggleAll }: Props) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const selected = new Set(Array.isArray(selectedIds) ? selectedIds : []);
  const allSelected = safeRows.length > 0 && safeRows.every((r) => selected.has(r.customerId));

  if (safeRows.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-card p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-foreground">No invoices to create for this month</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Every active customer already has an invoice for this month.
        </p>
      </div>
    );
  }

  return (
    <div data-nexen-component="nx_components_BatchPreviewTable" className="overflow-x-auto rounded-[var(--radius)] border border-border bg-card shadow-sm">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        <thead className="bg-background text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="w-10 px-4 py-3">
              <input
                type="checkbox"
                aria-label="Select all invoices"
                className="h-4 w-4 accent-primary"
                checked={allSelected}
                onChange={() => onToggleAll?.()}
              />
            </th>
            <th className="px-4 py-3 font-medium">Parent</th>
            <th className="px-4 py-3 font-medium">Student</th>
            <th className="px-4 py-3 text-right font-medium">Monthly fee</th>
            <th className="px-4 py-3 text-center font-medium">Billing day</th>
            <th className="px-4 py-3 font-medium">Due date</th>
          </tr>
        </thead>
        <tbody>
          {safeRows.map((row) => (
            <tr key={row.customerId} className="border-t border-border">
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  aria-label={`Select invoice for ${row.parentName}`}
                  className="h-4 w-4 accent-primary"
                  checked={selected.has(row.customerId)}
                  onChange={() => onToggle?.(row.customerId)}
                />
              </td>
              <td className="px-4 py-3 font-medium text-foreground">{row.parentName}</td>
              <td className="px-4 py-3 text-muted-foreground">{row.studentName}</td>
              <td className="px-4 py-3 text-right font-medium text-foreground">
                Rs {formatInr(row.monthlyFee)}
              </td>
              <td className="px-4 py-3 text-center text-muted-foreground">{row.billingDay}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(row.dueDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
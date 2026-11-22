import Link from 'next/link';
import type { Customer } from '@/types/customer';

export type CustomerListItem = Customer & {
  currentBalance?: number | string | null;
};

interface CustomerListProps {
  customers?: CustomerListItem[] | null;
  isSearching?: boolean;
}

const inrFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

function formatRs(value: unknown): string {
  const n = Number(value ?? 0);
  return `Rs ${inrFormatter.format(Number.isFinite(n) ? n : 0)}`;
}

function initialOf(name: unknown): string {
  return typeof name === 'string' && name.trim().length > 0
    ? name.trim().charAt(0).toUpperCase()
    : '?';
}

export default function CustomerList({ customers, isSearching = false }: CustomerListProps) {
  const safeCustomers = Array.isArray(customers) ? customers : [];

  if (safeCustomers.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border bg-card p-6 text-center shadow-sm">
        <p className="font-medium text-foreground">
          {isSearching ? 'No customers match that search.' : 'No customers yet.'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSearching
            ? 'Try a different parent name, student name or phone.'
            : 'Add your first parent and student to start billing.'}
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {safeCustomers.map((customer) => {
        const owes = Number(customer.currentBalance ?? 0) > 0;

        return (
          <li data-nexen-component="nx_components_CustomerList" key={customer.id}>
            <Link
              href={`/customers/${customer.id}`}
              className="flex flex-col gap-3 rounded-[var(--radius)] border bg-card p-4 shadow-sm transition-colors hover:bg-muted sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                  {initialOf(customer.parentName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{customer.parentName}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {customer.studentName} · {customer.subject}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm sm:justify-end">
                <span className="text-muted-foreground">
                  Fee <span className="font-medium text-foreground">{formatRs(customer.monthlyFee)}</span>
                </span>
                <span className="text-muted-foreground">Day {customer.billingDay}</span>
                <span className="text-muted-foreground">
                  Owes{' '}
                  <span
                    className={
                      owes ? 'font-semibold text-destructive' : 'font-medium text-foreground'
                    }
                  >
                    {formatRs(customer.currentBalance)}
                  </span>
                </span>
                {customer.isActive === false && (
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                    Inactive
                  </span>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
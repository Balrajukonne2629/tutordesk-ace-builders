type MoneyInput = number | string | null | undefined;

interface InvoiceBalanceInput {
  totalAmount: MoneyInput;
  outstandingAmount: MoneyInput;
}

interface InvoiceBalanceSummaryProps {
  invoice?: InvoiceBalanceInput | null;
  paymentAmount?: MoneyInput;
}

function toNumber(value: MoneyInput): number {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function formatRs(value: number): string {
  return `Rs ${value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export default function InvoiceBalanceSummary({
  invoice = null,
  paymentAmount = 0,
}: InvoiceBalanceSummaryProps) {
  if (!invoice) {
    return (
      <section
        aria-label="Invoice balance"
        className="w-full min-w-0 rounded-[var(--radius)] border border-dashed border-border bg-card p-4 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-foreground">Invoice balance</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick an invoice to see its balance here.
        </p>
      </section>
    );
  }

  const total = toNumber(invoice.totalAmount);
  const outstanding = Math.max(0, toNumber(invoice.outstandingAmount));
  const received = Math.max(0, total - outstanding);
  const entered = Math.max(0, toNumber(paymentAmount));
  const outstandingAfter = Math.max(0, outstanding - entered);
  const isOverpaying = entered > outstanding;

  const rows: { label: string; value: string; emphasis?: boolean }[] = [
    { label: 'Invoice total', value: formatRs(total) },
    { label: 'Already received', value: formatRs(received) },
    { label: 'Outstanding now', value: formatRs(outstanding), emphasis: true },
    { label: 'Outstanding after this payment', value: formatRs(outstandingAfter), emphasis: true },
  ];

  return (
    <section data-nexen-component="nx_components_InvoiceBalanceSummary"
      aria-label="Invoice balance"
      className="w-full min-w-0 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm"
    >
      <h2 className="text-sm font-semibold text-foreground">Invoice balance</h2>

      <dl className="mt-3 divide-y divide-border">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
          >
            <dt className="min-w-0 text-sm text-muted-foreground">{row.label}</dt>
            <dd
              className={`min-w-0 break-words text-sm sm:text-right ${
                row.emphasis ? 'font-semibold text-foreground' : 'text-foreground'
              }`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {isOverpaying && (
        <p role="alert" className="mt-3 text-sm text-danger">
          The amount is more than the outstanding balance of {formatRs(outstanding)}.
        </p>
      )}
    </section>
  );
}
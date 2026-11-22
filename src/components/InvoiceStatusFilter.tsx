'use client';

export const INVOICE_STATUS_FILTER_VALUES = [
  'all',
  'draft',
  'sent',
  'partial',
  'paid',
  'overdue',
] as const;

export type InvoiceStatusFilterValue = (typeof INVOICE_STATUS_FILTER_VALUES)[number];

const OPTIONS: { value: InvoiceStatusFilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
];

const INVALID_STATUS_MESSAGE =
  'Choose a valid status: All, Draft, Sent, Partial, Paid, or Overdue.';

interface InvoiceStatusFilterProps {
  value: string;
  onChange: (value: InvoiceStatusFilterValue) => void;
  counts?: Partial<Record<InvoiceStatusFilterValue, number>>;
}

function isValidStatus(value: string): value is InvoiceStatusFilterValue {
  return (INVOICE_STATUS_FILTER_VALUES as readonly string[]).includes(value);
}

export default function InvoiceStatusFilter({
  value,
  onChange,
  counts,
}: InvoiceStatusFilterProps) {
  const isValid = isValidStatus(value);
  const selected: InvoiceStatusFilterValue = isValid ? value : 'all';
  const selectedOption = OPTIONS.find((opt) => opt.value === selected);
  const selectedLabel = selectedOption ? selectedOption.label : 'All';
  const selectedCount = counts ? counts[selected] : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div
        role="group"
        aria-label="Filter invoices by status"
        className="flex flex-wrap gap-2"
      >
        {OPTIONS.map((opt) => {
          const active = opt.value === selected;
          const count = counts ? counts[opt.value] : undefined;
          return (
            <button data-nexen-component="nx_components_InvoiceStatusFilter"
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt.value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{opt.label}</span>
              {count !== undefined && (
                <span className="font-mono text-xs opacity-80">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {!isValid && (
        <p role="alert" className="text-sm text-destructive">
          {INVALID_STATUS_MESSAGE}
        </p>
      )}

      {counts !== undefined && selectedCount === 0 && (
        <p className="text-sm text-muted-foreground">
          {selected === 'all'
            ? 'No invoices yet.'
            : `No ${selectedLabel.toLowerCase()} invoices.`}
        </p>
      )}
    </div>
  );
}
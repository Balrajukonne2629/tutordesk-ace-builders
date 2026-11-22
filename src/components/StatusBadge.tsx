import type { ReactElement } from 'react';

type BadgeKind = 'invoice' | 'payment' | 'reminder' | 'bill';

type Tone = 'neutral' | 'info' | 'positive' | 'warning' | 'danger';

interface StatusConfig {
  label: string;
  tone: Tone;
}

interface StatusBadgeProps {
  kind: BadgeKind;
  status: string;
  className?: string;
}

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  info: 'bg-secondary text-secondary-foreground',
  positive: 'bg-primary/10 text-primary',
  warning: 'bg-accent/40 text-foreground',
  danger: 'bg-destructive/10 text-destructive',
};

const STATUS_MAP: Record<BadgeKind, Record<string, StatusConfig>> = {
  invoice: {
    draft: { label: 'Draft', tone: 'neutral' },
    sent: { label: 'Sent', tone: 'info' },
    partial: { label: 'Part paid', tone: 'warning' },
    paid: { label: 'Paid', tone: 'positive' },
    overdue: { label: 'Overdue', tone: 'danger' },
  },
  payment: {
    upi: { label: 'UPI', tone: 'info' },
    cash: { label: 'Cash', tone: 'positive' },
    bank: { label: 'Bank', tone: 'neutral' },
  },
  reminder: {
    draft: { label: 'Draft', tone: 'neutral' },
    sent: { label: 'Sent', tone: 'positive' },
  },
  bill: {
    unpaid: { label: 'Unpaid', tone: 'warning' },
    paid: { label: 'Paid', tone: 'positive' },
  },
};

function resolveStatus(kind: BadgeKind, status: string): StatusConfig {
  const known = STATUS_MAP[kind][status];
  if (known) {
    return known;
  }
  return {
    label: status.replace(/_/g, ' '),
    tone: 'neutral',
  };
}

export default function StatusBadge({
  kind,
  status,
  className = '',
}: StatusBadgeProps): ReactElement {
  const { label, tone } = resolveStatus(kind, status);

  return (
    <span data-nexen-component="nx_components_StatusBadge"
      className={[
        'inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        TONE_CLASSES[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      <span className="truncate">{label}</span>
    </span>
  );
}
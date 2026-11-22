import Link from 'next/link';

export type ReminderTone = 'friendly' | 'firm' | 'final_notice';
export type ReminderRowStatus = 'draft' | 'sent';

export interface ReminderListItem {
  id: string;
  status: ReminderRowStatus;
  tone?: ReminderTone | null;
  customerName: string;
  invoiceNumber: string;
  daysLate: number;
  outstandingAmount: number;
  sentAt: string | null;
}

export interface ReminderListProps {
  reminders?: ReminderListItem[] | null;
  status?: 'all' | ReminderRowStatus;
}

const TONE_LABEL: Record<ReminderTone, string> = {
  friendly: 'Friendly',
  firm: 'Firm',
  final_notice: 'Final notice',
};

const TONE_CLASS: Record<ReminderTone, string> = {
  friendly: 'bg-muted text-muted-foreground',
  firm: 'bg-accent text-foreground',
  final_notice: 'bg-destructive/10 text-destructive',
};

const STATUS_LABEL: Record<ReminderRowStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
};

const STATUS_CLASS: Record<ReminderRowStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-primary/10 text-primary',
};

export function toneFromDaysLate(daysLate: number): ReminderTone {
  if (daysLate >= 30) return 'final_notice';
  if (daysLate >= 8) return 'firm';
  return 'friendly';
}

function chaseScore(item: ReminderListItem): number {
  return item.outstandingAmount * Math.max(item.daysLate, 0);
}

function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Not sent yet';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Not sent yet';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const letters = parts.map((part) => part.charAt(0)).join('').toUpperCase();
  return letters || '?';
}

export default function ReminderList({ reminders, status = 'all' }: ReminderListProps) {
  const safeReminders = Array.isArray(reminders) ? reminders : [];
  const filtered =
    status === 'all' ? safeReminders : safeReminders.filter((r) => r.status === status);

  const sorted = [...filtered].sort((a, b) => {
    if (status === 'sent') {
      return (b.sentAt ?? '').localeCompare(a.sentAt ?? '');
    }
    return chaseScore(b) - chaseScore(a);
  });

  if (sorted.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-card p-6 text-center text-sm text-muted-foreground shadow-sm">
        No reminders here yet.
      </div>
    );
  }

  return (
    <ul className="flex w-full flex-col gap-3">
      {sorted.map((item) => {
        const tone: ReminderTone = item.tone ?? toneFromDaysLate(item.daysLate);
        return (
          <li data-nexen-component="nx_components_ReminderList" key={item.id} className="w-full">
            <Link
              href={`/reminders/${item.id}`}
              className="flex w-full flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted/50 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                  {initialsOf(item.customerName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.customerName}
                  </p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {item.invoiceNumber}
                  </p>
                </div>
              </div>

              <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs sm:justify-end">
                <span className="text-sm font-semibold text-foreground">
                  {formatInr(item.outstandingAmount)}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 font-medium ${TONE_CLASS[tone]}`}
                >
                  {TONE_LABEL[tone]}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 font-medium ${STATUS_CLASS[item.status]}`}
                >
                  {STATUS_LABEL[item.status]}
                </span>
                <span className="text-muted-foreground">{formatDate(item.sentAt)}</span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
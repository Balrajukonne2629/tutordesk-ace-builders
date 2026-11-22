'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Alert } from '@/types/alert';
import {
  ApiError,
  createAlertAct,
  createAlertDismiss,
  createAlertSnooze,
  getAlerts,
  getInvoices,
} from '@/lib/api';

type Severity = 'critical' | 'warning' | 'info';
type PriorityFilter = 'all' | Severity;

type InvoiceRow = {
  id: string;
  invoice_number: string;
  customer_id: string;
  due_date: string;
  outstanding_amount: number;
  status: string;
};

type SnoozeOption = { key: string; label: string; days: number };

type SnoozeCheck =
  | { ok: true; snoozedUntil: string }
  | { ok: false; error: string };

const SEVERITY_RANK: Record<string, number> = { critical: 0, warning: 1, info: 2 };

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info',
};

const SEVERITY_PILL: Record<Severity, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  warning: 'bg-accent text-accent-foreground',
  info: 'bg-secondary text-secondary-foreground',
};

const FILTERS: { value: PriorityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
];

const SNOOZE_OPTIONS: SnoozeOption[] = [
  { key: 'tomorrow', label: 'Tomorrow', days: 1 },
  { key: '3days', label: '3 days', days: 3 },
  { key: '1week', label: '1 week', days: 7 },
];

const SNOOZE_CHOICE_ERROR = 'Choose how long to snooze this alert.';
const SNOOZE_RANGE_ERROR = 'Snooze must end after today and no later than the invoice due date.';

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayIso(): string {
  return toIsoDate(new Date());
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

function datePart(value: string | null | undefined): string | null {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function fmtDate(value: string | null | undefined): string {
  const part = datePart(value);
  if (!part) return '—';
  const d = new Date(`${part}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function fmtRs(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 'Rs 0';
  return `Rs ${Math.round(n).toLocaleString('en-IN')}`;
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Something went wrong. Please try again.';
}

function sortAlerts(list: Alert[]): Alert[] {
  return [...list].sort(
    (a, b) => (SEVERITY_RANK[a.severity] ?? 3) - (SEVERITY_RANK[b.severity] ?? 3),
  );
}

function invoiceIdsOf(alert: Alert): string[] {
  return Array.isArray(alert.invoiceIds)
    ? alert.invoiceIds.filter((x): x is string => typeof x === 'string')
    : [];
}

function targetFor(alert: Alert): string {
  switch (alert.alertType) {
    case 'overdue_chase':
    case 'final_notice': {
      const params = new URLSearchParams();
      if (alert.customerId) params.set('customerId', alert.customerId);
      if (alert.invoiceId) params.set('invoiceId', alert.invoiceId);
      const q = params.toString();
      return q ? `/reminders/new?${q}` : '/reminders/new';
    }
    case 'due_tomorrow':
      return alert.invoiceId ? `/invoices/${alert.invoiceId}` : '/invoices';
    case 'forecast_shortfall':
      return '/cash-forecast';
    case 'bill_due_low_cash':
      return alert.billId ? `/bills/${alert.billId}` : '/bills';
    case 'billing_day_reached':
      return '/generate-invoices';
    default:
      return '/';
  }
}

function validateSnooze(alert: Alert, optionKey: string | null): SnoozeCheck {
  const option = SNOOZE_OPTIONS.find((o) => o.key === optionKey);
  if (!option) return { ok: false, error: SNOOZE_CHOICE_ERROR };

  const until = addDaysIso(option.days);
  const today = todayIso();
  const due = datePart(alert.dueDate);

  if (until <= today || (due !== null && until > due)) {
    return { ok: false, error: SNOOZE_RANGE_ERROR };
  }
  return { ok: true, snoozedUntil: until };
}

export default function AlertsPage() {
  const router = useRouter();

  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PriorityFilter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [snoozingId, setSnoozingId] = useState<string | null>(null);
  const [snoozeChoice, setSnoozeChoice] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const list = await getAlerts();
      setAlerts(list);
    } catch (err) {
      setLoadError(errorMessage(err));
      setAlerts([]);
      return;
    }
    try {
      const rows: InvoiceRow[] = await getInvoices();
      setInvoices(rows);
    } catch {
      setInvoices([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const active = useMemo(
    () => sortAlerts((alerts ?? []).filter((a) => a.status === 'open')),
    [alerts],
  );

  const visible = useMemo(
    () => (filter === 'all' ? active : active.filter((a) => a.severity === filter)),
    [active, filter],
  );

  const counts: Record<PriorityFilter, number> = useMemo(
    () => ({
      all: active.length,
      critical: active.filter((a) => a.severity === 'critical').length,
      warning: active.filter((a) => a.severity === 'warning').length,
      info: active.filter((a) => a.severity === 'info').length,
    }),
    [active],
  );

  const invoiceById = useMemo(() => {
    const map = new Map<string, InvoiceRow>();
    for (const inv of invoices) map.set(inv.id, inv);
    return map;
  }, [invoices]);

  async function runAct(alert: Alert) {
    setBusyId(alert.id);
    setRowError(null);
    try {
      const updated = await createAlertAct(alert.id, {});
      router.push(targetFor(updated));
    } catch (err) {
      setRowError({ id: alert.id, message: errorMessage(err) });
      setBusyId(null);
    }
  }

  async function runDismiss(alert: Alert) {
    setBusyId(alert.id);
    setRowError(null);
    try {
      await createAlertDismiss(alert.id, {});
      await load();
    } catch (err) {
      setRowError({ id: alert.id, message: errorMessage(err) });
    } finally {
      setBusyId(null);
    }
  }

  async function runSnooze(alert: Alert) {
    const check = validateSnooze(alert, snoozeChoice);
    if (!check.ok) {
      setRowError({ id: alert.id, message: check.error });
      return;
    }
    setBusyId(alert.id);
    setRowError(null);
    try {
      await createAlertSnooze(alert.id, { snoozed_until: check.snoozedUntil });
      setSnoozingId(null);
      setSnoozeChoice(null);
      await load();
    } catch (err) {
      setRowError({ id: alert.id, message: errorMessage(err) });
    } finally {
      setBusyId(null);
    }
  }

  function toggleSnooze(alertId: string) {
    setRowError(null);
    setSnoozeChoice(null);
    setSnoozingId((current) => (current === alertId ? null : alertId));
  }

  function renderInvoiceList(alert: Alert) {
    const ids = invoiceIdsOf(alert);
    if (alert.alertType !== 'forecast_shortfall' || ids.length === 0) return null;

    const rows = ids
      .map((id) => invoiceById.get(id))
      .filter((inv): inv is InvoiceRow => inv !== undefined);

    if (rows.length === 0) return null;

    return (
      <div className="mt-3 min-w-0">
        <p className="text-xs font-medium text-muted-foreground">Invoices to chase</p>
        <ul className="mt-2 divide-y divide-border rounded-[var(--radius)] border border-border">
          {rows.map((inv) => (
            <li
              key={inv.id}
              className="flex min-w-0 flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-medium">{inv.invoice_number}</p>
                <p className="text-xs text-muted-foreground">
                  Due {fmtDate(inv.due_date)} · {fmtRs(inv.outstanding_amount)} outstanding
                </p>
              </div>
              <Link
                href={`/reminders/new?customerId=${inv.customer_id}&invoiceId=${inv.id}`}
                className="inline-flex h-11 items-center justify-center rounded-[var(--radius)] border border-border bg-background px-4 text-sm font-medium"
              >
                Chase
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  function renderSnoozePanel(alert: Alert) {
    if (snoozingId !== alert.id) return null;
    return (
      <div className="mt-3 min-w-0 rounded-[var(--radius)] border border-border bg-background p-3">
        <p className="text-sm font-medium">Snooze until</p>
        <div role="group" aria-label="Snooze period" className="mt-2 flex flex-wrap gap-2">
          {SNOOZE_OPTIONS.map((opt) => {
            const selected = snoozeChoice === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                aria-pressed={selected}
                onClick={() => setSnoozeChoice(opt.key)}
                className={`h-11 rounded-[var(--radius)] border px-4 text-sm font-medium ${
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-foreground'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          disabled={busyId !== null}
          onClick={() => runSnooze(alert)}
          className="mt-3 h-11 w-full rounded-[var(--radius)] bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50 sm:w-auto"
        >
          Confirm snooze
        </button>
      </div>
    );
  }

  function renderCard(alert: Alert) {
    const sev = (alert.severity in SEVERITY_LABEL ? alert.severity : 'info') as Severity;
    const busy = busyId === alert.id;
    const errorForRow = rowError && rowError.id === alert.id ? rowError.message : null;

    return (
      <article
        key={alert.id}
        className="min-w-0 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm"
      >
        <div className="min-w-0">
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${SEVERITY_PILL[sev]}`}
          >
            {SEVERITY_LABEL[sev]}
          </span>
          <p className="mt-2 break-words text-sm text-foreground">{alert.message}</p>
          {alert.dueDate ? (
            <p className="mt-1 text-xs text-muted-foreground">Due {fmtDate(alert.dueDate)}</p>
          ) : null}
          {alert.shortfallDate ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Cash short from {fmtDate(alert.shortfallDate)}
            </p>
          ) : null}
        </div>

        {renderInvoiceList(alert)}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            disabled={busyId !== null}
            onClick={() => runAct(alert)}
            className="h-11 min-w-0 rounded-[var(--radius)] bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? 'Working…' : alert.actionLabel}
          </button>
          <button
            type="button"
            disabled={busyId !== null}
            onClick={() => toggleSnooze(alert.id)}
            className="h-11 rounded-[var(--radius)] border border-border bg-card px-4 text-sm font-medium disabled:opacity-50"
          >
            Snooze
          </button>
          <button
            type="button"
            disabled={busyId !== null}
            onClick={() => runDismiss(alert)}
            className="h-11 rounded-[var(--radius)] border border-border bg-card px-4 text-sm font-medium disabled:opacity-50"
          >
            Dismiss
          </button>
        </div>

        {renderSnoozePanel(alert)}

        {errorForRow ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {errorForRow}
          </p>
        ) : null}
      </article>
    );
  }

  const loading = alerts === null && loadError === null;

  return (
    <main className="mx-auto w-full max-w-3xl min-w-0 space-y-4 px-4 py-6 sm:px-6">
      <header className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Alerts</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">What needs you today</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One action per alert. Dismiss or snooze the ones you do not need now.
        </p>
      </header>

      <div role="group" aria-label="Filter by priority" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const selected = filter === f.value;
          return (
            <button data-nexen-component="nx_app_alerts_page"
              key={f.value}
              type="button"
              aria-pressed={selected}
              onClick={() => setFilter(f.value)}
              className={`h-11 rounded-full border px-4 text-sm font-medium ${
                selected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-foreground'
              }`}
            >
              {f.label} ({counts[f.value]})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="rounded-[var(--radius)] border border-border bg-card p-6 text-sm text-muted-foreground">
          Checking alerts…
        </div>
      ) : null}

      {loadError ? (
        <div className="rounded-[var(--radius)] border border-border bg-card p-6">
          <p role="alert" className="text-sm text-destructive">
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 h-11 w-full rounded-[var(--radius)] bg-primary px-4 text-sm font-medium text-primary-foreground sm:w-auto"
          >
            Try again
          </button>
        </div>
      ) : null}

      {!loading && !loadError && visible.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border bg-card p-6 text-center">
          <p className="text-base font-semibold text-foreground">No alerts right now</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Nothing needs your action. You are all caught up.
          </p>
        </div>
      ) : null}

      {!loading && visible.length > 0 ? (
        <div className="space-y-3">{visible.map((alert) => renderCard(alert))}</div>
      ) : null}
    </main>
  );
}
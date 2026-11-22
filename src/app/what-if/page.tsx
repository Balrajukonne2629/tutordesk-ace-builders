'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import CustomerPicker from '@/components/CustomerPicker';
import WhatIfComparisonChart from '@/components/WhatIfComparisonChart';
import WhatIfSummary from '@/components/WhatIfSummary';
import { getCustomers, getWhatIfScenarios } from '@/lib/api';

type WhatIfResult = Awaited<ReturnType<typeof getWhatIfScenarios>>;
type WhatIfQuery = NonNullable<Parameters<typeof getWhatIfScenarios>[0]>;
type CustomerRow = Awaited<ReturnType<typeof getCustomers>>[number];
type Horizon = '30' | '60' | '90';

type FormValues = {
  choice: string;
  customerId: string;
  daysLate: string;
  expenseAmount: string;
  expenseDate: string;
};

type FieldErrors = { choice?: string; customer?: string; days?: string; expense?: string };

const PRESET = 'biggest_payer_15_days_late';
const SCENARIO_TYPES = ['customer_pays_late', 'customer_does_not_pay', 'unexpected_expense', 'everyone_on_time'];

const OPTIONS = [
  { value: PRESET, label: 'Biggest payer pays 15 days late (preset)' },
  { value: 'customer_pays_late', label: 'A customer pays late' },
  { value: 'customer_does_not_pay', label: 'A customer does not pay' },
  { value: 'unexpected_expense', label: 'An unexpected expense' },
  { value: 'everyone_on_time', label: 'Everyone pays on time' },
];

const HORIZONS: Horizon[] = ['30', '60', '90'];

const EMPTY_FORM: FormValues = {
  choice: '',
  customerId: '',
  daysLate: '15',
  expenseAmount: '',
  expenseDate: '',
};

function todayIst(): string {
  return new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);
}

function buildQuery(
  v: FormValues,
  days: Horizon,
  today: string,
): { errors: FieldErrors; query: WhatIfQuery | null } {
  const errors: FieldErrors = {};
  const choice = v.choice;

  if (!choice) {
    errors.choice = 'Choose a scenario type to see the what-if result.';
    return { errors, query: null };
  }
  if (choice.startsWith('biggest_payer') && choice !== PRESET) {
    errors.choice = 'Choose one of the listed preset scenarios.';
    return { errors, query: null };
  }
  if (choice !== PRESET && !SCENARIO_TYPES.includes(choice)) {
    errors.choice = 'Choose a scenario type to see the what-if result.';
    return { errors, query: null };
  }

  if (choice === 'customer_pays_late' || choice === 'customer_does_not_pay') {
    if (!v.customerId) errors.customer = 'Pick a customer for this scenario.';
  }
  if (choice === 'customer_pays_late') {
    const n = Number(v.daysLate);
    if (!Number.isInteger(n) || n < 1 || n > 90) {
      errors.days = 'Enter a number of days between 1 and 90.';
    }
  }
  if (choice === 'unexpected_expense') {
    const amount = Number(v.expenseAmount);
    if (!(amount > 0)) errors.expense = 'Enter an expense amount greater than Rs 0.';
  }
  if (Object.keys(errors).length > 0) return { errors, query: null };

  switch (choice) {
    case PRESET:
      return { errors, query: { preset: PRESET, days } };
    case 'customer_pays_late':
      return {
        errors,
        query: {
          scenario: 'customer_pays_late',
          customer_id: v.customerId,
          days_late: Number(v.daysLate),
          days,
        },
      };
    case 'customer_does_not_pay':
      return {
        errors,
        query: { scenario: 'customer_does_not_pay', customer_id: v.customerId, days },
      };
    case 'unexpected_expense':
      return {
        errors,
        query: {
          scenario: 'unexpected_expense',
          expense_amount: Number(v.expenseAmount),
          expense_date: v.expenseDate || today,
          days,
        },
      };
    default:
      return { errors, query: { scenario: 'everyone_on_time', days } };
  }
}

function describeScenario(v: FormValues, customers: CustomerRow[]): string {
  const customer = customers.find((c) => c.id === v.customerId);
  const name = customer ? customer.parentName : 'Customer';
  switch (v.choice) {
    case PRESET:
      return 'Biggest payer pays 15 days late';
    case 'customer_pays_late':
      return `${name} pays ${v.daysLate} days late`;
    case 'customer_does_not_pay':
      return `${name} does not pay`;
    case 'unexpected_expense':
      return `Unexpected expense of Rs ${Number(v.expenseAmount).toLocaleString('en-IN')}`;
    default:
      return 'Everyone pays on time';
  }
}

export default function WhatIfPage() {
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [customers, setCustomers] = useState<CustomerRow[] | null>(null);
  const [customersFailed, setCustomersFailed] = useState(false);
  const [horizon, setHorizon] = useState<Horizon>('90');
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [label, setLabel] = useState('');
  const [lastValues, setLastValues] = useState<FormValues | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runFailed, setRunFailed] = useState(false);
  const requestId = useRef(0);

  const loadCustomers = useCallback(() => {
    setCustomersFailed(false);
    getCustomers()
      .then((rows) => setCustomers(rows))
      .catch(() => {
        setCustomersFailed(true);
        setCustomers([]);
      });
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  async function run(values: FormValues, days: Horizon) {
    const built = buildQuery(values, days, todayIst());
    setErrors(built.errors);
    if (!built.query) return;

    const id = ++requestId.current;
    setLastValues(values);
    setIsRunning(true);
    setRunFailed(false);
    try {
      const data = await getWhatIfScenarios(built.query);
      if (id !== requestId.current) return;
      setResult(data);
      setLabel(describeScenario(values, customers ?? []));
    } catch {
      if (id !== requestId.current) return;
      setResult(null);
      setRunFailed(true);
    } finally {
      if (id === requestId.current) setIsRunning(false);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void run(form, horizon);
  }

  function chooseHorizon(next: Horizon) {
    setHorizon(next);
    if (lastValues) void run(lastValues, next);
  }

  function update(patch: Partial<FormValues>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  const needsCustomer = form.choice === 'customer_pays_late' || form.choice === 'customer_does_not_pay';
  const needsDays = form.choice === 'customer_pays_late';
  const needsExpense = form.choice === 'unexpected_expense';
  const hasNoCustomers = customers !== null && customers.length === 0 && !customersFailed;

  return (
    <main data-nexen-component="nx_app_what_if_page" className="mx-auto w-full max-w-3xl min-w-0 space-y-6 px-4 py-6 sm:px-6">
      <header className="min-w-0 space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cash forecast</p>
        <h1 className="text-2xl font-bold text-foreground">What-If Scenarios</h1>
        <p className="text-sm text-muted-foreground">
          Each scenario is compared against the current baseline forecast. Nothing you test is saved.
        </p>
      </header>

      {customersFailed && (
        <div role="alert" className="flex flex-col gap-3 rounded-[var(--radius)] border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground">Customers could not be loaded.</p>
          <button type="button" onClick={loadCustomers} className="h-11 rounded-[var(--radius)] border px-4 text-sm font-medium">
            Try again
          </button>
        </div>
      )}

      {hasNoCustomers ? (
        <section className="space-y-3 rounded-[var(--radius)] border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">No customers or forecast data yet</h2>
          <p className="text-sm text-muted-foreground">
            Add customers and their invoices first, so there is a forecast to test.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/customers" className="inline-flex h-12 items-center justify-center rounded-[var(--radius)] bg-primary px-5 text-sm font-medium text-primary-foreground">
              Add customers
            </Link>
            <Link href="/invoices" className="inline-flex h-12 items-center justify-center rounded-[var(--radius)] border px-5 text-sm font-medium">
              Go to invoices
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-[var(--radius)] border bg-card p-4 shadow-sm">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="min-w-0 space-y-1">
              <label htmlFor="scenario-choice" className="block text-sm font-medium text-foreground">
                Scenario
              </label>
              <select
                id="scenario-choice"
                value={form.choice}
                onChange={(e) => update({ choice: e.target.value })}
                className="h-12 w-full min-w-0 rounded-[var(--radius)] border bg-background px-3 text-base text-foreground"
              >
                <option value="">Choose a scenario</option>
                {OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {form.choice === PRESET && (
                <p className="text-xs text-muted-foreground">
                  Picks the customer with the highest monthly fee and moves their payments 15 days late.
                </p>
              )}
              {errors.choice && <p role="alert" className="text-sm text-destructive">{errors.choice}</p>}
            </div>

            {needsCustomer && (
              <CustomerPicker
                value={form.customerId}
                onChange={(customerId: string) => update({ customerId })}
                error={errors.customer ?? ''}
              />
            )}

            {needsDays && (
              <div className="min-w-0 space-y-1">
                <label htmlFor="days-late" className="block text-sm font-medium text-foreground">
                  Days late
                </label>
                <input
                  id="days-late"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={90}
                  step={1}
                  value={form.daysLate}
                  onChange={(e) => update({ daysLate: e.target.value })}
                  className="h-12 w-full min-w-0 rounded-[var(--radius)] border bg-background px-3 text-base text-foreground"
                />
                {errors.days && <p role="alert" className="text-sm text-destructive">{errors.days}</p>}
              </div>
            )}

            {needsExpense && (
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <div className="min-w-0 space-y-1">
                  <label htmlFor="expense-amount" className="block text-sm font-medium text-foreground">
                    Expense amount (Rs)
                  </label>
                  <input
                    id="expense-amount"
                    type="number"
                    inputMode="decimal"
                    min={1}
                    value={form.expenseAmount}
                    onChange={(e) => update({ expenseAmount: e.target.value })}
                    className="h-12 w-full min-w-0 rounded-[var(--radius)] border bg-background px-3 text-base text-foreground"
                  />
                  {errors.expense && <p role="alert" className="text-sm text-destructive">{errors.expense}</p>}
                </div>
                <div className="min-w-0 space-y-1">
                  <label htmlFor="expense-date" className="block text-sm font-medium text-foreground">
                    Expense date
                  </label>
                  <input
                    id="expense-date"
                    type="date"
                    value={form.expenseDate}
                    onChange={(e) => update({ expenseDate: e.target.value })}
                    className="h-12 w-full min-w-0 rounded-[var(--radius)] border bg-background px-3 text-base text-foreground"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div role="group" aria-label="Forecast horizon" className="flex gap-2">
                {HORIZONS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    aria-pressed={horizon === h}
                    onClick={() => chooseHorizon(h)}
                    className={
                      'h-11 min-w-0 flex-1 rounded-[var(--radius)] border px-4 text-sm font-medium sm:flex-none ' +
                      (horizon === h ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground')
                    }
                  >
                    {h} days
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={isRunning}
                className="h-12 w-full rounded-[var(--radius)] bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-50 sm:w-auto"
              >
                {isRunning ? 'Calculating…' : 'Run what-if'}
              </button>
            </div>
          </form>
        </section>
      )}

      {isRunning && (
        <div aria-live="polite" className="animate-pulse rounded-[var(--radius)] border bg-card p-6 text-sm text-muted-foreground">
          Calculating the forecast…
        </div>
      )}

      {runFailed && !isRunning && (
        <div role="alert" className="flex flex-col gap-3 rounded-[var(--radius)] border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground">Scenarios could not be calculated.</p>
          <button
            type="button"
            onClick={() => lastValues && void run(lastValues, horizon)}
            className="h-11 rounded-[var(--radius)] border px-4 text-sm font-medium"
          >
            Try again
          </button>
        </div>
      )}

      {!isRunning && !runFailed && (
        <>
          <WhatIfComparisonChart
            baseline={result ? result.baseline.daily : []}
            scenario={result ? result.scenario.daily : []}
            scenarioLabel={label}
          />
          {result && (
            <WhatIfSummary baseline={result.baseline} scenario={result.scenario} />
          )}
        </>
      )}
    </main>
  );
}
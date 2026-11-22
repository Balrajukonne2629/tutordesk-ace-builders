'use client';

import { useState, type FormEvent } from 'react';
import type { Customer } from '@/types/customer';

export type WhatIfScenarioType =
  | 'customer_pays_late'
  | 'customer_does_not_pay'
  | 'unexpected_expense'
  | 'everyone_on_time';

export type WhatIfPresetName = 'biggest_payer_15_days_late';

export type WhatIfSelection = {
  scenario: WhatIfScenarioType;
  preset?: WhatIfPresetName;
  customer_id?: string;
  days_late?: number;
  expense_amount?: number;
};

type CustomerOption = Pick<Customer, 'id' | 'parentName' | 'studentName'>;

type OptionId = WhatIfPresetName | 'customer_pays_late' | 'customer_does_not_pay' | 'unexpected_expense' | 'everyone_on_time';

type Option = {
  id: OptionId;
  label: string;
  scenario: WhatIfScenarioType;
  needsCustomer: boolean;
  needsDays: boolean;
  needsExpense: boolean;
};

const OPTIONS: Option[] = [
  { id: 'biggest_payer_15_days_late', label: 'Biggest payer pays 15 days late', scenario: 'customer_pays_late', needsCustomer: false, needsDays: false, needsExpense: false },
  { id: 'customer_pays_late', label: 'A customer pays late', scenario: 'customer_pays_late', needsCustomer: true, needsDays: true, needsExpense: false },
  { id: 'customer_does_not_pay', label: 'A customer does not pay', scenario: 'customer_does_not_pay', needsCustomer: true, needsDays: false, needsExpense: false },
  { id: 'unexpected_expense', label: 'An unexpected expense', scenario: 'unexpected_expense', needsCustomer: false, needsDays: false, needsExpense: true },
  { id: 'everyone_on_time', label: 'Everyone pays on time', scenario: 'everyone_on_time', needsCustomer: false, needsDays: false, needsExpense: false },
];

const PRESET_IDS: OptionId[] = OPTIONS.map((o) => o.id);

const ERRORS = {
  type: 'Choose a scenario type to see the what-if result.',
  customer: 'Pick a customer for this scenario.',
  days: 'Enter a number of days between 1 and 90.',
  expense: 'Enter an expense amount greater than Rs 0.',
  preset: 'Choose one of the listed preset scenarios.',
};

type Props = {
  customers?: CustomerOption[];
  isLoading?: boolean;
  onApply?: (selection: WhatIfSelection) => void;
};

export default function WhatIfScenarioPicker({ customers: customersProp, isLoading = false, onApply }: Props) {
  const customers = Array.isArray(customersProp) ? customersProp : [];
  const [optionId, setOptionId] = useState<OptionId | ''>('');
  const [customerId, setCustomerId] = useState('');
  const [daysLate, setDaysLate] = useState('');
  const [expense, setExpense] = useState('');
  const [error, setError] = useState<string | null>(null);

  const option = OPTIONS.find((o) => o.id === optionId);

  function validate(): { error: string } | { selection: WhatIfSelection } {
    if (!option) return { error: ERRORS.type };
    if (!PRESET_IDS.includes(option.id)) return { error: ERRORS.preset };

    const preset = option.id === 'biggest_payer_15_days_late' ? 'biggest_payer_15_days_late' : undefined;
    const selection: WhatIfSelection = { scenario: option.scenario };
    if (preset) {
      selection.preset = preset;
      selection.days_late = 15;
      return { selection };
    }

    if (option.needsCustomer) {
      if (!customerId || !customers.some((c) => c.id === customerId)) return { error: ERRORS.customer };
      selection.customer_id = customerId;
    }
    if (option.needsDays) {
      const n = Number(daysLate);
      if (!/^\d+$/.test(daysLate.trim()) || n < 1 || n > 90) return { error: ERRORS.days };
      selection.days_late = n;
    }
    if (option.needsExpense) {
      const amount = Number(expense);
      if (Number.isNaN(amount) || amount <= 0) return { error: ERRORS.expense };
      selection.expense_amount = amount;
    }
    return { selection };
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = validate();
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setError(null);
    onApply?.(result.selection);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full min-w-0 space-y-4 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium text-foreground">Choose a scenario</legend>
        <div role="radiogroup" className="grid gap-2">
          {OPTIONS.map((o) => {
            const selected = optionId === o.id;
            return (
              <button data-nexen-component="nx_components_WhatIfScenarioPicker"
                key={o.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setOptionId(o.id);
                  setError(null);
                }}
                className={`w-full min-w-0 rounded-[var(--radius)] border px-3 py-2 text-left text-sm transition-colors ${
                  selected ? 'border-primary bg-accent text-foreground' : 'border-border bg-background text-foreground'
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {option?.needsCustomer && (
        <div className="space-y-1">
          <label htmlFor="whatif-customer" className="text-sm font-medium text-foreground">Customer</label>
          {customers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add a customer first to test a late or missing payment.</p>
          ) : (
            <select
              id="whatif-customer"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="h-10 w-full max-w-full rounded-[var(--radius)] border border-border bg-background px-3 text-sm text-foreground"
            >
              <option value="">Select a customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parentName} ({c.studentName})
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {option?.needsDays && (
        <div className="space-y-1">
          <label htmlFor="whatif-days" className="text-sm font-medium text-foreground">Days late</label>
          <input
            id="whatif-days"
            type="number"
            inputMode="numeric"
            min={1}
            max={90}
            value={daysLate}
            onChange={(e) => setDaysLate(e.target.value)}
            className="h-10 w-full max-w-[12rem] rounded-[var(--radius)] border border-border bg-background px-3 text-sm text-foreground"
          />
        </div>
      )}

      {option?.needsExpense && (
        <div className="space-y-1">
          <label htmlFor="whatif-expense" className="text-sm font-medium text-foreground">Expense amount (Rs)</label>
          <input
            id="whatif-expense"
            type="number"
            inputMode="decimal"
            min={1}
            value={expense}
            onChange={(e) => setExpense(e.target.value)}
            className="h-10 w-full max-w-[12rem] rounded-[var(--radius)] border border-border bg-background px-3 text-sm text-foreground"
          />
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius)] bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm disabled:opacity-60 sm:w-auto"
      >
        {isLoading ? 'Comparing…' : 'Compare with baseline'}
      </button>
    </form>
  );
}
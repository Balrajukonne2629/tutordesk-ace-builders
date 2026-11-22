'use client';

import { useCallback, useEffect, useState } from 'react';
import { getDashboard } from '@/lib/api';

type Tone = 'default' | 'danger' | 'success';

interface StatCardModel {
  key: string;
  label: string;
  value: number;
  tone: Tone;
  hint: string;
}

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function toAmount(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function readField(raw: unknown, key: string): unknown {
  if (raw && typeof raw === 'object' && key in raw) {
    return (raw as Record<string, unknown>)[key];
  }
  return undefined;
}

function buildCards(raw: unknown): StatCardModel[] {
  return [
    {
      key: 'outstanding',
      label: 'Outstanding',
      value: toAmount(readField(raw, 'total_outstanding')),
      tone: 'default',
      hint: 'Owed by parents',
    },
    {
      key: 'overdue',
      label: 'Overdue',
      value: toAmount(readField(raw, 'overdue_amount')),
      tone: 'danger',
      hint: 'Past due date',
    },
    {
      key: 'collected',
      label: 'Collected this month',
      value: toAmount(readField(raw, 'collected_this_month')),
      tone: 'success',
      hint: 'Payments received',
    },
    {
      key: 'cash',
      label: 'Cash in hand',
      value: toAmount(readField(raw, 'cash_in_hand')),
      tone: 'default',
      hint: 'Opening cash plus payments, less paid bills',
    },
  ];
}

const valueToneClass: Record<Tone, string> = {
  default: 'text-foreground',
  danger: 'text-destructive',
  success: 'text-emerald-600',
};

function StatTile({ card, isLoading }: { card: StatCardModel; isLoading: boolean }) {
  return (
    <div className="min-w-0 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
      <p className="truncate text-xs font-medium text-muted-foreground">{card.label}</p>
      <p
        className={`mt-1 break-words text-xl font-bold tracking-tight sm:text-2xl ${valueToneClass[card.tone]}`}
      >
        {isLoading ? '—' : inrFormatter.format(card.value)}
      </p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{card.hint}</p>
    </div>
  );
}

export default function SummaryStatCards() {
  const [cards, setCards] = useState<StatCardModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const raw: unknown = await getDashboard();
      setCards(buildCards(raw));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load summary');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 break-words text-sm text-destructive">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="h-10 shrink-0 rounded-[var(--radius)] border border-border px-4 text-sm font-medium text-foreground"
        >
          Try again
        </button>
      </div>
    );
  }

  const placeholders: StatCardModel[] = [
    { key: 'outstanding', label: 'Outstanding', value: 0, tone: 'default', hint: '' },
    { key: 'overdue', label: 'Overdue', value: 0, tone: 'danger', hint: '' },
    { key: 'collected', label: 'Collected this month', value: 0, tone: 'success', hint: '' },
    { key: 'cash', label: 'Cash in hand', value: 0, tone: 'default', hint: '' },
  ];
  const visible = cards.length > 0 ? cards : placeholders;

  return (
    <section data-nexen-component="nx_components_SummaryStatCards"
      aria-label="Money summary"
      className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      {visible.map((card) => (
        <StatTile key={card.key} card={card} isLoading={isLoading} />
      ))}
    </section>
  );
}
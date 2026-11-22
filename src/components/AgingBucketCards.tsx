
'use client';

export type AgingBucketKey = 'not_due' | '1-7' | '8-30' | '30+';

export interface AgingBucketSummary {
  bucket: AgingBucketKey;
  balance: number | string;
  count: number | string;
}

interface AgingBucketCardsProps {
  buckets?: AgingBucketSummary[] | null;
  activeBucket?: AgingBucketKey | null;
  onSelect?: (bucket: AgingBucketKey) => void;
}

const ORDER: AgingBucketKey[] = ['not_due', '1-7', '8-30', '30+'];

const LABELS: Record<AgingBucketKey, string> = {
  not_due: 'Not due',
  '1-7': '1-7 days late',
  '8-30': '8-30 days late',
  '30+': '30+ days late',
};

function formatInr(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? '-' : '';
  const digits = String(Math.abs(rounded));
  const tail = digits.slice(-3);
  const head = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${sign}Rs ${head ? `${head},` : ''}${tail}`;
}

function toNumber(value: number | string | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export default function AgingBucketCards({
  buckets,
  activeBucket = null,
  onSelect,
}: AgingBucketCardsProps) {
  const safeBuckets = Array.isArray(buckets) ? buckets : [];

  const cards = ORDER.map((key) => {
    const found = safeBuckets.find((b) => b.bucket === key);
    return {
      key,
      balance: toNumber(found?.balance),
      count: toNumber(found?.count),
    };
  });

  return (
    <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => {
        const active = activeBucket === card.key;
        const isSevere = card.key === '30+' && card.balance > 0;
        const isLate = card.key !== 'not_due' && card.balance > 0;

        return (
          <button data-nexen-component="nx_components_AgingBucketCards"
            key={card.key}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect?.(card.key)}
            className={[
              'min-w-0 w-full rounded-[var(--radius)] border bg-card p-4 text-left shadow-sm',
              'transition-shadow hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'border-primary ring-2 ring-ring' : 'border-border',
            ].join(' ')}
          >
            <span className="block truncate text-sm text-muted-foreground">
              {LABELS[card.key]}
            </span>

            <span
              className={[
                'mt-1 block truncate text-xl font-bold',
                isSevere ? 'text-destructive' : 'text-foreground',
              ].join(' ')}
            >
              {formatInr(card.balance)}
            </span>

            <span
              className={[
                'mt-2 inline-block max-w-full truncate rounded-full px-2 py-0.5 text-xs font-medium',
                isLate
                  ? 'bg-primary/10 text-primary'
                  : 'bg-secondary text-secondary-foreground',
              ].join(' ')}
            >
              {card.count} {card.count === 1 ? 'invoice' : 'invoices'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

'use client';

export type HorizonDays = 30 | 60 | 90;

const OPTIONS: HorizonDays[] = [30, 60, 90];

interface HorizonToggleProps {
  value: HorizonDays;
  onChange: (days: HorizonDays) => void;
  disabled?: boolean;
}

export default function HorizonToggle({
  value,
  onChange,
  disabled = false,
}: HorizonToggleProps) {
  return (
    <div
      role="group"
      aria-label="Forecast horizon"
      className="inline-flex w-full max-w-xs rounded-[var(--radius)] border border-border bg-card p-1 shadow-sm sm:w-auto"
    >
      {OPTIONS.map((days) => {
        const selected = days === value;
        return (
          <button data-nexen-component="nx_components_HorizonToggle"
            key={days}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(days)}
            className={[
              'min-h-10 flex-1 rounded-[calc(var(--radius)-4px)] px-4 text-sm font-medium transition-colors sm:flex-none',
              'disabled:cursor-not-allowed disabled:opacity-50',
              selected
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {days} days
          </button>
        );
      })}
    </div>
  );
}
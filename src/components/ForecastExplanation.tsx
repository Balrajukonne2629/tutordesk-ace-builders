
export type ForecastExplanationProps = {
  explanation?: string | null;
};

const BASIS_POINTS: string[] = [
  'Starts from cash in hand: your opening cash balance, plus payments received, minus bills already marked paid.',
  'Adds each unpaid invoice on its due date plus that customer\u2019s average days late, based on their last 3 paid invoices.',
  'Partly paid invoices count only the amount still outstanding.',
  'Adds upcoming recurring monthly fees on their billing days.',
  'Subtracts unpaid bills on their due dates, including rent, internet, materials and other recurring monthly bills.',
  'Paid bills are never counted again as future outflows.',
  'If the running balance drops below zero, the chart shades that period and the shortfall banner shows the amount needed.',
];

export default function ForecastExplanation({ explanation }: ForecastExplanationProps) {
  const apiText = typeof explanation === 'string' ? explanation.trim() : '';

  return (
    <section data-nexen-component="nx_components_ForecastExplanation"
      aria-labelledby="forecast-explanation-heading"
      className="w-full min-w-0 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm sm:p-6"
    >
      <h2
        id="forecast-explanation-heading"
        className="text-base font-semibold text-foreground"
      >
        How this is calculated
      </h2>

      {apiText ? (
        <p className="mt-2 break-words text-sm text-foreground">{apiText}</p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          The forecast will be explained here once it has been calculated.
        </p>
      )}

      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
        {BASIS_POINTS.map((point) => (
          <li key={point} className="min-w-0 break-words">
            {point}
          </li>
        ))}
      </ul>
    </section>
  );
}
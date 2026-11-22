
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type LineItemDraft = { description: string; quantity: number; unitPrice: number; amount: number };
type Row = { id: string; description: string; quantity: string; unitPrice: string };
type Field = 'description' | 'quantity' | 'unitPrice';
type Errors = Partial<Record<Field, string>>;

const INITIAL: Row[] = [{ id: 'li-1', description: '', quantity: '1', unitPrice: '' }];
const inputClass =
  'h-10 w-full min-w-0 rounded-[var(--radius)] border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

function validate(r: Row): Errors {
  const e: Errors = {};
  const desc = r.description.trim();
  if (!desc) e.description = "Please describe what this line item is for, such as 'Maths tuition, November'.";
  else if (desc.length > 100) e.description = 'Description must be 100 characters or fewer.';
  const q = Number(r.quantity);
  if (!/^\d+$/.test(r.quantity.trim()) || q < 1 || q > 99)
    e.quantity = 'Quantity must be a whole number between 1 and 99.';
  if (r.unitPrice.trim() === '' || Number.isNaN(Number(r.unitPrice)))
    e.unitPrice = 'Please enter the amount in rupees for this line item.';
  else {
    const p = Number(r.unitPrice);
    if (p <= 0 || p > 100000) e.unitPrice = 'Amount must be more than Rs 0 and no more than Rs 1,00,000.';
  }
  return e;
}

function formatInr(n: number): string {
  return `Rs ${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function InvoiceLineItemsEditor({
  onChange,
  showErrors = false,
}: {
  onChange?: (items: LineItemDraft[], total: number, valid: boolean) => void;
  showErrors?: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(INITIAL);
  const [touched, setTouched] = useState<Record<string, true>>({});
  const nextId = useRef(2);
  const onChangeRef = useRef(onChange);

  const errorsById = useMemo(
    () => Object.fromEntries(rows.map((r) => [r.id, validate(r)])) as Record<string, Errors>,
    [rows],
  );

  const drafts = useMemo<LineItemDraft[]>(
    () =>
      rows.map((r) => {
        const quantity = Number(r.quantity);
        const unitPrice = Number(r.unitPrice);
        const amount =
          Number.isFinite(quantity) && Number.isFinite(unitPrice) ? Math.round(quantity * unitPrice * 100) / 100 : 0;
        return { description: r.description.trim(), quantity, unitPrice, amount };
      }),
    [rows],
  );

  const total = useMemo(
    () => Math.round(drafts.reduce((sum, d) => sum + d.amount, 0) * 100) / 100,
    [drafts],
  );

  const valid = rows.length > 0 && rows.every((r) => Object.keys(errorsById[r.id]).length === 0);

  useEffect(() => {
    onChangeRef.current = onChange;
    onChangeRef.current?.(drafts, total, valid);
  }, [drafts, total, valid, onChange]);

  const patch = (id: string, field: Field, value: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const touch = (id: string, field: Field) => setTouched((t) => ({ ...t, [`${id}:${field}`]: true }));

  const errorFor = (id: string, field: Field) =>
    showErrors || touched[`${id}:${field}`] ? errorsById[id]?.[field] : undefined;

  const add = () => {
    const id = `li-${nextId.current++}`;
    setRows((rs) => [...rs, { id, description: '', quantity: '1', unitPrice: '' }]);
  };

  const remove = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-foreground">Line items</h3>
        <button
          type="button"
          onClick={add}
          className="inline-flex h-10 items-center rounded-[var(--radius)] border border-border px-3 text-sm font-medium text-foreground"
        >
          + Add line item
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">No line items yet. Add one to start the invoice.</p>
          {showErrors && (
            <p className="mt-2 text-xs text-destructive">Add at least one line item before saving the invoice.</p>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r, i) => {
            const descError = errorFor(r.id, 'description');
            const qtyError = errorFor(r.id, 'quantity');
            const priceError = errorFor(r.id, 'unitPrice');
            return (
              <li data-nexen-component="nx_components_InvoiceLineItemsEditor" key={r.id} className="rounded-[var(--radius)] border border-border bg-card p-3 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <label htmlFor={`${r.id}-description`} className="block text-xs text-muted-foreground">
                      Description
                    </label>
                    <input
                      id={`${r.id}-description`}
                      value={r.description}
                      onChange={(e) => patch(r.id, 'description', e.target.value)}
                      onBlur={() => touch(r.id, 'description')}
                      className={inputClass}
                    />
                    {descError && <p className="mt-1 text-xs text-destructive">{descError}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:flex sm:items-start">
                    <div className="w-full sm:w-20">
                      <label htmlFor={`${r.id}-quantity`} className="block text-xs text-muted-foreground">
                        Qty
                      </label>
                      <input
                        id={`${r.id}-quantity`}
                        inputMode="numeric"
                        value={r.quantity}
                        onChange={(e) => patch(r.id, 'quantity', e.target.value)}
                        onBlur={() => touch(r.id, 'quantity')}
                        className={inputClass}
                      />
                      {qtyError && <p className="mt-1 text-xs text-destructive">{qtyError}</p>}
                    </div>

                    <div className="w-full sm:w-32">
                      <label htmlFor={`${r.id}-unit-price`} className="block text-xs text-muted-foreground">
                        Unit price (Rs)
                      </label>
                      <input
                        id={`${r.id}-unit-price`}
                        inputMode="decimal"
                        value={r.unitPrice}
                        onChange={(e) => patch(r.id, 'unitPrice', e.target.value)}
                        onBlur={() => touch(r.id, 'unitPrice')}
                        className={inputClass}
                      />
                      {priceError && <p className="mt-1 text-xs text-destructive">{priceError}</p>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:h-10 sm:justify-end">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Amount</p>
                      <p className="text-sm font-medium tabular-nums text-foreground">{formatInr(drafts[i].amount)}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove line item ${i + 1}`}
                      onClick={() => remove(r.id)}
                      className="h-10 px-3 text-sm text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-card p-3">
        <span className="text-sm text-muted-foreground">Line items total</span>
        <span className="text-lg font-semibold tabular-nums text-foreground">{formatInr(total)}</span>
      </div>
    </section>
  );
}
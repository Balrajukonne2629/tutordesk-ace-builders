'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError, createInvoice, getCustomers } from '@/lib/api';
import type { Customer } from '@/types/customer';
import CustomerPicker from '@/components/CustomerPicker';
import InrAmount from '@/components/InrAmount';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type LineDraft = { description: string; quantity: string; unitPrice: string };

const BLANK_LINE: LineDraft = { description: '', quantity: '1', unitPrice: '' };

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nextBillingDate(billingDay: number, today: Date): string {
  const candidate = new Date(today.getFullYear(), today.getMonth(), billingDay);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (candidate < startOfToday) candidate.setMonth(candidate.getMonth() + 1);
  return toIsoDate(candidate);
}

function lineAmount(line: LineDraft): number {
  const qty = Number(line.quantity);
  const price = Number(line.unitPrice);
  if (!Number.isFinite(qty) || !Number.isFinite(price)) return 0;
  return qty * price;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customerId, setCustomerId] = useState('');
  const [todayStr, setTodayStr] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([{ ...BLANK_LINE }]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const today = new Date();
    setTodayStr(toIsoDate(today));
    getCustomers()
      .then((rows) => setCustomers(Array.isArray(rows) ? rows : []))
      .catch(() => setSaveError('Could not load customers. Refresh the page to try again.'))
      .finally(() => setCustomersLoading(false));
  }, []);

  function handleCustomerChange(id: string) {
    setCustomerId(id);
    const chosen = customers.find((c) => c.id === id);
    if (!chosen) return;
    const today = new Date();
    setDueDate(nextBillingDate(Number(chosen.billingDay), today));
    const untouched = lines.length === 1 && lines[0].description === '' && lines[0].unitPrice === '';
    if (untouched) {
      setLines([
        {
          description: `${chosen.subject} tuition`,
          quantity: '1',
          unitPrice: String(Number(chosen.monthlyFee)),
        },
      ]);
    }
  }

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!customerId) errors.customer = 'Please select a customer for this invoice.';
    if (!dueDate) errors.dueDate = 'Please enter a due date.';
    else if (todayStr && dueDate < todayStr)
      errors.dueDate = 'Due date cannot be in the past. Pick today or a later date.';

    const realLines = lines.filter((l) => l.description.trim() !== '' || l.unitPrice !== '');
    if (realLines.length === 0) {
      errors.lines = 'Add at least one line item before saving the invoice.';
    }
    for (const l of realLines) {
      const desc = l.description.trim();
      const qty = Number(l.quantity);
      const price = Number(l.unitPrice);
      if (desc === '') {
        errors.lines = "Please describe what this line item is for, such as 'Maths tuition, November'.";
        break;
      }
      if (desc.length > 100) {
        errors.lines = 'Description must be 100 characters or fewer.';
        break;
      }
      if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
        errors.lines = 'Quantity must be a whole number between 1 and 99.';
        break;
      }
      if (l.unitPrice === '' || !Number.isFinite(price)) {
        errors.lines = 'Please enter the amount in rupees for this line item.';
        break;
      }
      if (price <= 0 || price > 100000) {
        errors.lines = 'Amount must be more than Rs 0 and no more than Rs 1,00,000.';
        break;
      }
    }
    return errors;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaveError('');
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const lineItems = lines
      .filter((l) => l.description.trim() !== '' || l.unitPrice !== '')
      .map((l) => ({
        description: l.description.trim(),
        quantity: Number(l.quantity),
        unit_price: Number(l.unitPrice),
      }));

    const payload = {
      customer_id: customerId,
      issued_date: todayStr,
      due_date: dueDate,
      line_items: lineItems,
    } as unknown as Parameters<typeof createInvoice>[0];

    setIsSaving(true);
    try {
      const invoice = await createInvoice(payload);
      router.push(`/invoices/${invoice.id}`);
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : 'Could not save the invoice. Your entries are still here.'
      );
      setIsSaving(false);
    }
  }

  const total = lines.reduce((sum, l) => sum + lineAmount(l), 0);

  return (
    <div data-nexen-component="nx_app_invoices_new_page" className="mx-auto w-full max-w-xl min-w-0 space-y-6 p-4 font-sans">
      <PageHeader
        title="New invoice"
        subtitle="Create one invoice for a customer"
        eyebrow="Invoices"
        count={0}
        countLabel=""
        backHref="/invoices"
        backLabel="Invoices"
        actions={null}
      />

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {saveError && (
          <div role="alert" className="rounded-[var(--radius)] border border-destructive p-3 text-sm text-destructive">
            {saveError}
          </div>
        )}

        <section className="space-y-2 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
          <CustomerPicker
            value={customerId}
            onChange={handleCustomerChange}
            error={fieldErrors.customer ?? ''}
          />
        </section>

        <section className="space-y-2 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
          <label className="text-sm font-medium text-foreground">Invoice number</label>
          <div className="w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            Assigned automatically when you save
          </div>
        </section>

        <section className="space-y-3 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">Line items</h2>
          {lines.map((line, index) => (
            <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <Input
                  aria-label="Description"
                  placeholder="Description"
                  value={line.description}
                  maxLength={100}
                  onChange={(e) => updateLine(index, { description: e.target.value })}
                  className="w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  aria-label="Qty"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={99}
                  value={line.quantity}
                  onChange={(e) => updateLine(index, { quantity: e.target.value })}
                  className="w-20"
                />
                <Input
                  aria-label="Unit price in rupees"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  placeholder="Rs"
                  value={line.unitPrice}
                  onChange={(e) => updateLine(index, { unitPrice: e.target.value })}
                  className="w-28"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => removeLine(index)}
                  disabled={lines.length <= 1}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
          {fieldErrors.lines && <p className="text-sm text-destructive">{fieldErrors.lines}</p>}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setLines((p) => [...p, { ...BLANK_LINE }])}>
              Add line item
            </Button>
            <p className="text-sm text-muted-foreground">
              Line items total: <InrAmount value={total} decimals={2} className="font-semibold text-foreground" />
            </p>
          </div>
        </section>

        <section className="space-y-2 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
          <label htmlFor="due-date" className="text-sm font-medium text-foreground">
            Due date
          </label>
          <Input
            id="due-date"
            type="date"
            min={todayStr || undefined}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full"
          />
          {fieldErrors.dueDate && <p className="text-sm text-destructive">{fieldErrors.dueDate}</p>}
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Link href="/invoices" className="text-center text-sm text-muted-foreground underline sm:mr-2">
            Cancel
          </Link>
          <Button type="submit" disabled={isSaving || customersLoading} className="w-full sm:w-auto">
            {isSaving ? 'Saving…' : 'Save invoice'}
          </Button>
        </div>
      </form>
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BatchPreviewTable from '@/components/BatchPreviewTable';
import InrAmount from '@/components/InrAmount';
import PageState from '@/components/PageState';
import { ApiError, createInvoiceBatche, getInvoiceBatchePreview } from '@/lib/api';

type Preview = Awaited<ReturnType<typeof getInvoiceBatchePreview>>;

function currentMonth(): string {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}`;
}

function messageOf(e: unknown, fallback: string): string {
  return e instanceof ApiError ? e.message : fallback;
}

export default function GenerateInvoicesPage() {
  const router = useRouter();
  const [month, setMonth] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setMonth(currentMonth());
  }, []);

  useEffect(() => {
    if (!month || month > currentMonth()) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getInvoiceBatchePreview({ billing_month: month })
      .then((p) => { if (!cancelled) setPreview(p); })
      .catch((e) => {
        if (!cancelled) {
          setPreview(null);
          setError(messageOf(e, 'Could not build the preview. Please try again.'));
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [month, attempt]);

  const validationError = !month
    ? 'Please choose the month to bill before generating invoices.'
    : month > currentMonth()
      ? "You can't bill a future month yet. Choose this month or an earlier one."
      : null;

  const proposed = preview?.proposed ?? [];
  const canConfirm = !!preview && proposed.length > 0 && !validationError && !loading && !saving;

  async function confirm() {
    if (!preview || !canConfirm) return;
    setSaving(true);
    setError(null);
    setResult(null);
    try {
      const res = await createInvoiceBatche({
        billing_month: month,
        customer_ids: proposed.map((p) => p.customer_id),
      });
      setResult(`${res.created.length} draft invoice(s) created.`);
      setAttempt((a) => a + 1);
    } catch (e) {
      setError(messageOf(e, 'Could not create the invoices. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div data-nexen-component="nx_app_generate_invoices_page" className="mx-auto w-full max-w-3xl min-w-0 space-y-4 p-4">
      <header>
        <h1 className="text-2xl font-bold">Generate invoices</h1>
        <p className="text-sm text-muted-foreground">
          Invoices are created for all customers for the chosen month.
        </p>
      </header>

      <section className="rounded-[var(--radius)] border bg-card p-4 shadow-sm space-y-3">
        <label className="block text-sm font-medium" htmlFor="billing-month">
          Billing month
        </label>
        <input
          id="billing-month"
          type="month"
          value={month}
          max={currentMonth()}
          onChange={(e) => { setMonth(e.target.value); setResult(null); }}
          className="h-12 w-full max-w-xs rounded-[var(--radius)] border bg-background px-3 text-base"
        />
        {validationError && (
          <p role="alert" className="text-sm text-[var(--destructive,#E5484D)]">{validationError}</p>
        )}
      </section>

      {preview && !loading && (
        <section className="rounded-[var(--radius)] border bg-card p-4 shadow-sm flex flex-wrap gap-6">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Invoices to create</p>
            <p className="text-xl font-bold">{proposed.length}</p>
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Total amount</p>
            <InrAmount value={preview.total_amount} decimals={0} className="text-xl font-bold" />
          </div>
        </section>
      )}

      {error && (
        <PageState
          state="error"
          title="Something went wrong"
          message={error}
          actionLabel="Try again"
          onAction={() => setAttempt((a) => a + 1)}
          rows={1}
          icon={null}
        />
      )}

      {result && (
        <p role="status" className="text-sm font-medium text-[var(--success,#2F9E6B)]">{result}</p>
      )}

      <section className="overflow-x-auto">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Building preview…</p>
        ) : (
          <BatchPreviewTable />
        )}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="h-12 rounded-[var(--radius)] border px-6 text-sm font-medium"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={!canConfirm}
          className="h-12 rounded-[var(--radius)] bg-primary px-6 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Confirm and create invoices'}
        </button>
      </div>
    </div>
  );
}
'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { getPaymentById, updatePayment } from '@/lib/api';
import InrAmount from '@/components/InrAmount';
import PageState from '@/components/PageState';

type PaymentDetail = Awaited<ReturnType<typeof getPaymentById>>;
type Method = 'upi' | 'cash' | 'bank';

const METHODS: Method[] = ['upi', 'cash', 'bank'];
const METHOD_LABEL: Record<Method, string> = { upi: 'UPI', cash: 'Cash', bank: 'Bank' };

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(value));
}

function todayIst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

export default function PaymentDetailPage({ params }: { params: { id: string } }) {
  const paymentId = params.id;
  const [detail, setDetail] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [receivedOn, setReceivedOn] = useState('');
  const [method, setMethod] = useState<Method>('upi');
  const [reference, setReference] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const fillForm = (d: PaymentDetail) => {
    setAmount(String(Number(d.payment.amount)));
    setReceivedOn(String(d.payment.receivedOn).slice(0, 10));
    setMethod(d.payment.method as Method);
    setReference(d.payment.reference ?? '');
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const d = await getPaymentById(paymentId);
      setDetail(d);
      fillForm(d);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load this payment.');
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    load();
  }, [load]);

  const validate = (d: PaymentDetail): string | null => {
    const maxAllowed = Number(d.invoice.outstanding_amount) + Number(d.payment.amount);
    const amountNum = Number(amount);
    if (amount.trim() === '' || Number.isNaN(amountNum)) return 'Enter the amount received.';
    if (amountNum <= 0 || amountNum > maxAllowed) {
      return `Amount must be more than Rs 0 and no more than the Rs ${maxAllowed.toFixed(2)} still due on this invoice.`;
    }
    if (!receivedOn) return 'Enter the date the payment was received.';
    if (receivedOn > todayIst()) return 'The payment date cannot be later than today.';
    if (!METHODS.includes(method)) return 'Choose how the money was received: UPI, cash or bank.';
    if (reference.trim().length >= 60) return 'Keep the reference or note under 60 characters.';
    return null;
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!detail) return;
    const error = validate(detail);
    setFormError(error);
    setSaved(false);
    if (error) return;

    setSaving(true);
    setSaveError(null);
    try {
      await updatePayment(paymentId, {
        amount: Number(amount),
        receivedOn,
        method,
        reference: reference.trim() === '' ? null : reference.trim(),
      });
      const fresh = await getPaymentById(paymentId);
      setDetail(fresh);
      fillForm(fresh);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save the payment.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <PageState state="loading" title="Loading payment" message="" actionLabel="Try again" onAction={load} rows={3} icon={null} />;
  }
  if (loadError || !detail) {
    return <PageState state="error" title="Payment not available" message={loadError ?? 'This payment could not be found.'} actionLabel="Try again" onAction={load} rows={3} icon={null} />;
  }

  const { payment, invoice, customer_name: customerName } = detail;

  return (
    <main data-nexen-component="nx_app_payments__id__page" className="mx-auto w-full max-w-2xl min-w-0 space-y-6 bg-background p-4 text-foreground">
      <Link href="/payments" className="inline-flex h-11 items-center text-sm text-muted-foreground">
        ← Back to payments
      </Link>

      <section className="min-w-0 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
        <p className="text-sm text-muted-foreground">{customerName}</p>
        <InrAmount value={Number(payment.amount)} decimals={2} className="block text-3xl font-semibold" />
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="min-w-0">
            <dt className="text-muted-foreground">Date received</dt>
            <dd className="font-medium">{formatDate(String(payment.receivedOn))}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">Method</dt>
            <dd className="font-medium">{METHOD_LABEL[payment.method as Method] ?? payment.method}</dd>
          </div>
          <div className="col-span-2 min-w-0 break-words">
            <dt className="text-muted-foreground">Reference or note</dt>
            <dd className="font-medium">{payment.reference || 'None'}</dd>
          </div>
        </dl>
      </section>

      <section className="min-w-0 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
        <h2 className="text-base font-semibold">Applied to this invoice</h2>
        <Link href={`/invoices/${invoice.id}`} className="mt-2 flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius)] border border-border p-3">
          <span className="min-w-0 truncate font-mono text-sm">{invoice.invoice_number}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{invoice.status}</span>
        </Link>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="min-w-0">
            <dt className="text-muted-foreground">Invoice total</dt>
            <dd><InrAmount value={Number(invoice.total_amount)} decimals={2} className="font-medium" /></dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">Still outstanding</dt>
            <dd><InrAmount value={Number(invoice.outstanding_amount)} decimals={2} className="font-medium" /></dd>
          </div>
        </dl>
      </section>

      <form onSubmit={onSubmit} className="min-w-0 space-y-4 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
        <h2 className="text-base font-semibold">Correct this payment</h2>

        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Amount (Rs)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-11 w-full min-w-0 rounded-[var(--radius)] border border-border bg-background px-3"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Date received</span>
          <input
            type="date"
            value={receivedOn}
            max={todayIst()}
            onChange={(e) => setReceivedOn(e.target.value)}
            className="h-11 w-full min-w-0 rounded-[var(--radius)] border border-border bg-background px-3"
          />
        </label>

        <div className="space-y-1 text-sm">
          <span className="text-muted-foreground">Method</span>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={method === m}
                onClick={() => setMethod(m)}
                className={`h-11 rounded-[var(--radius)] border text-sm font-medium ${
                  method === m ? 'bg-primary text-primary-foreground' : 'border-border bg-background'
                }`}
              >
                {METHOD_LABEL[m]}
              </button>
            ))}
          </div>
        </div>

        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Reference or note</span>
          <input
            type="text"
            maxLength={120}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="h-11 w-full min-w-0 rounded-[var(--radius)] border border-border bg-background px-3"
          />
        </label>

        {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
        {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
        {saved && <p role="status" className="text-sm text-muted-foreground">Payment updated.</p>}

        <button
          type="submit"
          disabled={saving}
          className="h-11 w-full rounded-[var(--radius)] bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </main>
  );
}
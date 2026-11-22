'use client';

import { useState, type ComponentProps } from 'react';
import QuickLogDraftReview from '@/components/QuickLogDraftReview';
import InrAmount from '@/components/InrAmount';
import { createQuickLogParse, createQuickLogConfirm, getInvoices } from '@/lib/api';

type ReviewProps = ComponentProps<typeof QuickLogDraftReview>;
type QuickLogDraftValues = ReviewProps['initial'];
type QuickLogCandidate = ReviewProps['customers'][number];
type QuickLogInvoiceOption = ReviewProps['invoices'][number];

const MAX_TEXT_LENGTH = 500;
const OPEN_STATUSES: string[] = ['sent', 'partial', 'overdue'];

function isMethod(value: string): value is 'upi' | 'cash' | 'bank' {
  return value === 'upi' || value === 'cash' || value === 'bank';
}

function todayIst(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function formatRupees(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export default function QuickLogPage() {
  const [text, setText] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<QuickLogDraftValues | null>(null);
  const [parsedAmount, setParsedAmount] = useState<number | null>(null);
  const [customers, setCustomers] = useState<QuickLogCandidate[]>([]);
  const [invoices, setInvoices] = useState<QuickLogInvoiceOption[]>([]);
  const [today, setToday] = useState('');
  const [reviewKey, setReviewKey] = useState(0);

  async function handleParse() {
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Paste a payment message first, for example 'Received Rs 2500 from Ramesh Kumar on 20 Nov via UPI'.");
      return;
    }
    if (trimmed.length > MAX_TEXT_LENGTH) {
      setError('This message is too long. Paste only the payment part of the message (up to 500 characters).');
      return;
    }
    setError(null);
    setSaved(null);
    setIsParsing(true);
    try {
      const result = await createQuickLogParse({ text: trimmed });
      const candidates: QuickLogCandidate[] = (result.candidates ?? []).map((c) => ({
        customerId: c.customer_id,
        customerName: c.customer_name,
        score: c.score,
      }));
      const rows = await Promise.all(
        candidates.map((c) => getInvoices({ customer_id: c.customerId })),
      );
      const openInvoices = rows
        .flat()
        .filter((r) => OPEN_STATUSES.includes(r.status))
        .map((r) => ({
          id: r.id,
          invoiceNumber: r.invoice_number,
          customerId: r.customer_id,
          outstandingAmount: Number(r.outstanding_amount),
          dueDate: r.due_date,
        }));
      const uniqueInvoices = Array.from(new Map(openInvoices.map((i) => [i.id, i])).values())
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

      const todayValue = todayIst();
      setToday(todayValue);
      setPastedText(trimmed);
      setParsedAmount(result.amount ?? null);
      setCustomers(candidates);
      setInvoices(uniqueInvoices);
      setDraft({
        payerName: result.payer_name ?? '',
        receivedOn: result.received_on ?? todayValue,
        method: result.method ?? 'upi',
        customerId: result.matched_customer_id ?? candidates[0]?.customerId ?? '',
        invoiceId: result.target_invoice?.id ?? '',
      });
      setReviewKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read this message. Try again.');
    } finally {
      setIsParsing(false);
    }
  }

  async function handleConfirm(values: QuickLogDraftValues, value: number) {
    setError(null);
    setSaved(null);
    const name = values.payerName.trim();
    if (name.length < 2 || name.length > 60) {
      setError("Enter the payer's name (2 to 60 characters).");
      return;
    }
    if (!values.customerId) {
      setError('Select which customer this payment is from.');
      return;
    }
    const invoice = invoices.find((i) => i.id === values.invoiceId);
    if (!invoice) {
      setError('Pick which invoice this payment is for. No open invoice was found for this customer.');
      return;
    }
    if (!isMethod(values.method)) {
      setError('Choose how the money was received: UPI, cash or bank.');
      return;
    }
    const todayValue = today || todayIst();
    if (!values.receivedOn || values.receivedOn > todayValue) {
      setError('Payment date cannot be in the future. Pick today or an earlier date.');
      return;
    }
    if (!(value > 0) || value > invoice.outstandingAmount) {
      setError(
        `Amount must be between Rs 1 and the Rs ${formatRupees(invoice.outstandingAmount)} still due on this invoice.`,
      );
      return;
    }

    setIsSaving(true);
    try {
      await createQuickLogConfirm({
        customer_id: values.customerId,
        invoice_id: values.invoiceId,
        amount: value,
        received_on: values.receivedOn,
        method: values.method,
        pasted_text: pastedText,
      });
      setSaved(`Saved Rs ${formatRupees(value)} from ${name} against ${invoice.invoiceNumber}.`);
      setDraft(null);
      setText('');
      setPastedText('');
      setCustomers([]);
      setInvoices([]);
      setParsedAmount(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this payment. Try again.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setDraft(null);
    setError(null);
    setCustomers([]);
    setInvoices([]);
    setParsedAmount(null);
  }

  return (
    <main data-nexen-component="nx_app_quick_log_page" className="mx-auto w-full max-w-xl min-w-0 space-y-4 bg-background p-4 text-foreground">
      <header className="min-w-0 space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Payments</p>
        <h1 className="text-xl font-semibold">Quick log</h1>
        <p className="text-sm text-muted-foreground">
          Paste a UPI, SMS or WhatsApp payment message. Check the details, then confirm.
        </p>
      </header>

      <section className="min-w-0 space-y-3 rounded-[var(--radius)] border bg-card p-4 shadow-sm">
        <label htmlFor="quick-log-text" className="text-sm font-medium">
          Payment message
        </label>
        <textarea
          id="quick-log-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Received Rs 2500 from Ramesh Kumar on 20 Nov via UPI"
          className="w-full min-w-0 rounded-[var(--radius)] border bg-background p-3 text-base"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Up to {MAX_TEXT_LENGTH} characters</span>
          <span>
            {text.length}/{MAX_TEXT_LENGTH}
          </span>
        </div>
        <button
          type="button"
          onClick={handleParse}
          disabled={isParsing || isSaving}
          className="h-12 w-full rounded-[var(--radius)] bg-primary text-base font-medium text-primary-foreground disabled:opacity-50"
        >
          {isParsing ? 'Reading message…' : 'Read payment'}
        </button>
      </section>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm text-foreground">
          {saved}
        </p>
      )}

      {draft && (
        <section className="min-w-0 space-y-3 rounded-[var(--radius)] border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">Parsed amount</span>
            {parsedAmount === null ? (
              <span className="text-sm text-muted-foreground">Not found in message</span>
            ) : (
              <InrAmount value={parsedAmount} decimals={0} className="text-2xl font-semibold" />
            )}
          </div>
          <QuickLogDraftReview
            key={reviewKey}
            initial={draft}
            customers={customers}
            invoices={invoices}
            today={today}
            isSaving={isSaving}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        </section>
      )}
    </main>
  );
}
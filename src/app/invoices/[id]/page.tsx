
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createInvoiceLineItem,
  createInvoiceSend,
  deleteInvoice,
  deleteInvoiceLineItem,
  getInvoiceById,
  getInvoicePrint,
  updateInvoice,
  updateInvoiceLineItem,
} from '@/lib/api';
import CustomerPicker from '@/components/CustomerPicker';
import InrAmount from '@/components/InrAmount';
import PaymentForm from '@/components/PaymentForm';
import UpiQrCode from '@/components/UpiQrCode';

type InvoiceDetail = Awaited<ReturnType<typeof getInvoiceById>>;
type PrintView = Awaited<ReturnType<typeof getInvoicePrint>>;

const MAX_UNIT_PRICE = 100000;

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  partial: 'Partial',
  paid: 'Paid',
  overdue: 'Overdue',
};

const STATUS_CLASS: Record<string, string> = {
  draft: 'bg-secondary text-secondary-foreground',
  sent: 'bg-accent text-accent-foreground',
  partial: 'bg-accent text-accent-foreground',
  paid: 'bg-primary text-primary-foreground',
  overdue: 'bg-destructive text-destructive-foreground',
};

const inputCls =
  'h-10 w-full min-w-0 rounded-[var(--radius)] border bg-background px-3 text-sm text-foreground';
const primaryBtn =
  'inline-flex h-11 items-center justify-center rounded-[var(--radius)] bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm disabled:opacity-50';
const outlineBtn =
  'inline-flex h-11 items-center justify-center rounded-[var(--radius)] border bg-card px-4 text-sm font-medium text-foreground disabled:opacity-50';
const cardCls = 'rounded-[var(--radius)] border bg-card p-4 shadow-sm min-w-0';

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong. Please try again.';
}

function todayIso(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(String(value)).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

function validateLine(description: string, quantity: string, unitPrice: string): string | null {
  const desc = description.trim();
  if (!desc) return "Please describe what this line item is for, such as 'Maths tuition, November'.";
  if (desc.length > 100) return 'Description must be 100 characters or fewer.';
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1 || qty > 99) return 'Quantity must be a whole number between 1 and 99.';
  if (unitPrice.trim() === '' || Number.isNaN(Number(unitPrice))) {
    return 'Please enter the amount in rupees for this line item.';
  }
  const price = Number(unitPrice);
  if (price <= 0 || price > MAX_UNIT_PRICE) return 'Amount must be more than Rs 0 and no more than Rs 1,00,000.';
  return null;
}

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const invoiceId = params.id;
  const router = useRouter();

  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [printView, setPrintView] = useState<PrintView | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [dueDraft, setDueDraft] = useState('');
  const [customerDraft, setCustomerDraft] = useState('');
  const [customerError, setCustomerError] = useState('');
  const [dueError, setDueError] = useState('');

  const [newLine, setNewLine] = useState({ description: '', quantity: '1', unitPrice: '' });
  const [lineError, setLineError] = useState('');
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editLine, setEditLine] = useState({ description: '', quantity: '1', unitPrice: '' });
  const [editLineError, setEditLineError] = useState('');

  const [showPayment, setShowPayment] = useState(false);

  const loadAll = useCallback(async () => {
    setLoadError(null);
    try {
      const [inv, print] = await Promise.all([getInvoiceById(invoiceId), getInvoicePrint(invoiceId)]);
      setDetail(inv);
      setPrintView(print);
      setDueDraft(String(inv.invoice.dueDate).slice(0, 10));
      setCustomerDraft(inv.invoice.customerId);
    } catch (e) {
      setLoadError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function run(fn: () => Promise<unknown>, success: string): Promise<boolean> {
    setBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      await fn();
      setActionMessage(success);
      await loadAll();
      return true;
    } catch (e) {
      setActionError(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const invoice = detail?.invoice;
  const status = invoice?.status ?? '';
  const isDraft = status === 'draft';
  const outstanding = detail?.outstandingAmount ?? 0;
  const lineItems = Array.isArray(detail?.lineItems) ? detail.lineItems : [];
  const payments = Array.isArray(detail?.payments) ? detail.payments : [];
  const canRecordPayment = !isDraft && outstanding > 0;

  function saveDetails() {
    setDueError('');
    setCustomerError('');
    if (!customerDraft) {
      setCustomerError('Please select a customer for this invoice.');
      return;
    }
    if (!dueDraft) {
      setDueError('Please enter a due date.');
      return;
    }
    if (dueDraft < todayIso()) {
      setDueError('Due date cannot be in the past. Pick today or a later date.');
      return;
    }
    void run(
      () => updateInvoice(invoiceId, { dueDate: dueDraft, customerId: customerDraft }),
      'Invoice details saved.',
    );
  }

  async function addLine() {
    setLineError('');
    const err = validateLine(newLine.description, newLine.quantity, newLine.unitPrice);
    if (err) {
      setLineError(err);
      return;
    }
    const ok = await run(
      () =>
        createInvoiceLineItem(invoiceId, {
          description: newLine.description.trim(),
          quantity: Number(newLine.quantity),
          unit_price: Number(newLine.unitPrice),
        }),
      'Line item added.',
    );
    if (ok) setNewLine({ description: '', quantity: '1', unitPrice: '' });
  }

  function startEdit(item: InvoiceDetail['lineItems'][number]) {
    setEditingLineId(item.id);
    setEditLine({
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice),
    });
    setEditLineError('');
  }

  async function saveEdit(lineId: string) {
    setEditLineError('');
    const err = validateLine(editLine.description, editLine.quantity, editLine.unitPrice);
    if (err) {
      setEditLineError(err);
      return;
    }
    const ok = await run(
      () =>
        updateInvoiceLineItem(invoiceId, lineId, {
          description: editLine.description.trim(),
          quantity: Number(editLine.quantity),
          unitPrice: Number(editLine.unitPrice),
        }),
      'Line item saved.',
    );
    if (ok) setEditingLineId(null);
  }

  function removeLine(lineId: string) {
    if (!window.confirm('Remove this line item from the invoice?')) return;
    void run(() => deleteInvoiceLineItem(invoiceId, lineId), 'Line item removed.');
  }

  function markSent() {
    if (lineItems.length === 0) {
      setActionError('Add at least one line item before saving the invoice.');
      return;
    }
    void run(() => createInvoiceSend(invoiceId, {}), 'Invoice marked as sent. Share it with the parent.');
  }

  async function removeInvoice() {
    if (payments.length > 0) {
      setActionError('This invoice has payments, so it cannot be deleted.');
      return;
    }
    if (!window.confirm('Delete this draft invoice? This cannot be undone.')) return;
    setBusy(true);
    try {
      await deleteInvoice(invoiceId);
      router.push('/invoices');
    } catch (e) {
      setActionError(errorMessage(e));
      setBusy(false);
    }
  }

  async function copyPaymentLink() {
    if (!printView?.upiQrPayload) return;
    try {
      await navigator.clipboard.writeText(printView.upiQrPayload);
      setActionMessage('Payment link copied.');
    } catch {
      setActionError('Could not copy. Long-press the QR code instead.');
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-3xl p-4 text-sm text-muted-foreground">Loading invoice…</main>;
  }

  if (loadError || !detail || !invoice) {
    return (
      <main className="mx-auto max-w-3xl space-y-3 p-4">
        <div className={cardCls}>
          <p className="text-sm text-destructive">{loadError ?? 'Invoice not found.'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={primaryBtn} onClick={() => void loadAll()}>
              Try again
            </button>
            <Link href="/invoices" className={outlineBtn}>
              Back to invoices
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main data-nexen-component="nx_app_invoices__id__page" className="mx-auto w-full max-w-3xl space-y-4 bg-background p-4 text-foreground">
      <div className="print:hidden">
        <Link href="/invoices" className="text-sm text-muted-foreground">
          ← Invoices
        </Link>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold">Invoice {invoice.invoiceNumber}</h1>
            <p className="truncate text-sm text-muted-foreground">{detail.customerName}</p>
          </div>
          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASS[status] ?? ''}`}
          >
            {STATUS_LABEL[status] ?? status}
          </span>
        </div>
      </div>

      {actionError && (
        <p role="alert" className="print:hidden rounded-[var(--radius)] border border-destructive p-3 text-sm text-destructive">
          {actionError}
        </p>
      )}
      {actionMessage && (
        <p role="status" className="print:hidden rounded-[var(--radius)] border p-3 text-sm text-foreground">
          {actionMessage}
        </p>
      )}

      <section className={`${cardCls} print:hidden grid grid-cols-1 gap-3 sm:grid-cols-3`}>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Total</p>
          <InrAmount value={invoice.totalAmount} decimals={0} className="text-lg font-semibold" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <InrAmount value={outstanding} decimals={0} className="text-lg font-semibold" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Due date</p>
          <p className="text-lg font-semibold">{formatDate(invoice.dueDate)}</p>
        </div>
      </section>

      {!isDraft && (
        <p className="print:hidden text-sm text-muted-foreground">
          This invoice is {STATUS_LABEL[status] ?? status}, so its line items, due date and customer can no longer be changed.
        </p>
      )}

      <section className={`${cardCls} print:hidden space-y-3`}>
        <h2 className="text-base font-semibold">Line items</h2>
        {lineItems.length === 0 && <p className="text-sm text-muted-foreground">No line items yet.</p>}
        <ul className="space-y-3">
          {lineItems.map((item) => (
            <li key={item.id} className="min-w-0 rounded-[var(--radius)] border p-3">
              {isDraft && editingLineId === item.id ? (
                <div className="space-y-2">
                  <input
                    aria-label="Description"
                    className={inputCls}
                    value={editLine.description}
                    onChange={(e) => setEditLine({ ...editLine, description: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      aria-label="Qty"
                      inputMode="numeric"
                      className={inputCls}
                      value={editLine.quantity}
                      onChange={(e) => setEditLine({ ...editLine, quantity: e.target.value })}
                    />
                    <input
                      aria-label="Unit price in rupees"
                      inputMode="decimal"
                      className={inputCls}
                      value={editLine.unitPrice}
                      onChange={(e) => setEditLine({ ...editLine, unitPrice: e.target.value })}
                    />
                  </div>
                  {editLineError && <p className="text-sm text-destructive">{editLineError}</p>}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button type="button" className={primaryBtn} disabled={busy} onClick={() => void saveEdit(item.id)}>
                      Save line
                    </button>
                    <button type="button" className={outlineBtn} onClick={() => setEditingLineId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × <InrAmount value={item.unitPrice} decimals={0} className="inline" />
                    </p>
                  </div>
                  <InrAmount value={item.amount} decimals={0} className="text-sm font-semibold" />
                  {isDraft && (
                    <div className="flex gap-2">
                      <button type="button" className={outlineBtn} disabled={busy} onClick={() => startEdit(item)}>
                        Edit
                      </button>
                      <button type="button" className={outlineBtn} disabled={busy} onClick={() => removeLine(item.id)}>
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>

        {isDraft && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-sm font-medium">Add a line item</p>
            <input
              aria-label="Description"
              placeholder="Maths tuition, November"
              className={inputCls}
              value={newLine.description}
              onChange={(e) => setNewLine({ ...newLine, description: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                aria-label="Qty"
                inputMode="numeric"
                className={inputCls}
                value={newLine.quantity}
                onChange={(e) => setNewLine({ ...newLine, quantity: e.target.value })}
              />
              <input
                aria-label="Unit price in rupees"
                inputMode="decimal"
                placeholder="Rs"
                className={inputCls}
                value={newLine.unitPrice}
                onChange={(e) => setNewLine({ ...newLine, unitPrice: e.target.value })}
              />
            </div>
            {lineError && <p className="text-sm text-destructive">{lineError}</p>}
            <button type="button" className={primaryBtn} disabled={busy} onClick={() => void addLine()}>
              Add line item
            </button>
          </div>
        )}
      </section>

      <section className={`${cardCls} print:hidden space-y-3`}>
        <h2 className="text-base font-semibold">Customer and due date</h2>
        <CustomerPicker
          value={customerDraft}
          onChange={(customerId: string) => setCustomerDraft(customerId)}
          error={customerError}
        />
        <div className="space-y-1">
          <label htmlFor="due-date" className="text-sm font-medium">
            Due date
          </label>
          <input
            id="due-date"
            type="date"
            className={inputCls}
            value={dueDraft}
            disabled={!isDraft}
            onChange={(e) => setDueDraft(e.target.value)}
          />
          {dueError && <p className="text-sm text-destructive">{dueError}</p>}
        </div>
        <button type="button" className={primaryBtn} disabled={!isDraft || busy} onClick={saveDetails}>
          Save details
        </button>
      </section>

      <section className={`${cardCls} print:hidden space-y-3`}>
        <h2 className="text-base font-semibold">Actions</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button type="button" className={primaryBtn} disabled={!isDraft || busy} onClick={markSent}>
            Mark as sent
          </button>
          <button type="button" className={outlineBtn} onClick={() => window.print()}>
            Print invoice
          </button>
          <button
            type="button"
            className={outlineBtn}
            disabled={!isDraft || payments.length > 0 || busy}
            onClick={() => void removeInvoice()}
          >
            Delete draft
          </button>
        </div>
        {canRecordPayment && (
          <div className="space-y-3 border-t pt-3">
            <button type="button" className={primaryBtn} onClick={() => setShowPayment((v) => !v)}>
              {showPayment ? 'Hide payment form' : 'Record payment'}
            </button>
            {showPayment && (
              <PaymentForm
                invoiceId={invoiceId}
                outstanding={outstanding}
                onSaved={() => {
                  setShowPayment(false);
                  void run(async () => undefined, 'Payment recorded.');
                }}
              />
            )}
          </div>
        )}
      </section>

      <section className={`${cardCls} print:hidden space-y-3`}>
        <h2 className="text-base font-semibold">Payments received</h2>
        {payments.length === 0 && <p className="text-sm text-muted-foreground">No payments yet.</p>}
        <ul className="divide-y">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2">
              <Link href={`/payments/${p.id}`} className="min-w-0 text-sm">
                <span className="block">{formatDate(p.receivedOn)}</span>
                <span className="text-xs uppercase text-muted-foreground">{p.method}</span>
              </Link>
              <InrAmount value={p.amount} decimals={0} className="text-sm font-semibold" />
            </li>
          ))}
        </ul>
      </section>

      <section id="printable-invoice" className={`${cardCls} space-y-4 print:border-0 print:shadow-none`}>
        <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Invoice</p>
            <p className="font-semibold">{invoice.invoiceNumber}</p>
          </div>
          <div className="min-w-0 sm:text-right">
            <p className="text-xs text-muted-foreground">From</p>
            <p className="break-words font-semibold">{printView?.tutorName ?? ''}</p>
          </div>
        </div>
        <div className="flex flex-col gap-1 text-sm">
          <p>
            <span className="text-muted-foreground">Bill to: </span>
            {printView?.customerName ?? detail.customerName}
          </p>
          <p>
            <span className="text-muted-foreground">Due: </span>
            {formatDate(printView?.dueDate ?? invoice.dueDate)}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[16rem] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 font-medium">Description</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2 break-words pr-2">
                    {item.description} ({item.quantity})
                  </td>
                  <td className="py-2 text-right">
                    <InrAmount value={item.amount} decimals={0} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-medium">Total</span>
          <InrAmount value={printView?.totalAmount ?? invoice.totalAmount} decimals={0} className="font-semibold" />
        </div>
        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">Pay by UPI</p>
          {printView?.upiId ? (
            <>
              <p className="break-all text-sm">UPI ID: {printView.upiId}</p>
              <UpiQrCode
                uri={printView.upiQrPayload ?? null}
                size={180}
                caption="Scan with any UPI app to pay the outstanding amount."
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Add your UPI ID in Settings to show a payment QR code on this invoice.
            </p>
          )}
          <button type="button" className={`${outlineBtn} print:hidden`} onClick={() => void copyPaymentLink()}>
            Copy payment link
          </button>
        </div>
      </section>
    </main>
  );
}
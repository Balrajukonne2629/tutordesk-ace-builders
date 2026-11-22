'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getInvoices, getPayments } from '@/lib/api';
import InvoicePicker from '@/components/InvoicePicker';
import InvoiceBalanceSummary from '@/components/InvoiceBalanceSummary';
import PaymentForm from '@/components/PaymentForm';
import PageHeader from '@/components/PageHeader';

type InvoiceRow = Awaited<ReturnType<typeof getInvoices>>[number];

const OPEN_STATUSES: string[] = ['sent', 'partial', 'overdue'];

export default function NewPaymentPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceRow[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoadError('');
    getInvoices()
      .then((rows) => {
        if (!active) return;
        const open = rows
          .filter((r) => OPEN_STATUSES.includes(r.status) && Number(r.outstanding_amount) > 0)
          .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
        setInvoices(open);
      })
      .catch(() => {
        if (active) setLoadError('Could not load open invoices. Try again.');
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const selected = invoices?.find((i) => i.id === selectedId) ?? null;

  async function handleSaved() {
    if (!selected) {
      router.push('/payments');
      return;
    }
    try {
      const payments = await getPayments({ customer_id: selected.customer_id });
      const match = payments.find((p) => p.invoice_id === selected.id);
      router.push(match ? `/payments/${match.id}` : '/payments');
    } catch {
      router.push('/payments');
    }
  }

  return (
    <main data-nexen-component="nx_app_payments_new_page" className="mx-auto w-full max-w-xl min-w-0 space-y-6 px-4 py-6">
      <PageHeader
        title="Record payment"
        subtitle="The payment will be applied to one invoice."
        eyebrow="Payments"
        count={invoices?.length ?? 0}
        countLabel="open invoices"
        backHref="/payments"
        backLabel="Payments"
        actions={null}
      />

      {loadError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="min-w-0 break-words">{loadError}</span>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="h-10 rounded-[var(--radius)] border border-border px-4 font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {invoices === null && !loadError && (
        <p className="text-sm text-muted-foreground">Loading open invoices…</p>
      )}

      {invoices !== null && (
        <InvoicePicker
          invoices={invoices}
          value={selectedId}
          onChange={(id: string) => setSelectedId(id)}
          error=""
        />
      )}

      {selected && <InvoiceBalanceSummary invoice={selected} paymentAmount={0} />}

      {selected && (
        <PaymentForm
          invoiceId={selected.id}
          outstanding={Number(selected.outstanding_amount)}
          onSaved={handleSaved}
        />
      )}
    </main>
  );
}
'use client';

import { useCallback, useEffect, useState, type ComponentProps, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteCustomer, getCustomerById, getCustomerReminders, updateCustomer } from '@/lib/api';
import type { Customer } from '@/types/customer';
import type { Invoice } from '@/types/invoice';
import type { Payment } from '@/types/payment';
import type { Reminder } from '@/types/reminder';
import InrAmount from '@/components/InrAmount';
import InvoiceHistoryTable from '@/components/InvoiceHistoryTable';
import PaymentHabitMarkers from '@/components/PaymentHabitMarkers';
import PageState from '@/components/PageState';

type HabitMarker = ComponentProps<typeof PaymentHabitMarkers>['markers'][number];

type InvoiceEntry = { invoice: Invoice; aging_bucket: string; payments: Payment[] };

type CustomerDetail = {
  customer: Customer;
  outstanding_total: number;
  average_days_late: number | null;
  invoices: InvoiceEntry[];
  habit_markers: HabitMarker[];
};

type FormState = {
  parentName: string;
  studentName: string;
  phone: string;
  subject: string;
  monthlyFee: string;
  billingDay: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const TONE_LABEL: Record<string, string> = {
  friendly: 'Friendly',
  firm: 'Firm',
  final_notice: 'Final notice',
};

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Try again.';
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function normalizePhone(raw: string): string {
  return raw.replace(/[\s-]/g, '').replace(/^(\+91|0)/, '');
}

function toForm(c: Customer): FormState {
  return {
    parentName: c.parentName,
    studentName: c.studentName,
    phone: c.phone,
    subject: c.subject,
    monthlyFee: String(c.monthlyFee),
    billingDay: String(c.billingDay),
  };
}

function validate(f: FormState): FieldErrors {
  const e: FieldErrors = {};

  const parent = f.parentName.trim();
  if (!parent) e.parentName = "Please enter the parent's name.";
  else if (parent.length < 2 || parent.length > 60) e.parentName = 'Parent name should be between 2 and 60 characters.';

  const student = f.studentName.trim();
  if (!student) e.studentName = "Please enter the student's name.";
  else if (student.length < 2 || student.length > 60) e.studentName = 'Student name should be between 2 and 60 characters.';

  if (!f.phone.trim()) e.phone = 'Please enter a phone number.';
  else if (!/^[6-9]\d{9}$/.test(normalizePhone(f.phone))) e.phone = 'Enter a valid 10-digit mobile number starting with 6 to 9.';

  const subject = f.subject.trim();
  if (!subject) e.subject = 'Please enter the subject being taught.';
  else if (subject.length < 2 || subject.length > 40) e.subject = 'Subject should be between 2 and 40 characters.';

  const fee = f.monthlyFee.trim();
  if (!fee) e.monthlyFee = 'Enter the monthly fee in rupees.';
  else if (!/^\d+$/.test(fee) || Number(fee) < 500 || Number(fee) > 20000) {
    e.monthlyFee = 'Monthly fee must be a whole number between Rs 500 and Rs 20,000.';
  }

  const day = f.billingDay.trim();
  if (!day) e.billingDay = 'Enter the day of the month when invoices should be generated.';
  else if (!/^\d+$/.test(day) || Number(day) < 1 || Number(day) > 28) e.billingDay = 'Billing day must be between 1 and 28.';

  return e;
}

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const customerId = params.id;
  const router = useRouter();

  const [data, setData] = useState<CustomerDetail | null>(null);
  const [reminders, setReminders] = useState<Reminder[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [detail, log] = await Promise.all([
        getCustomerById(customerId),
        getCustomerReminders(customerId),
      ]);
      setData(detail);
      setForm(toForm(detail.customer));
      setReminders(log);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form) return;
    const errs = validate(form);
    setFieldErrors(errs);
    setFormError(null);
    setSavedMessage(null);
    if (Object.keys(errs).length > 0) return;

    setIsSaving(true);
    try {
      const updated = await updateCustomer(customerId, {
        parentName: form.parentName.trim(),
        studentName: form.studentName.trim(),
        phone: normalizePhone(form.phone),
        subject: form.subject.trim(),
        monthlyFee: Number(form.monthlyFee),
        billingDay: Number(form.billingDay),
      });
      setData((prev) => (prev ? { ...prev, customer: updated } : prev));
      setForm(toForm(updated));
      setSavedMessage('Changes saved. Fee and billing day apply to invoices generated from now on.');
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive() {
    if (!data) return;
    setActionError(null);
    setIsSaving(true);
    try {
      const updated = await updateCustomer(customerId, { isActive: !data.customer.isActive });
      setData((prev) => (prev ? { ...prev, customer: updated } : prev));
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setActionError(null);
    if (!window.confirm('Delete this customer? This cannot be undone.')) return;
    try {
      await deleteCustomer(customerId);
      router.push('/customers');
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  if (isLoading && !data) {
    return (
      <main className="mx-auto w-full max-w-2xl p-4 sm:p-6">
        <PageState state="loading" title="Loading customer" message="" actionLabel="" onAction={() => {}} rows={3} icon={null} />
      </main>
    );
  }

  if (loadError && !data) {
    return (
      <main className="mx-auto w-full max-w-2xl p-4 sm:p-6">
        <PageState state="error" title="Could not load this customer" message={loadError} actionLabel="Try again" onAction={() => void load()} rows={1} icon={null} />
      </main>
    );
  }

  if (!data || !form) return null;

  const { customer } = data;
  const invoiceRows = (data.invoices ?? []).map(({ invoice, payments }) => {
    const paid = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      issuedDate: invoice.issuedDate,
      dueDate: invoice.dueDate,
      totalAmount: Number(invoice.totalAmount),
      outstandingAmount: Math.max(0, Number(invoice.totalAmount) - paid),
      status: invoice.status,
    };
  });
  const log = reminders ?? [];
  const inputClass = 'h-11 w-full min-w-0 rounded-[var(--radius)] border border-border bg-background px-3 text-base text-foreground';

  return (
    <main data-nexen-component="nx_app_customers__id__page" className="mx-auto w-full max-w-2xl min-w-0 space-y-6 bg-background p-4 text-foreground sm:p-6">
      <div className="space-y-2">
        <Link href="/customers" className="text-sm text-muted-foreground">← Customers</Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold">{customer.studentName}</h1>
            <p className="truncate text-sm text-muted-foreground">
              {customer.parentName} · {customer.subject}
            </p>
          </div>
          <Link
            href="/reminders/new"
            className="inline-flex h-11 items-center justify-center rounded-[var(--radius)] bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm"
          >
            Start a reminder
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm sm:grid-cols-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Still owed</p>
          <InrAmount value={data.outstanding_total} decimals={0} className="text-xl font-semibold" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Monthly fee</p>
          <InrAmount value={customer.monthlyFee} decimals={0} className="text-xl font-semibold" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Billing day</p>
          <p className="text-xl font-semibold">Day {customer.billingDay}</p>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Average days late</p>
          <p className="text-xl font-semibold">
            {data.average_days_late === null ? 'Not available yet' : `${Math.round(data.average_days_late)} days`}
          </p>
        </div>
      </section>

      <section className="rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
        <PaymentHabitMarkers markers={data.habit_markers ?? []} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Invoice history</h2>
        <div className="min-w-0 overflow-x-auto rounded-[var(--radius)] border border-border bg-card shadow-sm">
          <InvoiceHistoryTable invoices={invoiceRows} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Reminder log</h2>
        {log.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reminders sent to this customer yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-[var(--radius)] border border-border bg-card shadow-sm">
            {log.map((r) => (
              <li key={r.id}>
                <Link href={`/reminders/${r.id}`} className="flex min-h-11 flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="min-w-0 truncate text-sm font-medium">{TONE_LABEL[r.tone] ?? r.tone}</span>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatDate(r.sentAt ?? r.createdAt)}</span>
                    <span className="rounded-[999px] bg-secondary px-2 py-0.5 capitalize text-secondary-foreground">
                      {r.status}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={handleSave} noValidate className="space-y-4 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Edit details</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block min-w-0 space-y-1 text-sm">
            <span className="text-muted-foreground">Parent name</span>
            <input className={inputClass} value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} />
            {fieldErrors.parentName && <span className="text-xs text-destructive">{fieldErrors.parentName}</span>}
          </label>
          <label className="block min-w-0 space-y-1 text-sm">
            <span className="text-muted-foreground">Student name</span>
            <input className={inputClass} value={form.studentName} onChange={(e) => setForm({ ...form, studentName: e.target.value })} />
            {fieldErrors.studentName && <span className="text-xs text-destructive">{fieldErrors.studentName}</span>}
          </label>
          <label className="block min-w-0 space-y-1 text-sm">
            <span className="text-muted-foreground">Phone</span>
            <input inputMode="tel" className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            {fieldErrors.phone && <span className="text-xs text-destructive">{fieldErrors.phone}</span>}
          </label>
          <label className="block min-w-0 space-y-1 text-sm">
            <span className="text-muted-foreground">Subject</span>
            <input className={inputClass} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            {fieldErrors.subject && <span className="text-xs text-destructive">{fieldErrors.subject}</span>}
          </label>
          <label className="block min-w-0 space-y-1 text-sm">
            <span className="text-muted-foreground">Monthly fee (Rs)</span>
            <input inputMode="numeric" className={inputClass} value={form.monthlyFee} onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })} />
            {fieldErrors.monthlyFee && <span className="text-xs text-destructive">{fieldErrors.monthlyFee}</span>}
          </label>
          <label className="block min-w-0 space-y-1 text-sm">
            <span className="text-muted-foreground">Billing day (1-28)</span>
            <input inputMode="numeric" className={inputClass} value={form.billingDay} onChange={(e) => setForm({ ...form, billingDay: e.target.value })} />
            {fieldErrors.billingDay && <span className="text-xs text-destructive">{fieldErrors.billingDay}</span>}
          </label>
        </div>

        {formError && <p className="text-sm text-destructive">{formError}</p>}
        {savedMessage && <p className="text-sm text-muted-foreground">{savedMessage}</p>}

        <button
          type="submit"
          disabled={isSaving}
          className="h-11 w-full rounded-[var(--radius)] bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm disabled:opacity-50 sm:w-auto"
        >
          {isSaving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <section className="space-y-3 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Status and deletion</h2>
        <p className="text-sm text-muted-foreground">
          {customer.isActive
            ? 'This customer is active and gets monthly invoices.'
            : 'This customer is inactive and gets no new invoices.'}
        </p>
        <button
          type="button"
          onClick={handleToggleActive}
          disabled={isSaving}
          className="h-11 w-full rounded-[var(--radius)] border border-border bg-background px-4 text-sm font-medium text-foreground disabled:opacity-50 sm:w-auto"
        >
          {customer.isActive ? 'Deactivate customer' : 'Reactivate customer'}
        </button>
        <p className="text-sm text-muted-foreground">
          Delete is refused when this customer has invoices or payments. In that case, deactivate them instead.
        </p>
        <button
          type="button"
          onClick={handleDelete}
          className="h-11 w-full rounded-[var(--radius)] border border-destructive px-4 text-sm font-medium text-destructive sm:w-auto"
        >
          Delete customer
        </button>
        {actionError && <p className="text-sm text-destructive">{actionError}</p>}
      </section>
    </main>
  );
}
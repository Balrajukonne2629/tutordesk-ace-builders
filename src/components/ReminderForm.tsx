'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, createReminder, getCustomers, getInvoices } from '@/lib/api';
import type { Customer } from '@/types/customer';
import type { Invoice } from '@/types/invoice';
import type { Reminder } from '@/types/reminder';

type Tone = Reminder['tone'];
type Language = Reminder['language'];

const DAY_MS = 86400000;
const OPEN_STATUSES: string[] = ['sent', 'partial', 'overdue'];
const TONE_LABELS: { value: Tone; label: string }[] = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'firm', label: 'Firm' },
  { value: 'final_notice', label: 'Final notice' },
];

interface ReminderFormProps {
  onCreated?: (reminder: Reminder) => void;
}

function toneFor(days: number): Tone {
  if (days < 8) return 'friendly';
  if (days < 30) return 'firm';
  return 'final_notice';
}

function buildMessage(
  tone: Tone,
  language: Language,
  p: { parent: string; student: string; no: string; amount: string; days: number; due: string },
): string {
  if (tone === 'friendly') {
    if (language === 'hindi') {
      return `नमस्ते ${p.parent}, ${p.student} की फीस Rs ${p.amount} (इनवॉइस ${p.no}) बकाया है। कृपया UPI से भुगतान करें। धन्यवाद।`;
    }
    if (language === 'telugu') {
      return `నమస్కారం ${p.parent}, ${p.student} ఫీజు Rs ${p.amount} (ఇన్వాయిస్ ${p.no}) బకాయి ఉంది. దయచేసి UPI ద్వారా చెల్లించండి. ధన్యవాదాలు.`;
    }
    return `Hi ${p.parent}, a friendly reminder that the fee of Rs ${p.amount} for ${p.student} (invoice ${p.no}) was due on ${p.due}. Please pay via UPI when convenient. Thank you!`;
  }
  if (tone === 'firm') {
    return `Dear ${p.parent}, invoice ${p.no} for Rs ${p.amount} for ${p.student}'s classes is ${p.days} days overdue. Please clear the balance at the earliest. Thank you.`;
  }
  return `Dear ${p.parent}, this is a final notice. Invoice ${p.no} for Rs ${p.amount} for ${p.student}'s classes is ${p.days} days overdue. Please pay in full within 7 days to avoid further action.`;
}

export default function ReminderForm({ onCreated }: ReminderFormProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [daysLate, setDaysLate] = useState(0);
  const [tone, setTone] = useState<Tone>('friendly');
  const [language, setLanguage] = useState<Language>('english');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCustomers({ active: true })
      .then(setCustomers)
      .catch(() => setError('Could not load customers.'));
  }, []);

  useEffect(() => {
    setInvoiceId('');
    if (!customerId) {
      setInvoices([]);
      return;
    }
    getInvoices({ customer_id: customerId })
      .then((list) =>
        setInvoices(
          list
            .filter((inv) => OPEN_STATUSES.includes(inv.status))
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
        ),
      )
      .catch(() => setError('Could not load invoices for this customer.'));
  }, [customerId]);

  function regenerate(nextTone: Tone, nextLanguage: Language, invId = invoiceId) {
    const inv = invoices.find((i) => i.id === invId);
    const customer = customers.find((c) => c.id === customerId);
    if (!inv || !customer) return;
    setMessage(
      buildMessage(nextTone, nextLanguage, {
        parent: customer.parentName,
        student: customer.studentName,
        no: inv.invoiceNumber,
        amount: Number(inv.totalAmount).toLocaleString('en-IN'),
        days: daysLate,
        due: new Date(inv.dueDate).toLocaleDateString('en-IN'),
      }),
    );
  }

  function handleInvoiceChange(id: string) {
    setInvoiceId(id);
    setSaved(false);
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return;
    const days = Math.max(0, Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / DAY_MS));
    const nextTone = toneFor(days);
    setDaysLate(days);
    setTone(nextTone);
    setLanguage('english');
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;
    setMessage(
      buildMessage(nextTone, 'english', {
        parent: customer.parentName,
        student: customer.studentName,
        no: inv.invoiceNumber,
        amount: Number(inv.totalAmount).toLocaleString('en-IN'),
        days,
        due: new Date(inv.dueDate).toLocaleDateString('en-IN'),
      }),
    );
  }

  function handleToneChange(next: Tone) {
    setTone(next);
    const nextLanguage: Language = next === 'friendly' ? language : 'english';
    setLanguage(nextLanguage);
    regenerate(next, nextLanguage);
  }

  function validate(): string | null {
    const text = message.trim();
    if (!customerId) return 'Please choose a customer to remind.';
    if (!invoiceId) return 'Please choose the invoice this reminder is about.';
    if (!TONE_LABELS.some((t) => t.value === tone)) {
      return 'Please choose a tone: Friendly, Firm, or Final notice.';
    }
    if (language !== 'english' && tone !== 'friendly') {
      return 'Hindi and Telugu are available only for the Friendly reminder. Switch the tone to Friendly or use English.';
    }
    if (text.length === 0) return 'Reminder message cannot be empty. Please write a message.';
    if (text.length > 1000) return 'Reminder message is too long. Keep it under 1000 characters.';
    if (text.length < 20) return 'Keep the reminder between 20 and 1000 characters.';
    return null;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const reminder = await createReminder({
        customerId,
        invoiceId,
        tone,
        language,
        messageBody: message.trim(),
        daysLateAtCreation: daysLate,
      });
      setSaved(true);
      onCreated?.(reminder);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the reminder. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    'w-full min-w-0 h-10 px-3 rounded-[var(--radius)] border border-border bg-background text-sm text-foreground';

  return (
    <form data-nexen-component="nx_components_ReminderForm" onSubmit={handleSubmit} className="w-full max-w-xl space-y-4 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="space-y-1">
        <label htmlFor="reminder-customer" className="text-sm font-medium text-foreground">Customer</label>
        <select id="reminder-customer" className={fieldClass} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">Choose a customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.parentName} ({c.studentName})</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="reminder-invoice" className="text-sm font-medium text-foreground">Invoice</label>
        <select
          id="reminder-invoice"
          className={fieldClass}
          value={invoiceId}
          disabled={!customerId}
          onChange={(e) => handleInvoiceChange(e.target.value)}
        >
          <option value="">{invoices.length ? 'Choose an invoice' : 'No outstanding invoices'}</option>
          {invoices.map((inv) => (
            <option key={inv.id} value={inv.id}>{inv.invoiceNumber} · Due {new Date(inv.dueDate).toLocaleDateString('en-IN')}</option>
          ))}
        </select>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Tone</legend>
        <div className="flex flex-wrap gap-2">
          {TONE_LABELS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => handleToneChange(t.value)}
              aria-pressed={tone === t.value}
              className={`h-9 px-3 rounded-full border text-sm ${tone === t.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1">
        <label htmlFor="reminder-language" className="text-sm font-medium text-foreground">Language</label>
        <select
          id="reminder-language"
          className={fieldClass}
          value={language}
          disabled={tone !== 'friendly'}
          onChange={(e) => {
            const next = e.target.value as Language;
            setLanguage(next);
            regenerate(tone, next);
          }}
        >
          <option value="english">English</option>
          <option value="hindi">Hindi</option>
          <option value="telugu">Telugu</option>
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="reminder-message" className="text-sm font-medium text-foreground">Message</label>
        <textarea
          id="reminder-message"
          rows={5}
          className="w-full min-w-0 p-3 rounded-[var(--radius)] border border-border bg-background text-sm text-foreground"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">{message.trim().length} / 1000 characters</p>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-success">Reminder drafted. Open it to send via WhatsApp.</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full sm:w-auto h-10 px-4 rounded-[var(--radius)] bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save reminder draft'}
      </button>
    </form>
  );
}
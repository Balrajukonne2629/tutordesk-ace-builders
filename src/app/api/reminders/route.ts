import { NextResponse } from 'next/server';
import type { ReminderTone, ReminderLanguage, ReminderStatus } from '@prisma/client';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const TONES: ReminderTone[] = ['friendly', 'firm', 'final_notice'];
const LANGUAGES: ReminderLanguage[] = ['english', 'hindi', 'telugu'];
const STATUSES: ReminderStatus[] = ['draft', 'sent'];
const OPEN_INVOICE_STATUSES: string[] = ['sent', 'partial', 'overdue'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MESSAGE_MAX = 1000;

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

function pick(body: Record<string, unknown>, snake: string, camel: string): unknown {
  return body[snake] !== undefined ? body[snake] : body[camel];
}

function todayIstIso(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000);
}

function autoToneFromDaysLate(daysLate: number): ReminderTone {
  if (daysLate >= 30) return 'final_notice';
  if (daysLate >= 8) return 'firm';
  return 'friendly';
}

function formatRupees(amount: number): string {
  return amount.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

interface TemplateInput {
  tone: ReminderTone;
  language: ReminderLanguage;
  parentName: string;
  studentName: string;
  invoiceNumber: string;
  amount: number;
  dueIso: string;
  daysLate: number;
}

function buildMessage(t: TemplateInput): string {
  const amt = formatRupees(t.amount);
  if (t.tone === 'friendly') {
    if (t.language === 'hindi') {
      return `नमस्ते ${t.parentName}, ${t.studentName} की ट्यूशन फीस ₹${amt} (इनवॉइस ${t.invoiceNumber}) ${t.dueIso} को देय थी। कृपया सुविधानुसार भुगतान कर दें। धन्यवाद।`;
    }
    if (t.language === 'telugu') {
      return `నమస్కారం ${t.parentName}, ${t.studentName} ట్యూషన్ ఫీజు ₹${amt} (ఇన్వాయిస్ ${t.invoiceNumber}) ${t.dueIso} న చెల్లించాల్సి ఉంది. దయచేసి వీలైనప్పుడు చెల్లింపు చేయండి. ధన్యవాదాలు.`;
    }
    return `Hi ${t.parentName}, a friendly reminder that the tuition fee of Rs ${amt} for ${t.studentName} (invoice ${t.invoiceNumber}) was due on ${t.dueIso}. Could you please pay when convenient? Thank you.`;
  }
  if (t.tone === 'firm') {
    return `Dear ${t.parentName}, the fee of Rs ${amt} for ${t.studentName} (invoice ${t.invoiceNumber}) was due on ${t.dueIso} and is now ${t.daysLate} days overdue. Please pay this week to keep classes on track.`;
  }
  return `Dear ${t.parentName}, this is a final notice. Rs ${amt} for ${t.studentName} (invoice ${t.invoiceNumber}), due on ${t.dueIso}, is ${t.daysLate} days overdue. Please pay in full within 7 days or contact me today to settle this.`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status');

  let status: ReminderStatus | undefined;
  if (statusParam) {
    if (!isOneOf(STATUSES, statusParam)) {
      return NextResponse.json(
        { error: 'Status must be draft or sent.' },
        { status: 400 },
      );
    }
    status = statusParam;
  }

  try {
    const reminders = await db.reminder.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ reminders });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const body = raw as Record<string, unknown>;

  const customerId = pick(body, 'customer_id', 'customerId');
  const invoiceId = pick(body, 'invoice_id', 'invoiceId');
  const toneInput = body.tone;
  const languageInput = body.language;
  const messageInput = pick(body, 'message_body', 'messageBody');

  if (typeof customerId !== 'string' || customerId.trim() === '') {
    return NextResponse.json(
      { error: 'Please choose a customer to remind.' },
      { status: 400 },
    );
  }
  if (typeof invoiceId !== 'string' || invoiceId.trim() === '') {
    return NextResponse.json(
      { error: 'Please choose the invoice this reminder is about.' },
      { status: 400 },
    );
  }
  if (toneInput !== undefined && toneInput !== null && !isOneOf(TONES, toneInput)) {
    return NextResponse.json(
      { error: 'Please choose a tone: Friendly, Firm, or Final notice.' },
      { status: 400 },
    );
  }
  if (languageInput !== undefined && languageInput !== null && !isOneOf(LANGUAGES, languageInput)) {
    return NextResponse.json(
      { error: 'Language must be English, Hindi, or Telugu.' },
      { status: 400 },
    );
  }
  if (messageInput !== undefined && messageInput !== null && typeof messageInput !== 'string') {
    return NextResponse.json(
      { error: 'The reminder message cannot be empty and must be under 1000 characters.' },
      { status: 400 },
    );
  }

  try {
    const customer = UUID_RE.test(customerId)
      ? await db.customer.findUnique({ where: { id: customerId } })
      : null;
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const invoice = UUID_RE.test(invoiceId)
      ? await db.invoice.findUnique({ where: { id: invoiceId } })
      : null;
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    if (invoice.customerId !== customer.id) {
      return NextResponse.json(
        { error: 'Please choose the invoice this reminder is about.' },
        { status: 400 },
      );
    }
    if (!OPEN_INVOICE_STATUSES.includes(invoice.status)) {
      return NextResponse.json(
        { error: 'This invoice has no outstanding balance to remind about.' },
        { status: 400 },
      );
    }

    const paidAgg = await db.payment.aggregate({
      where: { invoiceId: invoice.id },
      _sum: { amount: true },
    });
    const paid = paidAgg._sum.amount ? paidAgg._sum.amount.toNumber() : 0;
    const outstanding = Math.round((invoice.totalAmount.toNumber() - paid) * 100) / 100;
    if (outstanding <= 0) {
      return NextResponse.json(
        { error: 'This invoice has no outstanding balance to remind about.' },
        { status: 400 },
      );
    }

    const dueIso = invoice.dueDate.toISOString().slice(0, 10);
    const rawDaysLate = daysBetween(dueIso, todayIstIso());
    const daysLate = Math.max(0, rawDaysLate);

    const tone: ReminderTone = isOneOf(TONES, toneInput)
      ? toneInput
      : autoToneFromDaysLate(daysLate);
    const language: ReminderLanguage = isOneOf(LANGUAGES, languageInput)
      ? languageInput
      : 'english';

    if (language !== 'english' && tone !== 'friendly') {
      return NextResponse.json(
        {
          error:
            'Hindi and Telugu are available only for the Friendly reminder. Please choose English or change the tone to Friendly.',
        },
        { status: 400 },
      );
    }

    let messageBody: string;
    if (typeof messageInput === 'string') {
      messageBody = messageInput.trim();
      if (messageBody.length < 1 || messageBody.length > MESSAGE_MAX) {
        return NextResponse.json(
          { error: 'The reminder message cannot be empty and must be under 1000 characters.' },
          { status: 400 },
        );
      }
    } else {
      messageBody = buildMessage({
        tone,
        language,
        parentName: customer.parentName,
        studentName: customer.studentName,
        invoiceNumber: invoice.invoiceNumber,
        amount: outstanding,
        dueIso,
        daysLate,
      });
    }

    const reminder = await db.reminder.create({
      data: {
        customerId: customer.id,
        invoiceId: invoice.id,
        tone,
        language,
        messageBody,
        daysLateAtCreation: daysLate,
        status: 'draft',
        sentAt: null,
      },
    });

    return NextResponse.json({ reminder }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
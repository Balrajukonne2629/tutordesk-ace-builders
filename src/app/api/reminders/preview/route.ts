import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

type Tone = 'friendly' | 'firm' | 'final_notice';
type Language = 'english' | 'hindi' | 'telugu';

const LANGUAGES: Language[] = ['english', 'hindi', 'telugu'];
const OUTSTANDING_STATUSES = ['sent', 'partial', 'overdue'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 86_400_000;

function toneForDays(daysLate: number): Tone {
  if (daysLate >= 30) return 'final_notice';
  if (daysLate >= 8) return 'firm';
  return 'friendly';
}

/** Today's IST calendar day, as a UTC-midnight timestamp (matches @db.Date storage). */
function istTodayMs(): number {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
}

function formatDue(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function formatAmount(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

interface TemplateVars {
  parent: string;
  student: string;
  amount: string;
  invoice: string;
  due: string;
  days: number;
  sender: string | null;
}

const TEMPLATES: Record<Tone, Partial<Record<Language, (v: TemplateVars) => string>>> & {
  friendly: Record<Language, (v: TemplateVars) => string>;
} = {
  friendly: {
    english: (v) =>
      `Hi ${v.parent}, a gentle reminder that the fee of Rs ${v.amount} for ${v.student} (invoice ${v.invoice}, due ${v.due}) is still pending. Please pay when convenient. Thank you!`,
    hindi: (v) =>
      `नमस्ते ${v.parent} जी, ${v.student} की ट्यूशन फीस ₹${v.amount} (इनवॉइस ${v.invoice}, देय तिथि ${v.due}) अभी बाकी है। कृपया सुविधानुसार भुगतान कर दें। धन्यवाद।`,
    telugu: (v) =>
      `నమస్కారం ${v.parent} గారు, ${v.student} ట్యూషన్ ఫీజు ₹${v.amount} (ఇన్‌వాయిస్ ${v.invoice}, గడువు తేదీ ${v.due}) ఇంకా బాకీ ఉంది. మీకు వీలైనప్పుడు చెల్లించగలరు. ధన్యవాదాలు.`,
  },
  firm: {
    english: (v) =>
      `Dear ${v.parent}, the fee of Rs ${v.amount} for ${v.student} (invoice ${v.invoice}) was due on ${v.due} and is now ${v.days} days overdue. Please pay the balance at the earliest.`,
  } as Record<Language, (v: TemplateVars) => string>,
  final_notice: {
    english: (v) =>
      `Dear ${v.parent}, this is a final notice. Rs ${v.amount} for ${v.student} (invoice ${v.invoice}, due ${v.due}) is ${v.days} days overdue. Please clear the full balance within 7 days to avoid further action.`,
  } as Record<Language, (v: TemplateVars) => string>,
};

function buildMessage(tone: Tone, language: Language, v: TemplateVars): string {
  const template = TEMPLATES[tone][language] ?? TEMPLATES[tone].english;
  if (!template) {
    throw new Error(`No template for tone ${tone}`);
  }
  const body = template(v);
  return v.sender ? `${body}\n— ${v.sender}` : body;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const input = (body ?? {}) as Record<string, unknown>;
  const customerId = typeof input.customer_id === 'string' ? input.customer_id.trim() : '';
  const invoiceId = typeof input.invoice_id === 'string' ? input.invoice_id.trim() : '';
  const rawLanguage = input.language ?? 'english';

  if (!customerId || !UUID_RE.test(customerId)) {
    return NextResponse.json({ error: 'Please choose a customer to remind.' }, { status: 400 });
  }
  if (!invoiceId || !UUID_RE.test(invoiceId)) {
    return NextResponse.json(
      { error: 'Please choose the invoice this reminder is about.' },
      { status: 400 },
    );
  }
  if (typeof rawLanguage !== 'string' || !LANGUAGES.includes(rawLanguage as Language)) {
    return NextResponse.json(
      { error: 'The language must be English, Hindi, or Telugu.' },
      { status: 400 },
    );
  }
  const language = rawLanguage as Language;

  try {
    const customer = await db.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    if (invoice.customerId !== customer.id) {
      return NextResponse.json(
        { error: 'Please choose the invoice this reminder is about.' },
        { status: 400 },
      );
    }
    if (!OUTSTANDING_STATUSES.includes(invoice.status)) {
      return NextResponse.json(
        { error: 'This invoice has no outstanding balance to remind about.' },
        { status: 400 },
      );
    }

    const paidAgg = await db.payment.aggregate({
      where: { invoiceId: invoice.id },
      _sum: { amount: true },
    });
    const paid = Number(paidAgg._sum.amount ?? 0);
    const outstanding = Math.max(
      0,
      Math.round((Number(invoice.totalAmount) - paid) * 100) / 100,
    );
    if (outstanding <= 0) {
      return NextResponse.json(
        { error: 'This invoice has no outstanding balance to remind about.' },
        { status: 400 },
      );
    }

    const dueUtc = invoice.dueDate;
    const dueMs = Date.UTC(dueUtc.getUTCFullYear(), dueUtc.getUTCMonth(), dueUtc.getUTCDate());
    const rawDays = Math.round((istTodayMs() - dueMs) / DAY_MS);
    const daysLate = Math.max(0, rawDays);
    const tone = toneForDays(daysLate);

    if (language !== 'english' && tone !== 'friendly') {
      return NextResponse.json(
        {
          error:
            'Hindi and Telugu are available only for the Friendly reminder. Switch the tone to Friendly or use English.',
        },
        { status: 400 },
      );
    }

    const profile = await db.tutorProfile.findFirst({ orderBy: { createdAt: 'asc' } });
    const sender = profile?.name?.trim() ? profile.name.trim() : null;

    const message = buildMessage(tone, language, {
      parent: customer.parentName,
      student: customer.studentName,
      amount: formatAmount(outstanding),
      invoice: invoice.invoiceNumber,
      due: formatDue(dueUtc),
      days: daysLate,
      sender,
    });

    const threeDaysAgo = new Date(Date.now() - 3 * DAY_MS);
    const recent = await db.reminder.findFirst({
      where: {
        customerId: customer.id,
        status: 'sent',
        sentAt: { gte: threeDaysAgo },
      },
      select: { id: true },
    });

    return NextResponse.json({
      tone,
      days_late_at_creation: daysLate,
      message_body: message,
      recently_reminded: recent !== null,
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

const DAY_MS = 86_400_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_MESSAGE_LENGTH = 1000;

type ReminderToneValue = 'friendly' | 'firm' | 'final_notice';

function toneForDaysLate(daysLate: number): ReminderToneValue {
  if (daysLate >= 30) return 'final_notice';
  if (daysLate >= 8) return 'firm';
  return 'friendly';
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildMessage(input: {
  tone: ReminderToneValue;
  parentName: string;
  studentName: string;
  subject: string;
  invoiceNumber: string;
  outstanding: number;
  daysLate: number;
  dueDateLabel: string;
}): string {
  const { tone, parentName, studentName, subject, invoiceNumber, outstanding, daysLate, dueDateLabel } = input;
  const amount = outstanding.toFixed(2);
  let message: string;
  if (tone === 'final_notice') {
    message = `Dear ${parentName}, this is a final notice. The fee of Rs ${amount} for ${studentName}'s ${subject} classes (invoice ${invoiceNumber}) is ${daysLate} days overdue, since ${dueDateLabel}. Please pay immediately to avoid interruption of classes.`;
  } else if (tone === 'firm') {
    message = `Dear ${parentName}, the fee of Rs ${amount} for ${studentName}'s ${subject} classes (invoice ${invoiceNumber}) is ${daysLate} days overdue, since ${dueDateLabel}. Please clear it this week. Thank you.`;
  } else {
    message = `Dear ${parentName}, a gentle reminder that the fee of Rs ${amount} for ${studentName}'s ${subject} classes (invoice ${invoiceNumber}) was due on ${dueDateLabel}. Please pay when convenient. Thank you.`;
  }
  return message.slice(0, MAX_MESSAGE_LENGTH);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rawIds =
    body && typeof body === 'object' ? (body as { customer_ids?: unknown }).customer_ids : undefined;

  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    return NextResponse.json({ error: 'Choose at least one customer to remind.' }, { status: 400 });
  }
  if (!rawIds.every((id) => typeof id === 'string' && UUID_RE.test(id))) {
    return NextResponse.json({ error: 'customer_ids must be a list of valid ids.' }, { status: 400 });
  }

  const customerIds = Array.from(new Set(rawIds as string[]));

  try {
    // Today's date in IST, as a UTC midnight timestamp (matches @db.Date columns).
    const ist = new Date(Date.now() + 19_800_000);
    const todayUtc = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
    const today = new Date(todayUtc);

    const invoices = await db.invoice.findMany({
      where: {
        customerId: { in: customerIds },
        status: { in: ['sent', 'partial', 'overdue'] },
        dueDate: { lt: today },
      },
      include: {
        customer: true,
        payments: { select: { amount: true } },
      },
    });

    type Candidate = {
      invoiceId: string;
      customerId: string;
      outstanding: number;
      daysLate: number;
      score: number;
      tone: ReminderToneValue;
      message: string;
    };

    const candidates: Candidate[] = [];
    for (const inv of invoices) {
      const total = Number(inv.totalAmount.toString());
      const paid = inv.payments.reduce((sum, p) => sum + Number(p.amount.toString()), 0);
      const outstanding = round2(total - paid);
      if (outstanding <= 0) continue;

      const daysLate = Math.max(0, Math.floor((todayUtc - inv.dueDate.getTime()) / DAY_MS));
      const tone = toneForDaysLate(daysLate);
      const message = buildMessage({
        tone,
        parentName: inv.customer.parentName,
        studentName: inv.customer.studentName,
        subject: inv.customer.subject,
        invoiceNumber: inv.invoiceNumber,
        outstanding,
        daysLate,
        dueDateLabel: inv.dueDate.toISOString().slice(0, 10),
      });

      candidates.push({
        invoiceId: inv.id,
        customerId: inv.customerId,
        outstanding,
        daysLate,
        score: round2(outstanding * daysLate),
        tone,
        message,
      });
    }

    // Skip invoices that already have an open draft.
    const candidateInvoiceIds = candidates.map((c) => c.invoiceId);
    const openDrafts = candidateInvoiceIds.length
      ? await db.reminder.findMany({
          where: { invoiceId: { in: candidateInvoiceIds }, status: 'draft' },
          select: { invoiceId: true },
        })
      : [];
    const openDraftInvoiceIds = new Set(openDrafts.map((r) => r.invoiceId));

    const toCreate = candidates
      .filter((c) => !openDraftInvoiceIds.has(c.invoiceId))
      .sort((a, b) => b.score - a.score);

    if (toCreate.length === 0) {
      return NextResponse.json({ reminders: [] }, { status: 201 });
    }

    const batchId = randomUUID();
    const rows: Prisma.ReminderUncheckedCreateInput[] = toCreate.map((c, index) => ({
      customerId: c.customerId,
      invoiceId: c.invoiceId,
      tone: c.tone,
      language: 'english',
      messageBody: c.message,
      daysLateAtCreation: c.daysLate,
      status: 'draft',
      isDemo: false,
      badDayBatchId: batchId,
      badDayRank: index + 1,
    }));

    const reminders = await db.$transaction(
      rows.map((data) => db.reminder.create({ data })),
    );

    return NextResponse.json({ reminders }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
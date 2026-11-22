import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';

const RECENT_REMINDER_DAYS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function GET(request: Request) {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const latestBatch = await db.reminder.findFirst({
      where: { badDayBatchId: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { badDayBatchId: true },
    });

    if (!latestBatch?.badDayBatchId) {
      return NextResponse.json({ drafts: [] });
    }

    const rows = await db.reminder.findMany({
      where: {
        badDayBatchId: latestBatch.badDayBatchId,
        status: 'draft',
      },
      orderBy: { badDayRank: 'asc' },
      include: {
        customer: true,
        invoice: { include: { payments: true } },
      },
    });

    const customerIds = Array.from(new Set(rows.map((row) => row.customerId)));
    const since = new Date(Date.now() - RECENT_REMINDER_DAYS * MS_PER_DAY);

    const recentlySent = customerIds.length
      ? await db.reminder.findMany({
          where: {
            customerId: { in: customerIds },
            status: 'sent',
            sentAt: { gte: since },
          },
          select: { customerId: true },
        })
      : [];

    const recentlyRemindedIds = new Set(recentlySent.map((row) => row.customerId));

    const drafts = rows.map((row) => {
      const paidTotal = row.invoice.payments.reduce(
        (sum, payment) => sum + payment.amount.toNumber(),
        0,
      );
      const outstandingAmount = Math.max(
        0,
        roundMoney(row.invoice.totalAmount.toNumber() - paidTotal),
      );

      return {
        id: row.id,
        rank: row.badDayRank,
        tone: row.tone,
        language: row.language,
        daysLateAtCreation: row.daysLateAtCreation,
        customerId: row.customerId,
        customerName: row.customer.parentName,
        studentName: row.customer.studentName,
        invoiceId: row.invoiceId,
        invoiceNumber: row.invoice.invoiceNumber,
        dueDate: toDateOnly(row.invoice.dueDate),
        outstandingAmount,
        recentlyReminded: recentlyRemindedIds.has(row.customerId),
      };
    });

    return NextResponse.json({ drafts });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
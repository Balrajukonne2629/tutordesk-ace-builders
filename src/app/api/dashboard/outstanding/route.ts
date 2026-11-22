import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const OPEN_STATUSES = ['sent', 'partial', 'overdue'] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

type AgingBucket = 'not_due' | '1-7' | '8-30' | '30+';

function bucketFor(daysPastDue: number): AgingBucket {
  if (daysPastDue <= 0) return 'not_due';
  if (daysPastDue <= 7) return '1-7';
  if (daysPastDue <= 30) return '8-30';
  return '30+';
}

function toMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Today's date in the IST calendar, as a UTC-midnight Date (matches @db.Date values). */
function todayIst(): Date {
  const shifted = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const ymd = shifted.toISOString().slice(0, 10);
  return new Date(`${ymd}T00:00:00.000Z`);
}

interface CustomerAccumulator {
  customerId: string;
  customerName: string;
  studentName: string;
  balance: number;
  maxDaysPastDue: number;
  invoiceCount: number;
}

export async function GET(request: Request) {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = todayIst();

    const invoices = await db.invoice.findMany({
      where: { status: { in: [...OPEN_STATUSES] } },
      select: {
        id: true,
        customerId: true,
        dueDate: true,
        totalAmount: true,
        customer: { select: { parentName: true, studentName: true } },
        payments: { select: { amount: true } },
      },
    });

    const byCustomer = new Map<string, CustomerAccumulator>();

    for (const invoice of invoices) {
      const total = Number(invoice.totalAmount.toString());
      const paid = invoice.payments.reduce(
        (sum, payment) => sum + Number(payment.amount.toString()),
        0,
      );
      const outstanding = toMoney(Math.max(0, total - paid));
      if (outstanding <= 0) continue;

      const daysPastDue = Math.max(
        0,
        Math.floor((today.getTime() - invoice.dueDate.getTime()) / DAY_MS),
      );

      const existing = byCustomer.get(invoice.customerId);
      if (existing) {
        existing.balance = toMoney(existing.balance + outstanding);
        existing.maxDaysPastDue = Math.max(existing.maxDaysPastDue, daysPastDue);
        existing.invoiceCount += 1;
      } else {
        byCustomer.set(invoice.customerId, {
          customerId: invoice.customerId,
          customerName: invoice.customer.parentName,
          studentName: invoice.customer.studentName,
          balance: outstanding,
          maxDaysPastDue: daysPastDue,
          invoiceCount: 1,
        });
      }
    }

    const customers = Array.from(byCustomer.values())
      .map((row) => ({
        customerId: row.customerId,
        customerName: row.customerName,
        studentName: row.studentName,
        balance: row.balance,
        daysPastDue: row.maxDaysPastDue,
        agingBucket: bucketFor(row.maxDaysPastDue),
        invoiceCount: row.invoiceCount,
      }))
      .sort((a, b) => {
        if (b.balance !== a.balance) return b.balance - a.balance;
        return b.daysPastDue - a.daysPastDue;
      });

    return NextResponse.json({ customers });
  } catch (error) {
    console.error('GET /api/dashboard/outstanding failed', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
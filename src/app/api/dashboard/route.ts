import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const DAY_MS = 86_400_000;
const OPEN_STATUSES = ['sent', 'partial', 'overdue'] as const;

type BucketKey = 'not_due' | '1-7' | '8-30' | '30+';
const BUCKET_ORDER: BucketKey[] = ['not_due', '1-7', '8-30', '30+'];

type ChaseRow = {
  customer_id: string;
  customer_name: string;
  overdue_amount: number;
  max_days_late: number;
  rank_score: number;
};

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Today and the current month boundaries, expressed as UTC-midnight timestamps of IST calendar dates. */
function istCalendar(now: Date): { todayUtc: number; monthStartUtc: number; monthEndUtc: number } {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const [year, month, day] = ymd.split('-').map(Number);
  return {
    todayUtc: Date.UTC(year, month - 1, day),
    monthStartUtc: Date.UTC(year, month - 1, 1),
    monthEndUtc: Date.UTC(year, month, 1),
  };
}

/** Date-only fields come back from Prisma at UTC midnight; normalise to a day number. */
function utcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function bucketFor(daysPastDue: number): BucketKey {
  if (daysPastDue <= 0) return 'not_due';
  if (daysPastDue <= 7) return '1-7';
  if (daysPastDue <= 30) return '8-30';
  return '30+';
}

export async function GET() {
  try {
    const now = new Date();
    const { todayUtc, monthStartUtc, monthEndUtc } = istCalendar(now);
    const todayDate = new Date(todayUtc);

    const [invoices, paymentTotal, paidBillTotal, profile, collectedAgg] = await Promise.all([
      db.invoice.findMany({
        where: { status: { in: [...OPEN_STATUSES] } },
        select: {
          id: true,
          customerId: true,
          dueDate: true,
          totalAmount: true,
          customer: { select: { parentName: true } },
          payments: { select: { amount: true } },
        },
      }),
      db.payment.aggregate({ _sum: { amount: true } }),
      db.bill.aggregate({
        where: { status: 'paid', paidOn: { lte: todayDate } },
        _sum: { amount: true },
      }),
      db.tutorProfile.findFirst({ select: { openingCashBalance: true } }),
      db.payment.aggregate({
        where: {
          receivedOn: { gte: new Date(monthStartUtc), lt: new Date(monthEndUtc) },
        },
        _sum: { amount: true },
      }),
    ]);

    let totalOutstanding = 0;
    let overdueAmount = 0;
    const buckets: Record<BucketKey, { balance: number; count: number }> = {
      not_due: { balance: 0, count: 0 },
      '1-7': { balance: 0, count: 0 },
      '8-30': { balance: 0, count: 0 },
      '30+': { balance: 0, count: 0 },
    };
    const chaseMap = new Map<string, { customer_id: string; customer_name: string; overdue_amount: number; max_days_late: number }>();

    for (const invoice of invoices) {
      const paid = invoice.payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
      const balance = Math.max(0, invoice.totalAmount.toNumber() - paid);
      if (balance <= 0) continue;

      const daysPastDue = Math.floor((todayUtc - utcDay(invoice.dueDate)) / DAY_MS);

      totalOutstanding += balance;

      const bucket = bucketFor(daysPastDue);
      buckets[bucket].balance += balance;
      buckets[bucket].count += 1;

      if (daysPastDue > 0) {
        overdueAmount += balance;

        const existing = chaseMap.get(invoice.customerId);
        if (existing) {
          existing.overdue_amount += balance;
          existing.max_days_late = Math.max(existing.max_days_late, daysPastDue);
        } else {
          chaseMap.set(invoice.customerId, {
            customer_id: invoice.customerId,
            customer_name: invoice.customer.parentName,
            overdue_amount: balance,
            max_days_late: daysPastDue,
          });
        }
      }
    }

    const chase_table: ChaseRow[] = Array.from(chaseMap.values())
      .map((row) => ({
        customer_id: row.customer_id,
        customer_name: row.customer_name,
        overdue_amount: round2(row.overdue_amount),
        max_days_late: row.max_days_late,
        rank_score: round2(row.overdue_amount * row.max_days_late),
      }))
      .sort((a, b) => b.rank_score - a.rank_score);

    const openingCash = profile?.openingCashBalance.toNumber() ?? 0;
    const allPayments = paymentTotal._sum.amount?.toNumber() ?? 0;
    const paidBills = paidBillTotal._sum.amount?.toNumber() ?? 0;
    const cashInHand = round2(openingCash + allPayments - paidBills);

    const collectedThisMonth = round2(collectedAgg._sum.amount?.toNumber() ?? 0);

    const aging_buckets = BUCKET_ORDER.map((bucket) => ({
      bucket,
      balance: round2(buckets[bucket].balance),
      count: buckets[bucket].count,
    }));

    return NextResponse.json({
      dashboard: {
        total_outstanding: round2(totalOutstanding),
        overdue_amount: round2(overdueAmount),
        collected_this_month: collectedThisMonth,
        cash_in_hand: cashInHand,
        aging_buckets,
        chase_table,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
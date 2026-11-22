import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const BAD_DAY_THRESHOLD = 5;
const TOP_N = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Today's IST calendar date as a UTC-midnight timestamp (matches @db.Date values). */
function istTodayUtcMidnight(): number {
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  return Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
}

/** Normalises a @db.Date timestamp to its UTC-midnight calendar date. */
function dateOnlyUtc(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function toMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

interface CustomerAccumulator {
  customerId: string;
  customerName: string;
  overdueAmount: number;
  maxDaysLate: number;
}

export async function GET() {
  try {
    const today = istTodayUtcMidnight();

    const invoices = await db.invoice.findMany({
      where: { status: { in: ['overdue', 'partial'] } },
      include: {
        customer: { select: { id: true, parentName: true } },
        payments: { select: { amount: true } },
      },
    });

    const byCustomer = new Map<string, CustomerAccumulator>();

    for (const invoice of invoices) {
      const paid = invoice.payments.reduce(
        (sum, p) => sum + Number(p.amount.toString()),
        0,
      );
      const balance = toMoney(Number(invoice.totalAmount.toString()) - paid);

      // Only unpaid balances count as late.
      if (balance <= 0) continue;

      const daysLate = Math.max(
        0,
        Math.floor((today - dateOnlyUtc(invoice.dueDate)) / DAY_MS),
      );

      // A partial invoice counts only once its due date is before today.
      if (invoice.status === 'partial' && daysLate <= 0) continue;

      const existing = byCustomer.get(invoice.customerId);
      if (existing) {
        existing.overdueAmount = toMoney(existing.overdueAmount + balance);
        existing.maxDaysLate = Math.max(existing.maxDaysLate, daysLate);
      } else {
        byCustomer.set(invoice.customerId, {
          customerId: invoice.customerId,
          customerName: invoice.customer.parentName,
          overdueAmount: balance,
          maxDaysLate: daysLate,
        });
      }
    }

    const scored = Array.from(byCustomer.values()).map((a) => ({
      customer_id: a.customerId,
      customer_name: a.customerName,
      overdue_amount: toMoney(a.overdueAmount),
      days_late: a.maxDaysLate,
      score: toMoney(a.overdueAmount * a.maxDaysLate),
    }));

    scored.sort(
      (a, b) => b.score - a.score || b.overdue_amount - a.overdue_amount,
    );

    const lateCustomerCount = scored.length;
    const isActive = lateCustomerCount >= BAD_DAY_THRESHOLD;

    const ranked = isActive ? scored : [];
    const estimatedRecovery = isActive
      ? toMoney(
          ranked
            .slice(0, TOP_N)
            .reduce((sum, r) => sum + r.overdue_amount, 0),
        )
      : 0;

    return NextResponse.json({
      is_active: isActive,
      late_customer_count: lateCustomerCount,
      ranked,
      estimated_recovery: estimatedRecovery,
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
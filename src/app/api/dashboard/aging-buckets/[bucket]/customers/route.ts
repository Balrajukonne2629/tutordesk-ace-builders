
import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { db } from '@/lib/db';

type BucketKey = 'not_due' | '1-7' | '8-30' | '30+';

const BUCKET_KEYS: readonly BucketKey[] = ['not_due', '1-7', '8-30', '30+'];

const DAY_MS = 24 * 60 * 60 * 1000;

function isBucketKey(value: string): value is BucketKey {
  return (BUCKET_KEYS as readonly string[]).includes(value);
}

// Today's calendar date in India Standard Time, as a UTC-midnight Date so it
// compares cleanly with Prisma @db.Date values.
function istToday(): Date {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
}

function bucketFor(daysPastDue: number): BucketKey {
  if (daysPastDue <= 0) return 'not_due';
  if (daysPastDue <= 7) return '1-7';
  if (daysPastDue <= 30) return '8-30';
  return '30+';
}

function toCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function GET(
  request: Request,
  { params }: { params: { bucket: string } }
) {
  try {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bucket = params.bucket;
    if (!isBucketKey(bucket)) {
      return NextResponse.json({ error: 'Unknown aging bucket' }, { status: 400 });
    }

    const today = istToday();

    const invoices = await db.invoice.findMany({
      where: {
        status: { in: ['sent', 'partial', 'overdue'] },
      },
      include: {
        customer: {
          select: { id: true, parentName: true, studentName: true },
        },
        payments: {
          select: { amount: true },
        },
      },
    });

    type Row = {
      customer_id: string;
      customer_name: string;
      student_name: string;
      balance: number;
      days_past_due: number;
      invoice_count: number;
    };

    const byCustomer = new Map<string, Row>();

    for (const invoice of invoices) {
      const paid = invoice.payments.reduce(
        (sum, payment) => sum + Number(payment.amount.toString()),
        0
      );
      const total = Number(invoice.totalAmount.toString());
      const balance = toCents(total - paid);
      if (balance <= 0) continue;

      const dueDate = new Date(
        Date.UTC(
          invoice.dueDate.getUTCFullYear(),
          invoice.dueDate.getUTCMonth(),
          invoice.dueDate.getUTCDate()
        )
      );
      const daysPastDue = Math.round((today.getTime() - dueDate.getTime()) / DAY_MS);

      if (bucketFor(daysPastDue) !== bucket) continue;

      const existing = byCustomer.get(invoice.customerId);
      if (existing) {
        existing.balance = toCents(existing.balance + balance);
        existing.days_past_due = Math.max(existing.days_past_due, daysPastDue);
        existing.invoice_count += 1;
      } else {
        byCustomer.set(invoice.customerId, {
          customer_id: invoice.customer.id,
          customer_name: invoice.customer.parentName,
          student_name: invoice.customer.studentName,
          balance,
          days_past_due: daysPastDue,
          invoice_count: 1,
        });
      }
    }

    const customers = Array.from(byCustomer.values()).sort(
      (a, b) => b.balance - a.balance || b.days_past_due - a.days_past_due
    );

    return NextResponse.json({ bucket, customers });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
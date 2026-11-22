import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import type { Bill as PrismaBill } from '@prisma/client';
import { db } from '@/lib/db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const INDIAN_DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

class BillAlreadyPaidError extends Error {}

type RouteContext = { params: { billId: string } };

function parseCalendarDate(input: string): string | null {
  let y: number;
  let m: number;
  let d: number;
  const iso = ISO_DATE_RE.exec(input);
  const indian = INDIAN_DATE_RE.exec(input);
  if (iso) {
    y = Number(iso[1]);
    m = Number(iso[2]);
    d = Number(iso[3]);
  } else if (indian) {
    d = Number(indian[1]);
    m = Number(indian[2]);
    y = Number(indian[3]);
  } else {
    return null;
  }
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt.toISOString().slice(0, 10);
}

// Current calendar date in India Standard Time, as YYYY-MM-DD.
function istTodayIso(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Same day of the following month, clamped to that month's last day.
function nextMonthSameDay(due: Date): Date {
  const y = due.getUTCFullYear();
  const m = due.getUTCMonth();
  const day = due.getUTCDate();
  const lastDayOfTargetMonth = new Date(Date.UTC(y, m + 2, 0)).getUTCDate();
  return new Date(Date.UTC(y, m + 1, Math.min(day, lastDayOfTargetMonth)));
}

function toWireBill(bill: PrismaBill) {
  return {
    id: bill.id,
    createdAt: bill.createdAt.toISOString(),
    updatedAt: bill.updatedAt.toISOString(),
    name: bill.name,
    category: bill.category,
    amount: Number(bill.amount),
    dueDate: bill.dueDate.toISOString().slice(0, 10),
    isRecurring: bill.isRecurring,
    status: bill.status,
    paidOn: bill.paidOn ? bill.paidOn.toISOString().slice(0, 10) : null,
    isDemo: bill.isDemo,
  };
}

export async function POST(request: Request, { params }: RouteContext) {
  const billId = params.billId;

  if (!UUID_RE.test(billId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rawPaidOn =
    typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>).paid_on
      : undefined;

  if (typeof rawPaidOn !== 'string' || rawPaidOn.trim() === '') {
    return NextResponse.json(
      { error: 'Enter the date the bill was paid.' },
      { status: 400 },
    );
  }

  const paidOnIso = parseCalendarDate(rawPaidOn.trim());
  if (!paidOnIso) {
    return NextResponse.json(
      { error: 'Enter a valid date in DD/MM/YYYY format.' },
      { status: 400 },
    );
  }

  if (paidOnIso > istTodayIso()) {
    return NextResponse.json(
      { error: 'The paid-on date cannot be in the future.' },
      { status: 400 },
    );
  }

  try {
    const existing = await db.bill.findUnique({ where: { id: billId } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (existing.status === 'paid') {
      return NextResponse.json(
        { error: 'This bill is already paid.' },
        { status: 409 },
      );
    }

    const paidOn = new Date(`${paidOnIso}T00:00:00.000Z`);

    const bill = await db.$transaction(async (tx) => {
      // Claim the row atomically: only an unpaid bill can be marked paid.
      const claim = await tx.bill.updateMany({
        where: { id: billId, status: 'unpaid' },
        data: { status: 'paid', paidOn },
      });
      if (claim.count === 0) {
        throw new BillAlreadyPaidError();
      }

      const updated = await tx.bill.findUniqueOrThrow({
        where: { id: billId },
      });

      if (updated.isRecurring) {
        await tx.bill.create({
          data: {
            name: updated.name,
            category: updated.category,
            amount: updated.amount,
            dueDate: nextMonthSameDay(updated.dueDate),
            isRecurring: true,
            status: 'unpaid',
            paidOn: null,
            isDemo: updated.isDemo,
          },
        });
      }

      return updated;
    });

    return NextResponse.json({ bill: toWireBill(bill) });
  } catch (e) {
    if (e instanceof BillAlreadyPaidError) {
      return NextResponse.json(
        { error: 'This bill is already paid.' },
        { status: 409 },
      );
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
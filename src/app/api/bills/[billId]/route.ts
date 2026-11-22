import { NextResponse } from 'next/server';
import { Prisma, BillCategory } from '@prisma/client';
import type { Bill as PrismaBill } from '@prisma/client';
import { db } from '@/lib/db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NAME_MAX_LENGTH = 60;
const AMOUNT_MAX = 1000000;
const CATEGORIES: readonly string[] = Object.values(BillCategory);

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toBillJson(bill: PrismaBill) {
  return {
    id: bill.id,
    createdAt: bill.createdAt.toISOString(),
    updatedAt: bill.updatedAt.toISOString(),
    name: bill.name,
    category: bill.category,
    amount: Number(bill.amount),
    dueDate: isoDate(bill.dueDate),
    isRecurring: bill.isRecurring,
    status: bill.status,
    paidOn: bill.paidOn ? isoDate(bill.paidOn) : null,
    isDemo: bill.isDemo,
  };
}

function isNotFoundError(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025';
}

/**
 * Accepts ISO `YYYY-MM-DD` or Indian `DD/MM/YYYY`. Returns a UTC-midnight Date
 * (the column is @db.Date) or null when the value is not a real calendar date.
 */
function parseCalendarDate(value: string): Date | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);

  let year: number;
  let month: number;
  let day: number;

  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (dmy) {
    day = Number(dmy[1]);
    month = Number(dmy[2]);
    year = Number(dmy[3]);
  } else {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export async function GET(
  _request: Request,
  { params }: { params: { billId: string } }
) {
  const billId = params.billId;
  if (!UUID_RE.test(billId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const bill = await db.bill.findUnique({ where: { id: billId } });
    if (!bill) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ bill: toBillJson(bill) });
  } catch (e) {
    console.error('GET /api/bills/[billId] failed', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { billId: string } }
) {
  const billId = params.billId;
  if (!UUID_RE.test(billId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return NextResponse.json(
      { error: 'Request body must be an object.' },
      { status: 400 }
    );
  }
  const body = raw as Record<string, unknown>;

  // status and paidOn are deliberately ignored here: they change only via mark-paid.
  const updates: Prisma.BillUpdateInput = {};

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim() === '') {
      return NextResponse.json(
        { error: 'Please enter a name for this bill.' },
        { status: 400 }
      );
    }
    const name = body.name.trim();
    if (name.length > NAME_MAX_LENGTH) {
      return NextResponse.json(
        { error: 'Bill name must be 60 characters or fewer.' },
        { status: 400 }
      );
    }
    updates.name = name;
  }

  if (body.category !== undefined) {
    if (typeof body.category !== 'string' || !CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { error: 'Choose a valid bill category.' },
        { status: 400 }
      );
    }
    updates.category = body.category as BillCategory;
  }

  if (body.amount !== undefined) {
    const amount =
      typeof body.amount === 'number'
        ? body.amount
        : typeof body.amount === 'string' && body.amount.trim() !== ''
          ? Number(body.amount)
          : Number.NaN;
    if (!Number.isFinite(amount) || amount <= 0 || amount > AMOUNT_MAX) {
      return NextResponse.json(
        { error: 'Enter an amount between Rs 1 and Rs 10,00,000.' },
        { status: 400 }
      );
    }
    updates.amount = amount;
  }

  if (body.dueDate !== undefined) {
    if (typeof body.dueDate !== 'string' || body.dueDate.trim() === '') {
      return NextResponse.json(
        { error: 'Please pick a due date for this bill.' },
        { status: 400 }
      );
    }
    const dueDate = parseCalendarDate(body.dueDate.trim());
    if (!dueDate) {
      return NextResponse.json(
        { error: 'Enter a valid date in DD/MM/YYYY format.' },
        { status: 400 }
      );
    }
    updates.dueDate = dueDate;
  }

  if (body.isRecurring !== undefined) {
    if (typeof body.isRecurring !== 'boolean') {
      return NextResponse.json(
        { error: 'isRecurring must be true or false.' },
        { status: 400 }
      );
    }
    updates.isRecurring = body.isRecurring;
  }

  try {
    const bill = await db.bill.update({ where: { id: billId }, data: updates });
    return NextResponse.json({ bill: toBillJson(bill) });
  } catch (e) {
    if (isNotFoundError(e)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error('PATCH /api/bills/[billId] failed', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { billId: string } }
) {
  const billId = params.billId;
  if (!UUID_RE.test(billId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    await db.bill.delete({ where: { id: billId } });
    return NextResponse.json({ deleted: true });
  } catch (e) {
    if (isNotFoundError(e)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error('DELETE /api/bills/[billId] failed', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import type { Bill as BillRow } from '@prisma/client';
import { db } from '@/lib/db';

const NAME_MAX_LENGTH = 60;
const AMOUNT_MIN = 1;
const AMOUNT_MAX = 1000000;
const CATEGORIES = ['rent', 'internet', 'materials', 'other'] as const;
type BillCategoryValue = (typeof CATEGORIES)[number];

function toDateOnly(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

function serializeBill(row: BillRow) {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    name: row.name,
    category: row.category,
    amount: row.amount.toNumber(),
    dueDate: toDateOnly(row.dueDate),
    isRecurring: row.isRecurring,
    status: row.status,
    paidOn: toDateOnly(row.paidOn),
    isDemo: row.isDemo,
  };
}

/**
 * Accepts Indian style DD/MM/YYYY (primary) and YYYY-MM-DD (wire format).
 * Returns a UTC midnight Date for a real calendar date, or null otherwise.
 */
function parseBillDate(raw: string): Date | null {
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!dmy && !iso) return null;

  const year = dmy ? Number(dmy[3]) : Number(iso![1]);
  const month = dmy ? Number(dmy[2]) : Number(iso![2]);
  const day = dmy ? Number(dmy[1]) : Number(iso![3]);

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

function parseAmount(raw: unknown): number | null {
  let value: number;
  if (typeof raw === 'number') {
    value = raw;
  } else if (typeof raw === 'string') {
    const cleaned = raw.replace(/[,\s]/g, '').replace(/^(Rs\.?|₹)/i, '');
    if (cleaned === '' || !/^\d+(\.\d+)?$/.test(cleaned)) return null;
    value = Number(cleaned);
  } else {
    return null;
  }
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

export async function GET() {
  try {
    const rows = await db.bill.findMany({
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });

    // Unpaid bills first (by due date), then paid bills (by due date).
    const sorted = [...rows].sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'unpaid' ? -1 : 1;
      }
      return a.dueDate.getTime() - b.dueDate.getTime();
    });

    return NextResponse.json({ bills: sorted.map(serializeBill) });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const input = body as Record<string, unknown>;

  // Name
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name) {
    return NextResponse.json(
      { error: 'Please enter a name for this bill.' },
      { status: 400 },
    );
  }
  if (name.length > NAME_MAX_LENGTH) {
    return NextResponse.json(
      { error: 'Bill name must be 60 characters or fewer.' },
      { status: 400 },
    );
  }

  // Amount
  const amount = parseAmount(input.amount);
  if (amount === null || amount < AMOUNT_MIN || amount > AMOUNT_MAX) {
    return NextResponse.json(
      { error: 'Enter an amount between Rs 1 and Rs 10,00,000.' },
      { status: 400 },
    );
  }

  // Due date
  if (input.dueDate === undefined || input.dueDate === null || input.dueDate === '') {
    return NextResponse.json(
      { error: 'Please pick a due date for this bill.' },
      { status: 400 },
    );
  }
  if (typeof input.dueDate !== 'string') {
    return NextResponse.json(
      { error: 'Enter a valid date in DD/MM/YYYY format.' },
      { status: 400 },
    );
  }
  const dueDate = parseBillDate(input.dueDate.trim());
  if (!dueDate) {
    return NextResponse.json(
      { error: 'Enter a valid date in DD/MM/YYYY format.' },
      { status: 400 },
    );
  }

  // Category (optional, defaults to other)
  let category: BillCategoryValue = 'other';
  if (input.category !== undefined && input.category !== null) {
    if (!CATEGORIES.includes(input.category as BillCategoryValue)) {
      return NextResponse.json(
        { error: 'Choose a valid bill category.' },
        { status: 400 },
      );
    }
    category = input.category as BillCategoryValue;
  }

  // Recurrence (optional, defaults to false)
  let isRecurring = false;
  if (input.isRecurring !== undefined && input.isRecurring !== null) {
    if (typeof input.isRecurring !== 'boolean') {
      return NextResponse.json(
        { error: 'isRecurring must be true or false.' },
        { status: 400 },
      );
    }
    isRecurring = input.isRecurring;
  }

  try {
    const bill = await db.bill.create({
      data: {
        name,
        category,
        amount,
        dueDate,
        isRecurring,
        status: 'unpaid',
        paidOn: null,
      },
    });

    return NextResponse.json({ bill: serializeBill(bill) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
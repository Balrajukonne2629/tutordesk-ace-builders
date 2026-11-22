import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import type { Customer, Payment } from '@prisma/client';
import { db } from '@/lib/db';

type RouteContext = { params: Promise<{ customerId: string }> };
type Check<T> = { ok: true; value: T } | { ok: false; error: string };

type PaymentRow = { amount: Prisma.Decimal; receivedOn: Date };
type InvoiceRow = {
  status: string;
  issuedDate: Date;
  billingMonth: Date | null;
  dueDate: Date;
  totalAmount: Prisma.Decimal;
  payments: PaymentRow[];
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY_MS = 86_400_000;
const IST_OFFSET_MS = (5 * 60 + 30) * 60_000;
const OPEN_STATUSES = ['sent', 'partial', 'overdue'];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Today's IST calendar date as UTC midnight, matching how @db.Date columns are stored. */
function istToday(): Date {
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
}

/** Whole days from `from` to `to`; positive when `to` is later. */
function dayDiff(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function paidAmount(inv: InvoiceRow): number {
  return round2(inv.payments.reduce((sum, p) => sum + Number(p.amount), 0));
}

function totalOf(inv: InvoiceRow): number {
  return round2(Number(inv.totalAmount));
}

function openBalance(inv: InvoiceRow): number {
  return Math.max(0, round2(totalOf(inv) - paidAmount(inv)));
}

/** Status refreshed against today: unpaid balances past due date read as overdue. */
function effectiveStatus(inv: InvoiceRow, today: Date): string {
  if (inv.status === 'draft') return 'draft';
  const total = totalOf(inv);
  if (total <= 0) return inv.status;
  if (openBalance(inv) <= 0) return 'paid';
  if (inv.dueDate.getTime() < today.getTime()) return 'overdue';
  return paidAmount(inv) > 0 ? 'partial' : 'sent';
}

function agingBucket(status: string, dueDate: Date, today: Date): string {
  if (status === 'draft' || status === 'paid') return status;
  const days = dayDiff(dueDate, today);
  if (days <= 0) return 'not_due';
  if (days <= 7) return '1-7';
  if (days <= 30) return '8-30';
  return '30+';
}

function finalPaymentDate(inv: InvoiceRow): Date | null {
  let latest: Date | null = null;
  for (const p of inv.payments) {
    if (!latest || p.receivedOn.getTime() > latest.getTime()) latest = p.receivedOn;
  }
  return latest;
}

/** Mean of max(0, final payment date - due date) over the last three fully paid invoices. */
function averageDaysLate(invoices: InvoiceRow[], today: Date): number | null {
  const paid = invoices
    .filter((inv) => effectiveStatus(inv, today) === 'paid')
    .map((inv) => ({ inv, finalDate: finalPaymentDate(inv) }))
    .filter((x): x is { inv: InvoiceRow; finalDate: Date } => x.finalDate !== null)
    .sort((a, b) => b.finalDate.getTime() - a.finalDate.getTime())
    .slice(0, 3);

  if (paid.length === 0) return null;
  const total = paid.reduce((sum, x) => sum + Math.max(0, dayDiff(x.inv.dueDate, x.finalDate)), 0);
  return Math.round((total / paid.length) * 10) / 10;
}

/** Six markers, oldest to newest, from six months ago through the current month. */
function habitMarkers(invoices: InvoiceRow[], today: Date) {
  const markers: { month: string; marker: string }[] = [];

  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
    const key = monthKey(monthStart);
    const inv = invoices.find(
      (x) => x.status !== 'draft' && monthKey(x.billingMonth ?? x.issuedDate) === key,
    );

    let marker: string;
    if (!inv) {
      marker = 'none';
    } else if (openBalance(inv) <= 0) {
      const finalDate = finalPaymentDate(inv);
      marker = !finalDate || finalDate.getTime() <= inv.dueDate.getTime() ? 'on_time' : 'late';
    } else {
      marker = inv.dueDate.getTime() < today.getTime() ? 'missed' : 'pending';
    }

    markers.push({ month: key, marker });
  }

  return markers;
}

function serializeCustomer(c: Customer) {
  return { ...c, monthlyFee: round2(Number(c.monthlyFee)) };
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

function handleWriteError(e: unknown) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }
  return NextResponse.json({ error: 'Internal error' }, { status: 500 });
}

function checkText(
  raw: unknown,
  min: number,
  max: number,
  emptyMsg: string,
  lengthMsg: string,
): Check<string> {
  if (typeof raw !== 'string' || raw.trim() === '') return { ok: false, error: emptyMsg };
  const value = raw.trim();
  if (value.length < min || value.length > max) return { ok: false, error: lengthMsg };
  return { ok: true, value };
}

function checkPhone(raw: unknown): Check<string> {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return { ok: false, error: 'Please enter a phone number.' };
  }
  let digits = raw.replace(/[\s-]/g, '');
  if (digits.startsWith('+91')) digits = digits.slice(3);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return { ok: false, error: 'Enter a valid 10-digit mobile number starting with 6 to 9.' };
  }
  return { ok: true, value: digits };
}

function parseWhole(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') return Number(raw.replace(/,/g, '').trim());
  return Number.NaN;
}

function checkFee(raw: unknown): Check<number> {
  if (raw === undefined || raw === null || raw === '') {
    return { ok: false, error: 'Please enter the monthly fee.' };
  }
  const n = parseWhole(raw);
  if (!Number.isInteger(n) || n < 1 || n > 100000) {
    return { ok: false, error: 'Monthly fee must be a whole number between Rs 1 and Rs 1,00,000.' };
  }
  return { ok: true, value: n };
}

function checkBillingDay(raw: unknown): Check<number> {
  if (raw === undefined || raw === null || raw === '') {
    return { ok: false, error: 'Please choose the billing day of the month.' };
  }
  const n = parseWhole(raw);
  if (!Number.isInteger(n) || n < 1 || n > 28) {
    return { ok: false, error: 'Billing day must be between 1 and 28.' };
  }
  return { ok: true, value: n };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { customerId } = await params;
  if (!UUID_RE.test(customerId)) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  try {
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      include: {
        invoices: {
          orderBy: [{ issuedDate: 'asc' }, { createdAt: 'asc' }],
          include: { payments: { orderBy: { receivedOn: 'asc' } } },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const today = istToday();
    const { invoices: invoiceRows, ...customerRow } = customer;

    const invoices = invoiceRows.map((inv) => {
      const { payments, ...invoiceFields } = inv;
      const status = effectiveStatus(inv, today);
      return {
        invoice: { ...invoiceFields, totalAmount: totalOf(inv), status },
        aging_bucket: agingBucket(status, inv.dueDate, today),
        payments: payments.map((p: Payment) => ({ ...p, amount: round2(Number(p.amount)) })),
      };
    });

    const outstandingTotal = round2(
      invoiceRows
        .filter((inv) => OPEN_STATUSES.includes(effectiveStatus(inv, today)))
        .reduce((sum, inv) => sum + openBalance(inv), 0),
    );

    return NextResponse.json({
      customer: serializeCustomer(customerRow as Customer),
      outstanding_total: outstandingTotal,
      average_days_late: averageDaysLate(invoiceRows, today),
      invoices,
      habit_markers: habitMarkers(invoiceRows, today),
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { customerId } = await params;
  if (!UUID_RE.test(customerId)) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return badRequest('Invalid JSON body');
  }
  const input = body as Record<string, unknown>;

  const update: Prisma.CustomerUpdateInput = {};
  let phone: string | undefined;

  if (input.parentName !== undefined) {
    const r = checkText(
      input.parentName,
      2,
      60,
      "Please enter the parent's name.",
      'Parent name should be between 2 and 60 characters.',
    );
    if (!r.ok) return badRequest(r.error);
    update.parentName = r.value;
  }

  if (input.studentName !== undefined) {
    const r = checkText(
      input.studentName,
      2,
      60,
      "Please enter the student's name.",
      'Student name should be between 2 and 60 characters.',
    );
    if (!r.ok) return badRequest(r.error);
    update.studentName = r.value;
  }

  if (input.phone !== undefined) {
    const r = checkPhone(input.phone);
    if (!r.ok) return badRequest(r.error);
    phone = r.value;
  }

  if (input.subject !== undefined) {
    const r = checkText(
      input.subject,
      2,
      40,
      'Please enter the subject being taught.',
      'Subject should be between 2 and 40 characters.',
    );
    if (!r.ok) return badRequest(r.error);
    update.subject = r.value;
  }

  if (input.monthlyFee !== undefined) {
    const r = checkFee(input.monthlyFee);
    if (!r.ok) return badRequest(r.error);
    update.monthlyFee = r.value;
  }

  if (input.billingDay !== undefined) {
    const r = checkBillingDay(input.billingDay);
    if (!r.ok) return badRequest(r.error);
    update.billingDay = r.value;
  }

  if (input.isActive !== undefined) {
    if (typeof input.isActive !== 'boolean') {
      return badRequest('Active flag must be true or false.');
    }
    update.isActive = input.isActive;
  }

  if (Object.keys(update).length === 0 && phone === undefined) {
    return badRequest('No changes to save.');
  }

  try {
    if (phone !== undefined) {
      const clash = await db.customer.findFirst({
        where: { phone, id: { not: customerId } },
        select: { id: true },
      });
      if (clash) {
        return NextResponse.json(
          { error: 'This phone number is already used by another customer.' },
          { status: 409 },
        );
      }
      update.phone = phone;
    }

    // A changed fee or billing day only affects invoices generated from now on;
    // issued invoices are not touched here.
    const customer = await db.customer.update({
      where: { id: customerId },
      data: update,
    });

    return NextResponse.json({ customer: serializeCustomer(customer) });
  } catch (e) {
    return handleWriteError(e);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { customerId } = await params;
  if (!UUID_RE.test(customerId)) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  try {
    const existing = await db.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const [invoiceCount, paymentCount] = await Promise.all([
      db.invoice.count({ where: { customerId } }),
      db.payment.count({ where: { customerId } }),
    ]);

    if (invoiceCount > 0 || paymentCount > 0) {
      return NextResponse.json(
        {
          error:
            'This customer has invoices or payments, so they cannot be deleted. Deactivate them instead.',
        },
        { status: 409 },
      );
    }

    await db.customer.delete({ where: { id: customerId } });
    return NextResponse.json({ deleted: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
      return NextResponse.json(
        {
          error:
            'This customer is still linked to alerts or reminders and cannot be deleted. Deactivate them instead.',
        },
        { status: 409 },
      );
    }
    return handleWriteError(e);
  }
}
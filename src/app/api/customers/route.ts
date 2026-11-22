import { NextResponse } from 'next/server';
import type { Customer as CustomerRecord, InvoiceStatus, Prisma } from '@prisma/client';
import { db } from '@/lib/db';

const OPEN_STATUSES: InvoiceStatus[] = ['sent', 'partial', 'overdue'];
const SEARCH_MAX_LENGTH = 100;

type ValidationResult =
  | { data: CustomerCreateInput }
  | { error: string };

type CustomerCreateInput = {
  parentName: string;
  studentName: string;
  phone: string;
  subject: string;
  monthlyFee: number;
  billingDay: number;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function serializeCustomer(c: CustomerRecord) {
  return {
    id: c.id,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    parentName: c.parentName,
    studentName: c.studentName,
    phone: c.phone,
    subject: c.subject,
    monthlyFee: c.monthlyFee.toNumber(),
    billingDay: c.billingDay,
    isActive: c.isActive,
    isDemo: c.isDemo,
  };
}

function openBalance(
  invoices: { totalAmount: Prisma.Decimal; payments: { amount: Prisma.Decimal }[] }[],
): number {
  let total = 0;
  for (const invoice of invoices) {
    const paid = invoice.payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
    const remaining = invoice.totalAmount.toNumber() - paid;
    if (remaining > 0) total += remaining;
  }
  return round2(total);
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizePhone(raw: string): string {
  const stripped = raw.replace(/[\s-]/g, '');
  return stripped.replace(/^(\+91|0)/, '');
}

function validateCustomerInput(body: Record<string, unknown>): ValidationResult {
  const parentName = readText(body.parentName ?? body.parent_name);
  if (parentName === '') return { error: "Please enter the parent's name." };
  if (parentName.length < 2 || parentName.length > 60) {
    return { error: 'Parent name should be between 2 and 60 characters.' };
  }

  const studentName = readText(body.studentName ?? body.student_name);
  if (studentName === '') return { error: "Please enter the student's name." };
  if (studentName.length < 2 || studentName.length > 60) {
    return { error: 'Student name should be between 2 and 60 characters.' };
  }

  const rawPhone = readText(body.phone);
  if (rawPhone === '') return { error: 'Please enter a phone number.' };
  const phone = normalizePhone(rawPhone);
  if (!/^[6-9]\d{9}$/.test(phone)) {
    return { error: 'Enter a valid 10-digit mobile number starting with 6 to 9.' };
  }

  const subject = readText(body.subject);
  if (subject === '') return { error: 'Please enter the subject being taught.' };
  if (subject.length < 2 || subject.length > 40) {
    return { error: 'Subject should be between 2 and 40 characters.' };
  }

  const monthlyFeeRaw = readNumber(body.monthlyFee ?? body.monthly_fee);
  if (monthlyFeeRaw === null) return { error: 'Please enter the monthly fee.' };
  if (!Number.isInteger(monthlyFeeRaw) || monthlyFeeRaw < 500 || monthlyFeeRaw > 20000) {
    return { error: 'Monthly fee must be a whole number between Rs 500 and Rs 20,000.' };
  }

  const billingDayRaw = readNumber(body.billingDay ?? body.billing_day);
  if (billingDayRaw === null) {
    return { error: 'Please choose the billing day of the month.' };
  }
  if (!Number.isInteger(billingDayRaw) || billingDayRaw < 1 || billingDayRaw > 28) {
    return { error: 'Billing day must be between 1 and 28.' };
  }

  return {
    data: {
      parentName,
      studentName,
      phone,
      subject,
      monthlyFee: monthlyFeeRaw,
      billingDay: billingDayRaw,
    },
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const q = (searchParams.get('q') ?? '').trim();
  if (q.length > SEARCH_MAX_LENGTH) {
    return NextResponse.json(
      { error: 'Search is limited to 100 characters. Try a shorter name.' },
      { status: 400 },
    );
  }

  const activeParam = searchParams.get('active');
  const active = activeParam === 'true' ? true : activeParam === 'false' ? false : undefined;

  const where: Prisma.CustomerWhereInput = {};
  if (q !== '') {
    where.OR = [
      { parentName: { contains: q, mode: 'insensitive' } },
      { studentName: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q } },
    ];
  }
  if (active !== undefined) {
    where.isActive = active;
  }

  try {
    const customers = await db.customer.findMany({
      where,
      orderBy: [{ parentName: 'asc' }],
      include: {
        invoices: {
          where: { status: { in: OPEN_STATUSES } },
          include: { payments: { select: { amount: true } } },
        },
      },
    });

    const result = customers.map((c) => ({
      ...serializeCustomer(c),
      current_balance: openBalance(c.invoices),
    }));

    return NextResponse.json({ customers: result });
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

  const validation = validateCustomerInput(body as Record<string, unknown>);
  if ('error' in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const input = validation.data;

  try {
    const duplicate = await db.customer.findFirst({
      where: { phone: input.phone },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: 'This phone number is already used by another customer.' },
        { status: 400 },
      );
    }

    const customer = await db.customer.create({
      data: {
        parentName: input.parentName,
        studentName: input.studentName,
        phone: input.phone,
        subject: input.subject,
        monthlyFee: input.monthlyFee,
        billingDay: input.billingDay,
        isActive: true,
        isDemo: false,
      },
    });

    return NextResponse.json({ customer: serializeCustomer(customer) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
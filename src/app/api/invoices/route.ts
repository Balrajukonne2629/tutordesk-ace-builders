import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

const STATUS_FILTERS = ['draft', 'sent', 'partial', 'paid', 'overdue'] as const;
type InvoiceStatusValue = (typeof STATUS_FILTERS)[number];

const STATUS_ERROR = 'Choose a valid status: All, Draft, Sent, Partial, Paid, or Overdue.';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const BILLING_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const invoiceInclude = {
  customer: { select: { parentName: true } },
  payments: { select: { amount: true } },
} as const;

type InvoiceWithRelations = Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>;

interface ParsedLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface ParsedInvoiceInput {
  customerId: string;
  issuedDate: string;
  dueDate: string;
  billingMonth: string | null;
  lines: ParsedLineItem[];
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toMoney(value: { toString(): string }): number {
  return round2(Number(value.toString()));
}

// Indian calendar day (UTC+05:30), as YYYY-MM-DD.
function istTodayIso(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function dateOnly(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function isValidIsoDate(value: string): boolean {
  return ISO_DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function sumPayments(payments: { amount: { toString(): string } }[]): number {
  return round2(payments.reduce((sum, payment) => sum + toMoney(payment.amount), 0));
}

function deriveStatus(
  current: string,
  totalAmount: number,
  paidAmount: number,
  dueIso: string,
  today: string,
): InvoiceStatusValue {
  if (current === 'draft') return 'draft';
  const outstanding = round2(totalAmount - paidAmount);
  if (outstanding <= 0) return 'paid';
  if (dueIso < today) return 'overdue';
  return paidAmount > 0 ? 'partial' : 'sent';
}

// Recomputes status from payments and due date, persists any change, and returns resolved rows.
async function refreshStatuses(
  rows: InvoiceWithRelations[],
): Promise<{ row: InvoiceWithRelations; status: InvoiceStatusValue }[]> {
  const today = istTodayIso();
  const resolved: { row: InvoiceWithRelations; status: InvoiceStatusValue }[] = [];
  const updates: Prisma.PrismaPromise<unknown>[] = [];

  for (const row of rows) {
    const status = deriveStatus(
      row.status,
      toMoney(row.totalAmount),
      sumPayments(row.payments),
      toIsoDate(row.dueDate),
      today,
    );
    if (status !== row.status) {
      updates.push(
        db.invoice.update({
          where: { id: row.id },
          data: {
            status,
            paidAt: status === 'paid' ? row.paidAt ?? new Date() : null,
          },
        }),
      );
    }
    resolved.push({ row, status });
  }

  if (updates.length > 0) {
    await db.$transaction(updates);
  }

  return resolved;
}

function toInvoiceJson(row: InvoiceWithRelations, status: InvoiceStatusValue) {
  const total = toMoney(row.totalAmount);
  const paid = sumPayments(row.payments);
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    customerId: row.customerId,
    customerName: row.customer.parentName,
    billingMonth: row.billingMonth ? toIsoDate(row.billingMonth) : null,
    issuedDate: toIsoDate(row.issuedDate),
    dueDate: toIsoDate(row.dueDate),
    totalAmount: total,
    outstandingAmount: Math.max(0, round2(total - paid)),
    status,
    sentAt: row.sentAt ? row.sentAt.toISOString() : null,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
  };
}

function nextInvoiceNumber(lastNumber: string | null): string {
  const lastSequence = lastNumber ? parseInt(lastNumber.replace(/^INV-/, ''), 10) : 0;
  const safeLast = Number.isNaN(lastSequence) ? 0 : lastSequence;
  return `INV-${String(safeLast + 1).padStart(5, '0')}`;
}

function validateInvoiceInput(
  input: Record<string, unknown>,
  today: string,
): { ok: true; value: ParsedInvoiceInput } | { ok: false; error: string } {
  // Customer
  const customerId = typeof input.customer_id === 'string' ? input.customer_id.trim() : '';
  if (!customerId || !UUID_PATTERN.test(customerId)) {
    return { ok: false, error: 'Please select a customer for this invoice.' };
  }

  // Issued date (defaults to today)
  let issuedDate = today;
  if (input.issued_date !== undefined && input.issued_date !== null && input.issued_date !== '') {
    if (typeof input.issued_date !== 'string' || !isValidIsoDate(input.issued_date)) {
      return { ok: false, error: 'Please enter a valid issued date.' };
    }
    issuedDate = input.issued_date;
  }

  // Due date
  const dueRaw = typeof input.due_date === 'string' ? input.due_date.trim() : '';
  if (!dueRaw) {
    return { ok: false, error: 'Please enter a due date.' };
  }
  if (!isValidIsoDate(dueRaw)) {
    return { ok: false, error: 'Please enter a due date.' };
  }
  if (dueRaw < today) {
    return { ok: false, error: 'Due date cannot be in the past. Pick today or a later date.' };
  }
  if (dueRaw < issuedDate) {
    return { ok: false, error: 'Due date cannot be before the issued date.' };
  }

  // Billing month (optional, must not be in the future)
  let billingMonth: string | null = null;
  if (input.billing_month !== undefined && input.billing_month !== null && input.billing_month !== '') {
    if (typeof input.billing_month !== 'string' || !BILLING_MONTH_PATTERN.test(input.billing_month)) {
      return { ok: false, error: 'Please choose the month to bill before generating invoices.' };
    }
    const currentMonth = today.slice(0, 7);
    if (input.billing_month > currentMonth) {
      return {
        ok: false,
        error: "You can't bill a future month yet. Choose this month or an earlier one.",
      };
    }
    billingMonth = `${input.billing_month}-01`;
  }

  // Line items
  if (!Array.isArray(input.line_items) || input.line_items.length === 0) {
    return { ok: false, error: 'Add at least one line item before saving the invoice.' };
  }

  const lines: ParsedLineItem[] = [];
  for (const rawItem of input.line_items) {
    if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) {
      return { ok: false, error: 'Add at least one line item before saving the invoice.' };
    }
    const item = rawItem as Record<string, unknown>;

    const description = typeof item.description === 'string' ? item.description.trim() : '';
    if (!description) {
      return {
        ok: false,
        error: "Please describe what this line item is for, such as 'Maths tuition, November'.",
      };
    }
    if (description.length > 100) {
      return { ok: false, error: 'Description must be 100 characters or fewer.' };
    }

    let quantity = 1;
    if (item.quantity !== undefined && item.quantity !== null) {
      if (typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
        return { ok: false, error: 'Quantity must be a whole number between 1 and 99.' };
      }
      quantity = item.quantity;
    }

    const rawPrice =
      typeof item.unit_price === 'string' && item.unit_price.trim() !== ''
        ? Number(item.unit_price)
        : item.unit_price;
    if (typeof rawPrice !== 'number' || !Number.isFinite(rawPrice)) {
      return { ok: false, error: 'Please enter the amount in rupees for this line item.' };
    }
    if (rawPrice <= 0 || rawPrice > 100000) {
      return { ok: false, error: 'Amount must be more than Rs 0 and no more than Rs 1,00,000.' };
    }

    lines.push({ description, quantity, unitPrice: round2(rawPrice) });
  }

  return {
    ok: true,
    value: { customerId, issuedDate, dueDate: dueRaw, billingMonth, lines },
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawStatus = (url.searchParams.get('status') ?? '').trim().toLowerCase();
  const customerId = (url.searchParams.get('customer_id') ?? '').trim();

  let statusFilter: InvoiceStatusValue | null = null;
  if (rawStatus && rawStatus !== 'all') {
    if (!(STATUS_FILTERS as readonly string[]).includes(rawStatus)) {
      return NextResponse.json({ error: STATUS_ERROR }, { status: 400 });
    }
    statusFilter = rawStatus as InvoiceStatusValue;
  }

  if (customerId && !UUID_PATTERN.test(customerId)) {
    return NextResponse.json({ error: 'Please select a valid customer.' }, { status: 400 });
  }

  try {
    const rows = await db.invoice.findMany({
      where: customerId ? { customerId } : undefined,
      orderBy: [{ dueDate: 'asc' }, { invoiceNumber: 'asc' }],
      include: invoiceInclude,
    });

    const resolved = await refreshStatuses(rows);
    const visible = statusFilter
      ? resolved.filter((entry) => entry.status === statusFilter)
      : resolved;

    return NextResponse.json({
      invoices: visible.map((entry) => toInvoiceJson(entry.row, entry.status)),
    });
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

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const today = istTodayIso();
  const validation = validateInvoiceInput(body as Record<string, unknown>, today);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const input = validation.value;

  try {
    const customer = await db.customer.findUnique({
      where: { id: input.customerId },
      select: { id: true },
    });
    if (!customer) {
      return NextResponse.json({ error: 'Please select a customer for this invoice.' }, { status: 400 });
    }

    if (input.billingMonth) {
      const existing = await db.invoice.findFirst({
        where: { customerId: input.customerId, billingMonth: dateOnly(input.billingMonth) },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'This customer already has an invoice for that billing month.' },
          { status: 409 },
        );
      }
    }

    const lineRows = input.lines.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      amount: round2(line.quantity * line.unitPrice),
    }));
    const totalAmount = round2(lineRows.reduce((sum, line) => sum + line.amount, 0));

    let created: InvoiceWithRelations | null = null;
    for (let attempt = 0; attempt < 3 && !created; attempt++) {
      try {
        created = await db.$transaction(async (tx) => {
          const last = await tx.invoice.findFirst({
            orderBy: { invoiceNumber: 'desc' },
            select: { invoiceNumber: true },
          });
          const invoiceNumber = nextInvoiceNumber(last?.invoiceNumber ?? null);

          return tx.invoice.create({
            data: {
              invoiceNumber,
              customerId: input.customerId,
              billingMonth: input.billingMonth ? dateOnly(input.billingMonth) : null,
              issuedDate: dateOnly(input.issuedDate),
              dueDate: dateOnly(input.dueDate),
              totalAmount,
              status: 'draft',
              lineItems: { create: lineRows },
            },
            include: invoiceInclude,
          });
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          continue;
        }
        throw error;
      }
    }

    if (!created) {
      return NextResponse.json(
        { error: 'Another invoice was created at the same time. Please try again.' },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { invoice: toInvoiceJson(created, 'draft') },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
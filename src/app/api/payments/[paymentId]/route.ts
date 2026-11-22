import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import type { Customer, Invoice, Payment } from '@prisma/client';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

type PaymentMethodValue = 'upi' | 'cash' | 'bank';
type InvoiceStatusValue = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue';

type PaymentWithRelations = Payment & { customer: Customer; invoice: Invoice };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const METHODS: readonly PaymentMethodValue[] = ['upi', 'cash', 'bank'];
const REFERENCE_MAX = 60;

/** Today's date in India (YYYY-MM-DD). */
function todayIso(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

/** Date-only value stored by Prisma @db.Date (UTC midnight). */
function dateOnly(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function formatInr(value: Prisma.Decimal): string {
  return value.toDecimalPlaces(2).toNumber().toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  });
}

function parseAmount(raw: unknown): Prisma.Decimal | null {
  if (typeof raw !== 'number' && typeof raw !== 'string') return null;
  if (typeof raw === 'string' && raw.trim() === '') return null;
  try {
    const value = new Prisma.Decimal(raw);
    if (!value.isFinite() || value.lte(0)) return null;
    if (value.decimalPlaces() > 2) return null;
    return value;
  } catch {
    return null;
  }
}

/** Derives invoice status from the sum of its payments, following the PRD rules. */
function deriveStatus(
  total: Prisma.Decimal,
  totalPaid: Prisma.Decimal,
  dueDate: Date,
  today: Date,
): InvoiceStatusValue {
  if (total.gt(0) && totalPaid.gte(total)) return 'paid';
  const pastDue = dueDate.getTime() < today.getTime();
  if (totalPaid.gt(0)) return pastDue ? 'overdue' : 'partial';
  return pastDue ? 'overdue' : 'sent';
}

function serializePayment(p: Payment) {
  return {
    id: p.id,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    customerId: p.customerId,
    invoiceId: p.invoiceId,
    amount: p.amount.toNumber(),
    receivedOn: p.receivedOn.toISOString().slice(0, 10),
    method: p.method,
    reference: p.reference,
    source: p.source,
    isDemo: p.isDemo,
  };
}

function serializeInvoiceSummary(inv: Invoice, paid: Prisma.Decimal) {
  let outstanding = inv.totalAmount.minus(paid);
  if (outstanding.isNegative()) outstanding = new Prisma.Decimal(0);
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    totalAmount: inv.totalAmount.toNumber(),
    outstandingAmount: outstanding.toNumber(),
    status: inv.status,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: { paymentId: string } },
) {
  const paymentId = params.paymentId;
  if (!UUID_RE.test(paymentId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const payment = (await db.payment.findUnique({
      where: { id: paymentId },
      include: { customer: true, invoice: true },
    })) as PaymentWithRelations | null;

    if (!payment) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const paidAgg = await db.payment.aggregate({
      where: { invoiceId: payment.invoiceId },
      _sum: { amount: true },
    });
    const totalPaid = paidAgg._sum.amount ?? new Prisma.Decimal(0);

    return NextResponse.json({
      payment: serializePayment(payment),
      customer_name: payment.customer.parentName,
      invoice: serializeInvoiceSummary(payment.invoice, totalPaid),
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

type PaymentPatch = {
  amount?: Prisma.Decimal;
  receivedOn?: Date;
  method?: PaymentMethodValue;
  reference?: string | null;
};

type TxResult =
  | { kind: 'notFound' }
  | { kind: 'invalid'; error: string }
  | { kind: 'ok'; payment: Payment };

export async function PATCH(
  request: Request,
  { params }: { params: { paymentId: string } },
) {
  const paymentId = params.paymentId;
  if (!UUID_RE.test(paymentId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const patch: PaymentPatch = {};

  if ('amount' in input) {
    const amount = parseAmount(input.amount);
    if (!amount) {
      return NextResponse.json(
        { error: 'Enter the amount received.' },
        { status: 400 },
      );
    }
    patch.amount = amount;
  }

  if ('receivedOn' in input) {
    const raw = input.receivedOn;
    if (typeof raw !== 'string' || !DATE_RE.test(raw) || Number.isNaN(dateOnly(raw).getTime())) {
      return NextResponse.json(
        { error: 'Enter the date the payment was received.' },
        { status: 400 },
      );
    }
    if (raw > todayIso()) {
      return NextResponse.json(
        { error: 'The payment date cannot be later than today.' },
        { status: 400 },
      );
    }
    patch.receivedOn = dateOnly(raw);
  }

  if ('method' in input) {
    const raw = input.method;
    if (typeof raw !== 'string' || !(METHODS as readonly string[]).includes(raw)) {
      return NextResponse.json(
        { error: 'Choose how the payment was received: UPI, cash or bank.' },
        { status: 400 },
      );
    }
    patch.method = raw as PaymentMethodValue;
  }

  if ('reference' in input) {
    const raw = input.reference;
    if (raw === null || raw === undefined) {
      patch.reference = null;
    } else if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed.length > REFERENCE_MAX) {
        return NextResponse.json(
          { error: 'Keep the reference or note under 60 characters.' },
          { status: 400 },
        );
      }
      patch.reference = trimmed === '' ? null : trimmed;
    } else {
      return NextResponse.json(
        { error: 'Keep the reference or note under 60 characters.' },
        { status: 400 },
      );
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 });
  }

  const todayDate = dateOnly(todayIso());

  try {
    const result: TxResult = await db.$transaction(async (tx): Promise<TxResult> => {
      const current = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { invoice: true },
      });
      if (!current) return { kind: 'notFound' };

      // Re-check the overpayment rule against the invoice total less every other payment.
      const others = await tx.payment.aggregate({
        where: { invoiceId: current.invoiceId, id: { not: current.id } },
        _sum: { amount: true },
      });
      const otherPaid = others._sum.amount ?? new Prisma.Decimal(0);
      const total = current.invoice.totalAmount;

      let maxAllowed = total.minus(otherPaid);
      if (maxAllowed.isNegative()) maxAllowed = new Prisma.Decimal(0);

      const nextAmount = patch.amount ?? current.amount;
      if (nextAmount.lte(0) || nextAmount.gt(maxAllowed)) {
        return {
          kind: 'invalid',
          error: `Amount must be more than Rs 0 and no more than the Rs ${formatInr(maxAllowed)} still due on this invoice.`,
        };
      }

      const updated = await tx.payment.update({
        where: { id: current.id },
        data: {
          ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
          ...(patch.receivedOn !== undefined ? { receivedOn: patch.receivedOn } : {}),
          ...(patch.method !== undefined ? { method: patch.method } : {}),
          ...(patch.reference !== undefined ? { reference: patch.reference } : {}),
        },
      });

      if (current.invoice.status !== 'draft') {
        const totalPaid = otherPaid.plus(updated.amount);
        const status = deriveStatus(total, totalPaid, current.invoice.dueDate, todayDate);
        await tx.invoice.update({
          where: { id: current.invoiceId },
          data: {
            status,
            paidAt: status === 'paid' ? (current.invoice.paidAt ?? new Date()) : null,
          },
        });
      }

      return { kind: 'ok', payment: updated };
    });

    if (result.kind === 'notFound') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (result.kind === 'invalid') {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ payment: serializePayment(result.payment) });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
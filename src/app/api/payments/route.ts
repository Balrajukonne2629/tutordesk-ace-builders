import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

const METHODS = ['upi', 'cash', 'bank'] as const;
type Method = (typeof METHODS)[number];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_REFERENCE_LENGTH = 60;

function isMethod(value: unknown): value is Method {
  return typeof value === 'string' && (METHODS as readonly string[]).includes(value);
}

/** Today's calendar date in India (IST), as YYYY-MM-DD. */
function istToday(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function parseOptionalAmount(value: string | null): number | undefined | null {
  if (value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

class PaymentRuleError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'PaymentRuleError';
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const method = searchParams.get('method');
  const customerId = searchParams.get('customer_id');
  const minAmount = parseOptionalAmount(searchParams.get('min_amount'));
  const maxAmount = parseOptionalAmount(searchParams.get('max_amount'));

  if (from && !DATE_RE.test(from)) {
    return NextResponse.json({ error: 'Invalid from date' }, { status: 400 });
  }
  if (to && !DATE_RE.test(to)) {
    return NextResponse.json({ error: 'Invalid to date' }, { status: 400 });
  }
  if (method && !isMethod(method)) {
    return NextResponse.json(
      { error: 'Choose how the payment was received: UPI, cash or bank.' },
      { status: 400 },
    );
  }
  if (customerId && !UUID_RE.test(customerId)) {
    return NextResponse.json({ error: 'Invalid customer_id' }, { status: 400 });
  }
  if (minAmount === null || maxAmount === null) {
    return NextResponse.json({ error: 'Invalid amount filter' }, { status: 400 });
  }

  const where: Prisma.PaymentWhereInput = {};
  if (from || to) {
    where.receivedOn = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }
  if (method && isMethod(method)) where.method = method;
  if (customerId) where.customerId = customerId;
  if (minAmount !== undefined || maxAmount !== undefined) {
    where.amount = {
      ...(minAmount !== undefined ? { gte: minAmount } : {}),
      ...(maxAmount !== undefined ? { lte: maxAmount } : {}),
    };
  }

  try {
    const rows = await db.payment.findMany({
      where,
      orderBy: [{ receivedOn: 'desc' }, { createdAt: 'desc' }],
      include: {
        customer: { select: { parentName: true } },
        invoice: { select: { invoiceNumber: true } },
      },
    });

    const payments = rows.map((row) => ({
      id: row.id,
      received_on: row.receivedOn.toISOString().slice(0, 10),
      customer_id: row.customerId,
      customer_name: row.customer.parentName,
      invoice_id: row.invoiceId,
      invoice_number: row.invoice.invoiceNumber,
      amount: row.amount.toNumber(),
      method: row.method,
      source: row.source,
    }));

    return NextResponse.json({ payments });
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
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const input = body as Record<string, unknown>;

  // Invoice selection
  const invoiceId = typeof input.invoice_id === 'string' ? input.invoice_id.trim() : '';
  if (!invoiceId || !UUID_RE.test(invoiceId)) {
    return NextResponse.json(
      { error: 'Select the invoice this payment is for.' },
      { status: 400 },
    );
  }

  // Amount
  const rawAmount = input.amount;
  if (rawAmount === undefined || rawAmount === null || rawAmount === '') {
    return NextResponse.json({ error: 'Enter the amount received.' }, { status: 400 });
  }
  const amount = typeof rawAmount === 'number' ? rawAmount : Number(rawAmount);
  if (!Number.isFinite(amount) || Math.round(amount * 100) !== amount * 100) {
    return NextResponse.json({ error: 'Enter the amount received.' }, { status: 400 });
  }

  // Received date
  const receivedOn = typeof input.received_on === 'string' ? input.received_on.trim() : '';
  if (!receivedOn || !DATE_RE.test(receivedOn)) {
    return NextResponse.json(
      { error: 'Enter the date the payment was received.' },
      { status: 400 },
    );
  }
  const today = istToday();
  if (receivedOn > today) {
    return NextResponse.json(
      { error: 'The payment date cannot be later than today.' },
      { status: 400 },
    );
  }

  // Method
  if (!isMethod(input.method)) {
    return NextResponse.json(
      { error: 'Choose how the payment was received: UPI, cash or bank.' },
      { status: 400 },
    );
  }
  const method: Method = input.method;

  // Optional reference
  let reference: string | null = null;
  if (input.reference !== undefined && input.reference !== null && input.reference !== '') {
    if (typeof input.reference !== 'string') {
      return NextResponse.json(
        { error: 'Keep the reference or note under 60 characters.' },
        { status: 400 },
      );
    }
    const trimmed = input.reference.trim();
    if (trimmed.length > MAX_REFERENCE_LENGTH) {
      return NextResponse.json(
        { error: 'Keep the reference or note under 60 characters.' },
        { status: 400 },
      );
    }
    reference = trimmed.length > 0 ? trimmed : null;
  }

  if (amount <= 0) {
    return NextResponse.json(
      { error: 'Amount must be more than Rs 0 and no more than the remaining balance.' },
      { status: 400 },
    );
  }

  try {
    const payment = await db.$transaction(
      async (tx) => {
        const invoice = await tx.invoice.findUnique({
          where: { id: invoiceId },
          select: {
            id: true,
            customerId: true,
            status: true,
            totalAmount: true,
            dueDate: true,
          },
        });

        if (!invoice) {
          throw new PaymentRuleError(400, 'Select the invoice this payment is for.');
        }

        if (!['sent', 'partial', 'overdue'].includes(invoice.status)) {
          throw new PaymentRuleError(
            409,
            'Payments can only be recorded against a sent invoice that still has a balance.',
          );
        }

        const sumResult = await tx.payment.aggregate({
          where: { invoiceId: invoice.id },
          _sum: { amount: true },
        });
        const alreadyPaid = sumResult._sum.amount ?? new Prisma.Decimal(0);
        const total = invoice.totalAmount;
        const balance = total.minus(alreadyPaid);

        if (balance.lte(0)) {
          throw new PaymentRuleError(409, 'This invoice is already fully paid.');
        }

        const amt = new Prisma.Decimal(amount);
        if (amt.lte(0) || amt.gt(balance)) {
          throw new PaymentRuleError(
            400,
            `Amount must be more than Rs 0 and no more than the Rs ${balance.toFixed(2)} still due on this invoice.`,
          );
        }

        const created = await tx.payment.create({
          data: {
            customerId: invoice.customerId,
            invoiceId: invoice.id,
            amount: amt,
            receivedOn: new Date(receivedOn),
            method,
            reference,
            source: 'manual',
          },
        });

        const newPaid = alreadyPaid.plus(amt);
        const newBalance = total.minus(newPaid);
        const todayDate = new Date(today);

        let nextStatus: 'partial' | 'paid' | 'overdue';
        if (newBalance.lte(0)) {
          nextStatus = 'paid';
        } else if (invoice.dueDate < todayDate) {
          nextStatus = 'overdue';
        } else {
          nextStatus = 'partial';
        }

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: nextStatus,
            ...(nextStatus === 'paid' ? { paidAt: new Date() } : {}),
          },
        });

        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return NextResponse.json({
      payment: {
        id: payment.id,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        customerId: payment.customerId,
        invoiceId: payment.invoiceId,
        amount: payment.amount.toNumber(),
        receivedOn: payment.receivedOn.toISOString().slice(0, 10),
        method: payment.method,
        reference: payment.reference,
        source: payment.source,
        isDemo: payment.isDemo,
      },
    });
  } catch (error) {
    if (error instanceof PaymentRuleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    ) {
      return NextResponse.json(
        { error: 'Another payment was recorded at the same time. Refresh and try again.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
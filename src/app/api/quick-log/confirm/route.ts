import { NextResponse } from 'next/server';
import {
  Prisma,
  PaymentMethod,
  PaymentSource,
  InvoiceStatus,
  type Payment,
} from '@prisma/client';
import { db } from '@/lib/db';

const OPEN_STATUSES: InvoiceStatus[] = ['sent', 'partial', 'overdue'];
const METHODS = ['upi', 'cash', 'bank'] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TEXT_LENGTH = 500;
const MAX_REFERENCE_LENGTH = 100;

type Outcome =
  | { ok: true; payment: Payment }
  | { ok: false; status: number; error: string };

function istToday(): string {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function isValidIsoDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === value;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const input = body as Record<string, unknown>;

  const customerId =
    typeof input.customer_id === 'string' ? input.customer_id.trim() : '';
  if (!customerId) {
    return NextResponse.json(
      { error: 'Select which customer this payment is from.' },
      { status: 400 },
    );
  }

  const invoiceId =
    typeof input.invoice_id === 'string' ? input.invoice_id.trim() : '';
  if (!invoiceId) {
    return NextResponse.json(
      {
        error:
          'Pick which invoice this payment is for. No open invoice was found for this customer.',
      },
      { status: 400 },
    );
  }

  if (typeof input.amount !== 'number' || !Number.isFinite(input.amount)) {
    return NextResponse.json(
      { error: 'Enter the amount received in rupees.' },
      { status: 400 },
    );
  }
  const amount = new Prisma.Decimal(input.amount).toDecimalPlaces(2);

  const receivedOn =
    typeof input.received_on === 'string' ? input.received_on.trim() : '';
  if (!isValidIsoDate(receivedOn)) {
    return NextResponse.json(
      { error: 'Payment date is required. Check the date in the message.' },
      { status: 400 },
    );
  }
  if (receivedOn > istToday()) {
    return NextResponse.json(
      {
        error:
          'The payment date cannot be in the future. Choose today or an earlier date.',
      },
      { status: 400 },
    );
  }

  const method =
    typeof input.method === 'string' ? input.method.trim().toLowerCase() : '';
  if (!(METHODS as readonly string[]).includes(method)) {
    return NextResponse.json(
      { error: 'Choose how the money was received: UPI, cash or bank.' },
      { status: 400 },
    );
  }

  let reference: string | null = null;
  if (input.reference !== undefined && input.reference !== null) {
    if (typeof input.reference !== 'string') {
      return NextResponse.json(
        { error: 'Reference must be text.' },
        { status: 400 },
      );
    }
    const trimmed = input.reference.trim();
    if (trimmed.length > MAX_REFERENCE_LENGTH) {
      return NextResponse.json(
        {
          error: `Reference must be ${MAX_REFERENCE_LENGTH} characters or fewer.`,
        },
        { status: 400 },
      );
    }
    reference = trimmed.length > 0 ? trimmed : null;
  }

  const pastedText =
    typeof input.pasted_text === 'string' ? input.pasted_text.trim() : '';
  if (!pastedText) {
    return NextResponse.json(
      {
        error:
          "Paste a payment message first, for example 'Received Rs 2500 from Ramesh Kumar on 20 Nov via UPI'.",
      },
      { status: 400 },
    );
  }
  if (pastedText.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      {
        error:
          'This message is too long. Paste only the payment part of the message (up to 500 characters).',
      },
      { status: 400 },
    );
  }

  const today = istToday();

  try {
    const outcome = await db.$transaction<Outcome>(
      async (tx) => {
        const invoice = await tx.invoice.findUnique({
          where: { id: invoiceId },
          include: { payments: { select: { amount: true } } },
        });

        if (!invoice) {
          return { ok: false, status: 404, error: 'Not found' };
        }

        if (invoice.customerId !== customerId) {
          return {
            ok: false,
            status: 400,
            error: 'This invoice does not belong to the selected customer.',
          };
        }

        if (!OPEN_STATUSES.includes(invoice.status)) {
          return {
            ok: false,
            status: 400,
            error:
              'This invoice cannot take payments. Pick an open invoice for this customer.',
          };
        }

        const alreadyPaid = invoice.payments.reduce(
          (sum, p) => sum.plus(p.amount),
          new Prisma.Decimal(0),
        );
        const outstanding = invoice.totalAmount.minus(alreadyPaid);

        if (outstanding.lte(0)) {
          return {
            ok: false,
            status: 400,
            error: 'This invoice has no balance left to collect.',
          };
        }

        if (amount.lte(0) || amount.gt(outstanding)) {
          return {
            ok: false,
            status: 400,
            error: `Amount must be between Rs 1 and the Rs ${outstanding.toFixed(
              2,
            )} still due on this invoice.`,
          };
        }

        const payment = await tx.payment.create({
          data: {
            customerId,
            invoiceId,
            amount,
            receivedOn: new Date(`${receivedOn}T00:00:00.000Z`),
            method: method as PaymentMethod,
            reference,
            source: PaymentSource.quick_log,
          },
        });

        const newPaid = alreadyPaid.plus(amount);
        const newOutstanding = invoice.totalAmount.minus(newPaid);
        const dueDateStr = invoice.dueDate.toISOString().slice(0, 10);

        let nextStatus: InvoiceStatus;
        if (newOutstanding.lte(0)) {
          nextStatus = 'paid';
        } else if (dueDateStr < today) {
          nextStatus = 'overdue';
        } else {
          nextStatus = 'partial';
        }

        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            status: nextStatus,
            paidAt: nextStatus === 'paid' ? new Date() : null,
          },
        });

        return { ok: true, payment };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (!outcome.ok) {
      return NextResponse.json(
        { error: outcome.error },
        { status: outcome.status },
      );
    }

    return NextResponse.json({ payment: outcome.payment }, { status: 201 });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2034'
    ) {
      return NextResponse.json(
        {
          error:
            'Another payment was saved at the same time. Check the balance and try again.',
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
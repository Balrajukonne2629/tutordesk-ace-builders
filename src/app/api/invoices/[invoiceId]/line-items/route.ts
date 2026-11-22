import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = { params: { invoiceId: string } };

function toNumberValue(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export async function POST(request: Request, { params }: RouteContext) {
  const invoiceId = params.invoiceId;

  if (!UUID_RE.test(invoiceId)) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json(
      { error: "Please describe what this line item is for, such as 'Maths tuition, November'." },
      { status: 400 },
    );
  }

  const raw = body as Record<string, unknown>;

  // description: required, 1-100 characters
  const description = typeof raw.description === 'string' ? raw.description.trim() : '';
  if (description.length === 0) {
    return NextResponse.json(
      { error: "Please describe what this line item is for, such as 'Maths tuition, November'." },
      { status: 400 },
    );
  }
  if (description.length > 100) {
    return NextResponse.json({ error: 'Description must be 100 characters or fewer.' }, { status: 400 });
  }

  // quantity: optional, whole number 1-99, defaults to 1
  let quantity = 1;
  if (raw.quantity !== undefined && raw.quantity !== null) {
    const parsedQuantity = toNumberValue(raw.quantity);
    if (
      parsedQuantity === undefined ||
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity < 1 ||
      parsedQuantity > 99
    ) {
      return NextResponse.json(
        { error: 'Quantity must be a whole number between 1 and 99.' },
        { status: 400 },
      );
    }
    quantity = parsedQuantity;
  }

  // unit_price: required, > 0 and <= 1,00,000
  const unitPrice = toNumberValue(raw.unit_price);
  if (unitPrice === undefined) {
    return NextResponse.json(
      { error: 'Please enter the amount in rupees for this line item.' },
      { status: 400 },
    );
  }
  if (unitPrice <= 0 || unitPrice > 100000) {
    return NextResponse.json(
      { error: 'Amount must be more than Rs 0 and no more than Rs 1,00,000.' },
      { status: 400 },
    );
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        select: { id: true, status: true },
      });

      if (!invoice) {
        return { kind: 'not_found' as const };
      }

      if (invoice.status !== 'draft') {
        return { kind: 'not_draft' as const };
      }

      const unit = new Prisma.Decimal(unitPrice).toDecimalPlaces(2);
      const amount = unit.mul(quantity).toDecimalPlaces(2);

      const lineItem = await tx.invoiceLineItem.create({
        data: {
          invoiceId,
          description,
          quantity,
          unitPrice: unit,
          amount,
        },
      });

      const sum = await tx.invoiceLineItem.aggregate({
        where: { invoiceId },
        _sum: { amount: true },
      });

      const total = (sum._sum.amount ?? new Prisma.Decimal(0)).toDecimalPlaces(2);

      await tx.invoice.update({
        where: { id: invoiceId },
        data: { totalAmount: total },
      });

      return { kind: 'ok' as const, lineItem };
    });

    if (result.kind === 'not_found') {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (result.kind === 'not_draft') {
      return NextResponse.json(
        { error: 'Line items can only be added while the invoice is a draft.' },
        { status: 409 },
      );
    }

    const item = result.lineItem;
    const lineItem = {
      id: item.id,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      invoiceId: item.invoiceId,
      description: item.description,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      amount: Number(item.amount),
      isDemo: item.isDemo ?? null,
    };

    return NextResponse.json({ lineItem }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
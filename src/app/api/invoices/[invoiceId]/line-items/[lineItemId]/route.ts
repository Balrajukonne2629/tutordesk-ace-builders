import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import type { InvoiceLineItem } from '@prisma/client';
import { db } from '@/lib/db';

type RouteContext = {
  params: Promise<{ invoiceId: string; lineItemId: string }>;
};

type LineItemPatch = {
  description?: string;
  quantity?: number;
  unitPrice?: number;
};

type ParseResult = { data: LineItemPatch } | { error: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_UNIT_PRICE = 100000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseLineItemPatch(body: unknown): ParseResult {
  if (!isPlainObject(body)) {
    return { error: 'Request body must be a JSON object.' };
  }

  const data: LineItemPatch = {};

  if ('description' in body) {
    const raw = body.description;
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      return {
        error: "Please describe what this line item is for, such as 'Maths tuition, November'.",
      };
    }
    const trimmed = raw.trim();
    if (trimmed.length > 100) {
      return { error: 'Description must be 100 characters or fewer.' };
    }
    data.description = trimmed;
  }

  if ('quantity' in body) {
    const raw = body.quantity;
    if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1 || raw > 99) {
      return { error: 'Quantity must be a whole number between 1 and 99.' };
    }
    data.quantity = raw;
  }

  if ('unitPrice' in body) {
    const raw = body.unitPrice;
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      return { error: 'Please enter the amount in rupees for this line item.' };
    }
    if (raw <= 0 || raw > MAX_UNIT_PRICE) {
      return { error: 'Amount must be more than Rs 0 and no more than Rs 1,00,000.' };
    }
    data.unitPrice = raw;
  }

  if (Object.keys(data).length === 0) {
    return { error: 'Nothing to update. Provide description, quantity or unitPrice.' };
  }

  return { data };
}

async function recalculateInvoiceTotal(
  tx: Prisma.TransactionClient,
  invoiceId: string,
): Promise<Prisma.Decimal> {
  const items = await tx.invoiceLineItem.findMany({
    where: { invoiceId },
    select: { amount: true },
  });
  const total = items.reduce(
    (sum, item) => sum.add(item.amount),
    new Prisma.Decimal(0),
  );
  await tx.invoice.update({
    where: { id: invoiceId },
    data: { totalAmount: total },
  });
  return total;
}

function serializeLineItem(item: InvoiceLineItem) {
  return {
    id: item.id,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    invoiceId: item.invoiceId,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice.toNumber(),
    amount: item.amount.toNumber(),
    isDemo: item.isDemo,
  };
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { invoiceId, lineItemId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = parseLineItemPatch(body);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (!UUID_PATTERN.test(invoiceId) || !UUID_PATTERN.test(lineItemId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
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

      const existing = await tx.invoiceLineItem.findFirst({
        where: { id: lineItemId, invoiceId },
      });
      if (!existing) {
        return { kind: 'not_found' as const };
      }

      if (invoice.status !== 'draft') {
        return { kind: 'not_draft' as const };
      }

      const quantity = parsed.data.quantity ?? existing.quantity;
      const unitPrice =
        parsed.data.unitPrice !== undefined
          ? new Prisma.Decimal(parsed.data.unitPrice)
          : existing.unitPrice;
      const amount = unitPrice.mul(quantity);

      const lineItem = await tx.invoiceLineItem.update({
        where: { id: lineItemId },
        data: {
          description: parsed.data.description ?? existing.description,
          quantity,
          unitPrice,
          amount,
        },
      });

      await recalculateInvoiceTotal(tx, invoiceId);

      return { kind: 'ok' as const, lineItem };
    });

    if (result.kind === 'not_found') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (result.kind === 'not_draft') {
      return NextResponse.json(
        { error: 'Line items can only be changed while the invoice is a draft.' },
        { status: 409 },
      );
    }

    return NextResponse.json({ lineItem: serializeLineItem(result.lineItem) });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { invoiceId, lineItemId } = await params;

  if (!UUID_PATTERN.test(invoiceId) || !UUID_PATTERN.test(lineItemId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
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

      const existing = await tx.invoiceLineItem.findFirst({
        where: { id: lineItemId, invoiceId },
        select: { id: true },
      });
      if (!existing) {
        return { kind: 'not_found' as const };
      }

      if (invoice.status !== 'draft') {
        return { kind: 'not_draft' as const };
      }

      const count = await tx.invoiceLineItem.count({ where: { invoiceId } });
      if (count <= 1) {
        return { kind: 'last_item' as const };
      }

      await tx.invoiceLineItem.delete({ where: { id: lineItemId } });
      const total = await recalculateInvoiceTotal(tx, invoiceId);

      return { kind: 'ok' as const, total };
    });

    if (result.kind === 'not_found') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (result.kind === 'not_draft') {
      return NextResponse.json(
        { error: 'Line items can only be removed while the invoice is a draft.' },
        { status: 409 },
      );
    }
    if (result.kind === 'last_item') {
      return NextResponse.json(
        { error: 'Add at least one line item before saving the invoice.' },
        { status: 409 },
      );
    }

    return NextResponse.json({
      deleted: true,
      total_amount: result.total.toNumber(),
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
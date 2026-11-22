import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import type { Invoice, InvoiceStatus } from '@prisma/client';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type RouteContext = { params: { invoiceId: string } };

function money(value: { toNumber(): number }): number {
  return Math.round(value.toNumber() * 100) / 100;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function dayDiff(laterIso: string, earlierIso: string): number {
  const a = Date.parse(`${laterIso}T00:00:00Z`);
  const b = Date.parse(`${earlierIso}T00:00:00Z`);
  return Math.round((a - b) / 86400000);
}

function parseDateOnly(value: string): Date | null {
  if (!DATE_RE.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function computeStatus(
  stored: InvoiceStatus,
  total: number,
  paid: number,
  dueIso: string,
  today: string,
): InvoiceStatus {
  if (stored === 'draft') return 'draft';
  if (paid >= total) return 'paid';
  if (dueIso < today) return 'overdue';
  if (paid > 0) return 'partial';
  return 'sent';
}

function agingBucket(outstanding: number, dueIso: string, today: string): string {
  if (outstanding <= 0) return 'not_due';
  const daysPast = dayDiff(today, dueIso);
  if (daysPast <= 0) return 'not_due';
  if (daysPast <= 7) return '1-7';
  if (daysPast <= 30) return '8-30';
  return '30+';
}

function serializeInvoice(inv: Invoice, status: InvoiceStatus) {
  return {
    id: inv.id,
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
    invoiceNumber: inv.invoiceNumber,
    customerId: inv.customerId,
    billingMonth: inv.billingMonth ? dateOnly(inv.billingMonth) : null,
    issuedDate: dateOnly(inv.issuedDate),
    dueDate: dateOnly(inv.dueDate),
    totalAmount: money(inv.totalAmount),
    status,
    sentAt: inv.sentAt ? inv.sentAt.toISOString() : null,
    paidAt: inv.paidAt ? inv.paidAt.toISOString() : null,
    isDemo: inv.isDemo ?? null,
  };
}

async function paidTotal(invoiceId: string): Promise<number> {
  const result = await db.payment.aggregate({
    where: { invoiceId },
    _sum: { amount: true },
  });
  return result._sum.amount ? round2(money(result._sum.amount)) : 0;
}

function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
  );
}

export async function GET(_request: Request, { params }: RouteContext) {
  const invoiceId = params.invoiceId;
  if (!UUID_RE.test(invoiceId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        lineItems: { orderBy: { createdAt: 'asc' } },
        payments: { orderBy: [{ receivedOn: 'asc' }, { createdAt: 'asc' }] },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const today = todayIso();
    const total = money(invoice.totalAmount);
    const paid = round2(
      invoice.payments.reduce((sum, p) => sum + money(p.amount), 0),
    );
    const outstanding = Math.max(0, round2(total - paid));
    const dueIso = dateOnly(invoice.dueDate);
    const status = computeStatus(invoice.status, total, paid, dueIso, today);

    return NextResponse.json({
      invoice: serializeInvoice(invoice, status),
      customer_name: invoice.customer.parentName,
      line_items: invoice.lineItems.map((li) => ({
        id: li.id,
        createdAt: li.createdAt.toISOString(),
        updatedAt: li.updatedAt.toISOString(),
        invoiceId: li.invoiceId,
        description: li.description,
        quantity: li.quantity,
        unitPrice: money(li.unitPrice),
        amount: money(li.amount),
        isDemo: li.isDemo ?? null,
      })),
      payments: invoice.payments.map((p) => ({
        id: p.id,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        customerId: p.customerId,
        invoiceId: p.invoiceId,
        amount: money(p.amount),
        receivedOn: dateOnly(p.receivedOn),
        method: p.method,
        reference: p.reference ?? null,
        source: p.source,
        isDemo: p.isDemo ?? null,
      })),
      outstanding_amount: outstanding,
      aging_bucket: agingBucket(outstanding, dueIso, today),
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const invoiceId = params.invoiceId;
  if (!UUID_RE.test(invoiceId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Only these two fields are editable. status, totalAmount and invoiceNumber
  // are never read from the body, so they can never be written directly.
  const input = body as { dueDate?: unknown; customerId?: unknown };

  if (input.dueDate === undefined && input.customerId === undefined) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  try {
    const existing = await db.invoice.findUnique({ where: { id: invoiceId } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const today = todayIso();
    const data: Prisma.InvoiceUpdateInput = {};

    if (input.dueDate !== undefined) {
      if (typeof input.dueDate !== 'string' || input.dueDate.trim() === '') {
        return NextResponse.json(
          { error: 'Please enter a due date.' },
          { status: 400 },
        );
      }
      const due = parseDateOnly(input.dueDate.trim());
      if (!due) {
        return NextResponse.json(
          { error: 'Please enter a due date.' },
          { status: 400 },
        );
      }
      const dueIso = dateOnly(due);
      if (dueIso < today) {
        return NextResponse.json(
          { error: 'Due date cannot be in the past. Pick today or a later date.' },
          { status: 400 },
        );
      }
      if (dueIso < dateOnly(existing.issuedDate)) {
        return NextResponse.json(
          { error: 'Due date cannot be before the issued date.' },
          { status: 400 },
        );
      }
      data.dueDate = due;
    }

    if (input.customerId !== undefined) {
      if (existing.status !== 'draft') {
        return NextResponse.json(
          { error: 'The customer can only be changed while the invoice is draft.' },
          { status: 409 },
        );
      }
      if (typeof input.customerId !== 'string' || !UUID_RE.test(input.customerId)) {
        return NextResponse.json(
          { error: 'Please select a customer for this invoice.' },
          { status: 400 },
        );
      }
      const customer = await db.customer.findUnique({
        where: { id: input.customerId },
      });
      if (!customer) {
        return NextResponse.json(
          { error: 'Please select a customer for this invoice.' },
          { status: 400 },
        );
      }
      if (existing.billingMonth) {
        const duplicate = await db.invoice.findFirst({
          where: {
            customerId: input.customerId,
            billingMonth: existing.billingMonth,
            NOT: { id: existing.id },
          },
          select: { id: true },
        });
        if (duplicate) {
          return NextResponse.json(
            { error: 'This customer already has an invoice for that billing month.' },
            { status: 409 },
          );
        }
      }
      data.customer = { connect: { id: input.customerId } };
    }

    const updated = await db.invoice.update({
      where: { id: invoiceId },
      data,
    });

    const total = money(updated.totalAmount);
    const paid = await paidTotal(updated.id);
    const status = computeStatus(
      updated.status,
      total,
      paid,
      dateOnly(updated.dueDate),
      today,
    );

    return NextResponse.json({ invoice: serializeInvoice(updated, status) });
  } catch (error) {
    if (isNotFoundError(error)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const invoiceId = params.invoiceId;
  if (!UUID_RE.test(invoiceId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const paymentCount = await db.payment.count({ where: { invoiceId } });
    if (invoice.status !== 'draft' || paymentCount > 0) {
      return NextResponse.json(
        { error: 'Only draft invoices with no payments can be deleted.' },
        { status: 409 },
      );
    }

    // Line items are removed by the onDelete: Cascade relation.
    await db.invoice.delete({ where: { id: invoiceId } });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (isNotFoundError(error)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
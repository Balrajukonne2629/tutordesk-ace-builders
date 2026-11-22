import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  _request: Request,
  { params }: { params: { invoiceId: string } },
) {
  const invoiceId = params.invoiceId;

  if (!UUID_RE.test(invoiceId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const existing = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        status: true,
        _count: { select: { lineItems: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (existing.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft invoices can be marked as sent.' },
        { status: 409 },
      );
    }

    if (existing._count.lineItems === 0) {
      return NextResponse.json(
        { error: 'Add at least one line item before saving the invoice.' },
        { status: 400 },
      );
    }

    // Guarded update: only transitions a row that is still draft, so two
    // concurrent sends cannot both succeed.
    const result = await db.invoice.updateMany({
      where: { id: invoiceId, status: 'draft' },
      data: { status: 'sent', sentAt: new Date() },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Only draft invoices can be marked as sent.' },
        { status: 409 },
      );
    }

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ invoice });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
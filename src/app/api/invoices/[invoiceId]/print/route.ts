import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toNumber(value: { toString(): string }): number {
  const n = Number(value.toString());
  return Number.isFinite(n) ? n : 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export async function GET(
  _request: Request,
  { params }: { params: { invoiceId: string } },
) {
  const invoiceId = params.invoiceId;

  if (!UUID_RE.test(invoiceId)) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  try {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        lineItems: { orderBy: { createdAt: 'asc' } },
        payments: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const profile = await db.tutorProfile.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    const tutorName = profile?.name ?? '';
    const upiId = profile?.upiId ?? '';

    const totalAmount = round2(toNumber(invoice.totalAmount));
    const paidAmount = round2(
      invoice.payments.reduce((sum, p) => sum + toNumber(p.amount), 0),
    );
    const outstandingAmount = Math.max(0, round2(totalAmount - paidAmount));

    const customerName = `${invoice.customer.parentName} (${invoice.customer.studentName})`;

    let upiQrPayload = '';
    if (upiId) {
      const params: string[] = [
        `pa=${encodeURIComponent(upiId)}`,
        `pn=${encodeURIComponent(tutorName)}`,
        'cu=INR',
        `tn=${encodeURIComponent(invoice.invoiceNumber)}`,
      ];
      if (outstandingAmount > 0) {
        params.push(`am=${outstandingAmount.toFixed(2)}`);
      }
      upiQrPayload = `upi://pay?${params.join('&')}`;
    }

    const lineItems = invoice.lineItems.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: round2(toNumber(item.unitPrice)),
      amount: round2(toNumber(item.amount)),
    }));

    const print = {
      invoice_number: invoice.invoiceNumber,
      tutor_name: tutorName,
      upi_id: upiId,
      upi_qr_payload: upiQrPayload,
      customer_name: customerName,
      line_items: lineItems,
      total_amount: totalAmount,
      outstanding_amount: outstandingAmount,
      due_date: toIsoDate(invoice.dueDate),
    };

    return NextResponse.json({ print });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
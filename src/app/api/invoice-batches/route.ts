import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SkippedCustomer = { customer_id: string; reason: string };

function currentIstDate() {
  const ist = new Date(Date.now() + 330 * 60 * 1000);
  return {
    year: ist.getUTCFullYear(),
    month: ist.getUTCMonth() + 1,
    day: ist.getUTCDate(),
  };
}

function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function toInvoiceJson<T extends { totalAmount: unknown }>(invoice: T) {
  return { ...invoice, totalAmount: Number(invoice.totalAmount) };
}

function parseInvoiceNumber(value: string): number {
  const match = /(\d+)$/.exec(value);
  return match ? Number(match[1]) : 0;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { billing_month, customer_ids } = body as {
    billing_month?: unknown;
    customer_ids?: unknown;
  };

  if (typeof billing_month !== 'string' || billing_month.trim() === '') {
    return NextResponse.json(
      { error: 'Please choose the month to bill before generating invoices.' },
      { status: 400 },
    );
  }

  const monthMatch = MONTH_PATTERN.exec(billing_month.trim());
  if (!monthMatch) {
    return NextResponse.json(
      { error: 'Please choose the month to bill before generating invoices.' },
      { status: 400 },
    );
  }

  const year = Number(monthMatch[1]);
  const month = Number(monthMatch[2]);
  const today = currentIstDate();
  const isCurrentMonth = year === today.year && month === today.month;
  const isFutureMonth =
    year > today.year || (year === today.year && month > today.month);

  if (isFutureMonth) {
    return NextResponse.json(
      {
        error:
          "You can't bill a future month yet. Choose this month or an earlier one.",
      },
      { status: 400 },
    );
  }

  if (!Array.isArray(customer_ids) || customer_ids.length === 0) {
    return NextResponse.json(
      { error: 'Select at least one customer to generate invoices.' },
      { status: 400 },
    );
  }

  if (!customer_ids.every((id) => typeof id === 'string')) {
    return NextResponse.json(
      { error: 'customer_ids must be an array of strings.' },
      { status: 400 },
    );
  }

  const uniqueIds = Array.from(new Set(customer_ids as string[]));
  const validIds = uniqueIds.filter((id) => UUID_PATTERN.test(id));

  try {
    const result = await db.$transaction(async (tx) => {
      const monthStart = new Date(Date.UTC(year, month - 1, 1));
      const label = monthLabel(year, month);

      const existingInvoices = await tx.invoice.findMany({
        select: { invoiceNumber: true },
      });
      let nextNumber =
        existingInvoices.reduce(
          (max, inv) => Math.max(max, parseInvoiceNumber(inv.invoiceNumber)),
          0,
        ) + 1;

      const customers = await tx.customer.findMany({
        where: { id: { in: validIds } },
      });
      const customerById = new Map(customers.map((c) => [c.id, c]));

      const created: ReturnType<typeof toInvoiceJson>[] = [];
      const skipped: SkippedCustomer[] = [];

      for (const customerId of uniqueIds) {
        if (!UUID_PATTERN.test(customerId)) {
          skipped.push({ customer_id: customerId, reason: 'Customer not found' });
          continue;
        }

        const customer = customerById.get(customerId);
        if (!customer) {
          skipped.push({ customer_id: customerId, reason: 'Customer not found' });
          continue;
        }

        if (!customer.isActive) {
          skipped.push({
            customer_id: customerId,
            reason: 'Customer is inactive. Reactivate them before billing.',
          });
          continue;
        }

        if (isCurrentMonth && today.day < customer.billingDay) {
          skipped.push({
            customer_id: customerId,
            reason: 'Billing day not reached yet.',
          });
          continue;
        }

        const duplicate = await tx.invoice.findFirst({
          where: { customerId, billingMonth: monthStart },
          select: { id: true },
        });
        if (duplicate) {
          skipped.push({
            customer_id: customerId,
            reason: 'Already invoiced for this month.',
          });
          continue;
        }

        const invoiceNumber = `INV-${String(nextNumber).padStart(4, '0')}`;
        nextNumber += 1;

        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            customerId,
            billingMonth: monthStart,
            issuedDate: monthStart,
            dueDate: new Date(Date.UTC(year, month - 1, customer.billingDay)),
            totalAmount: customer.monthlyFee,
            status: 'draft',
            lineItems: {
              create: {
                description: `Tuition, ${label}`,
                quantity: 1,
                unitPrice: customer.monthlyFee,
                amount: customer.monthlyFee,
              },
            },
          },
        });

        created.push(toInvoiceJson(invoice));
      }

      return { created, skipped };
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
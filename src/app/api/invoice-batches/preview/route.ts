import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function currentIstParts(): { year: number; month: number; day: number } {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return {
    year: ist.getUTCFullYear(),
    month: ist.getUTCMonth() + 1,
    day: ist.getUTCDate(),
  };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export async function GET(request: Request) {
  const billingMonth = new URL(request.url).searchParams.get('billing_month')?.trim() ?? '';

  if (!billingMonth) {
    return NextResponse.json(
      { error: 'Please choose the month to bill before generating invoices.' },
      { status: 400 },
    );
  }

  const match = MONTH_PATTERN.exec(billingMonth);
  if (!match) {
    return NextResponse.json(
      { error: 'Billing month must be in YYYY-MM format.' },
      { status: 400 },
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const today = currentIstParts();
  const currentMonthKey = `${today.year}-${pad(today.month)}`;

  if (billingMonth > currentMonthKey) {
    return NextResponse.json(
      { error: "You can't bill a future month yet. Choose this month or an earlier one." },
      { status: 400 },
    );
  }

  const isCurrentMonth = billingMonth === currentMonthKey;
  const lastDay = daysInMonth(year, month);

  try {
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const nextMonthStart = new Date(Date.UTC(year, month, 1));

    const customers = await db.customer.findMany({
      where: { isActive: true },
      orderBy: { parentName: 'asc' },
    });

    const existingInvoices = await db.invoice.findMany({
      where: {
        billingMonth: { gte: monthStart, lt: nextMonthStart },
        customerId: { in: customers.map((c) => c.id) },
      },
      select: { customerId: true },
    });
    const invoicedCustomerIds = new Set(existingInvoices.map((i) => i.customerId));

    const proposed: {
      customer_id: string;
      customer_name: string;
      amount: number;
      due_date: string;
    }[] = [];
    const skipped: { customer_id: string; reason: string }[] = [];
    let totalAmount = 0;

    for (const customer of customers) {
      if (invoicedCustomerIds.has(customer.id)) {
        skipped.push({
          customer_id: customer.id,
          reason: 'Already invoiced for this month',
        });
        continue;
      }

      if (isCurrentMonth && customer.billingDay > today.day) {
        skipped.push({
          customer_id: customer.id,
          reason: 'Billing day not reached yet',
        });
        continue;
      }

      const dueDay = Math.min(customer.billingDay, lastDay);
      const dueDate = new Date(Date.UTC(year, month - 1, dueDay)).toISOString().slice(0, 10);
      const amount = roundMoney(customer.monthlyFee.toNumber());

      proposed.push({
        customer_id: customer.id,
        customer_name: customer.parentName,
        amount,
        due_date: dueDate,
      });
      totalAmount += amount;
    }

    return NextResponse.json({
      billing_month: billingMonth,
      proposed,
      skipped,
      total_amount: roundMoney(totalAmount),
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
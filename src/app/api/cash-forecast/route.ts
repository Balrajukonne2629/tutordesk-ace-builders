import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const ALLOWED_DAYS = [30, 60, 90] as const;
type HorizonDays = (typeof ALLOWED_DAYS)[number];

const OPEN_INVOICE_STATUSES = ['sent', 'partial', 'overdue'] as const;
const DELAY_SAMPLE_SIZE = 3;

/** Today's calendar date in IST as YYYY-MM-DD. */
function todayIst(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

/** Adds n days to a YYYY-MM-DD string, returning YYYY-MM-DD. */
function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Whole days from a to b (both YYYY-MM-DD). */
function diffDays(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawDays = url.searchParams.get('days') ?? '30';
  const days = Number(rawDays);

  if (!ALLOWED_DAYS.includes(days as HorizonDays)) {
    return NextResponse.json(
      { error: 'Choose a forecast of 30, 60 or 90 days.' },
      { status: 400 },
    );
  }

  const horizon = days as HorizonDays;

  try {
    const today = todayIst();
    const endIdx = horizon - 1;
    const endDate = addDays(today, endIdx);

    /** Maps a date to its day slot. Past dates fall on day 0; dates beyond the horizon return null. */
    const slot = (iso: string): number | null => {
      let idx = diffDays(today, iso);
      if (idx < 0) idx = 0;
      if (idx > endIdx) return null;
      return idx;
    };

    const inflow: number[] = new Array(horizon).fill(0);
    const outflow: number[] = new Array(horizon).fill(0);

    // ---- Invoices (open balances and customer payment delay history) ----
    const invoices = await db.invoice.findMany({
      select: {
        id: true,
        customerId: true,
        status: true,
        billingMonth: true,
        issuedDate: true,
        dueDate: true,
        totalAmount: true,
        payments: { select: { amount: true, receivedOn: true } },
      },
    });

    // Average days late per customer, from their last 3 fully paid invoices.
    const paidByCustomer = new Map<string, { due: string; final: string }[]>();
    for (const inv of invoices) {
      if (inv.status !== 'paid' || inv.payments.length === 0) continue;
      let finalTs = 0;
      for (const p of inv.payments) {
        const t = p.receivedOn.getTime();
        if (t > finalTs) finalTs = t;
      }
      const list = paidByCustomer.get(inv.customerId) ?? [];
      list.push({ due: toIso(inv.dueDate), final: toIso(new Date(finalTs)) });
      paidByCustomer.set(inv.customerId, list);
    }

    const delayByCustomer = new Map<string, number>();
    for (const [customerId, list] of paidByCustomer) {
      const recent = [...list]
        .sort((a, b) => (a.due < b.due ? 1 : a.due > b.due ? -1 : 0))
        .slice(0, DELAY_SAMPLE_SIZE);
      const total = recent.reduce((sum, r) => sum + Math.max(0, diffDays(r.due, r.final)), 0);
      delayByCustomer.set(customerId, recent.length ? Math.round(total / recent.length) : 0);
    }
    const avgDelay = (customerId: string): number => delayByCustomer.get(customerId) ?? 0;

    // Unpaid invoice balances arrive on due date plus customer's average delay.
    for (const inv of invoices) {
      if (!(OPEN_INVOICE_STATUSES as readonly string[]).includes(inv.status)) continue;
      const paid = inv.payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
      const outstanding = inv.totalAmount.toNumber() - paid;
      if (outstanding <= 0) continue;
      const projected = addDays(toIso(inv.dueDate), avgDelay(inv.customerId));
      const idx = slot(projected);
      if (idx !== null) inflow[idx] += outstanding;
    }

    // ---- Recurring monthly fees for months not yet invoiced ----
    const invoicedMonths = new Set<string>();
    for (const inv of invoices) {
      const basis = inv.billingMonth ?? inv.issuedDate;
      invoicedMonths.add(`${inv.customerId}|${toIso(basis).slice(0, 7)}`);
    }

    const activeCustomers = await db.customer.findMany({
      where: { isActive: true },
      select: { id: true, monthlyFee: true, billingDay: true },
    });

    const startYear = Number(today.slice(0, 4));
    const startMonth = Number(today.slice(5, 7));
    const monthKeys: { year: number; month: number; ym: string }[] = [];
    for (let y = startYear, m = startMonth; ; ) {
      const firstOfMonth = `${y}-${pad2(m)}-01`;
      if (firstOfMonth > endDate) break;
      monthKeys.push({ year: y, month: m, ym: `${y}-${pad2(m)}` });
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }

    for (const customer of activeCustomers) {
      const fee = customer.monthlyFee.toNumber();
      if (fee <= 0) continue;
      for (const { year, month, ym } of monthKeys) {
        if (invoicedMonths.has(`${customer.id}|${ym}`)) continue;
        const day = Math.min(customer.billingDay, daysInMonth(year, month));
        const idx = slot(`${ym}-${pad2(day)}`);
        if (idx !== null) inflow[idx] += fee;
      }
    }

    // ---- Bills: unpaid ones are outflows on their due date; paid ones reduce cash in hand ----
    const bills = await db.bill.findMany({
      select: { amount: true, dueDate: true, status: true, paidOn: true },
    });

    let paidBillsTotal = 0;
    for (const bill of bills) {
      const amount = bill.amount.toNumber();
      if (bill.status === 'paid') {
        if (bill.paidOn && toIso(bill.paidOn) <= today) paidBillsTotal += amount;
        continue;
      }
      const idx = slot(toIso(bill.dueDate));
      if (idx !== null) outflow[idx] += amount;
    }

    // ---- Starting cash in hand ----
    const profile = await db.tutorProfile.findFirst({
      select: { openingCashBalance: true },
    });
    const openingCash = profile ? profile.openingCashBalance.toNumber() : 0;

    const paymentAgg = await db.payment.aggregate({ _sum: { amount: true } });
    const totalPayments = paymentAgg._sum.amount ? paymentAgg._sum.amount.toNumber() : 0;

    const startingCash = openingCash + totalPayments - paidBillsTotal;

    // ---- Day-by-day running balance ----
    let balance = startingCash;
    const daily: { date: string; balance: number }[] = [];
    for (let i = 0; i < horizon; i++) {
      balance += inflow[i] - outflow[i];
      daily.push({ date: addDays(today, i), balance: round2(balance) });
    }

    let lowestBalance = daily[0].balance;
    let lowestBalanceDate = daily[0].date;
    let shortfallDate: string | null = null;
    for (const point of daily) {
      if (point.balance < lowestBalance) {
        lowestBalance = point.balance;
        lowestBalanceDate = point.date;
      }
      if (shortfallDate === null && point.balance < 0) {
        shortfallDate = point.date;
      }
    }

    const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');

    const explanation =
      shortfallDate !== null
        ? `Cash goes below zero on ${shortfallDate}. The lowest balance is Rs ${fmt(lowestBalance)} on ${lowestBalanceDate}, so you need about Rs ${fmt(-lowestBalance)} more to stay above zero over the next ${horizon} days.`
        : `Cash stays above zero for the next ${horizon} days. The lowest balance is Rs ${fmt(lowestBalance)} on ${lowestBalanceDate}.`;

    return NextResponse.json({
      days: horizon,
      starting_cash: round2(startingCash),
      lowest_balance: lowestBalance,
      lowest_balance_date: lowestBalanceDate,
      shortfall_date: shortfallDate,
      daily,
      explanation,
    });
  } catch (error) {
    console.error('GET /api/cash-forecast failed', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
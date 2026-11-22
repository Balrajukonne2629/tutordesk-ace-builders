import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const SCENARIO_TYPES = [
  'customer_pays_late',
  'customer_does_not_pay',
  'unexpected_expense',
  'everyone_on_time',
] as const;
type ScenarioType = (typeof SCENARIO_TYPES)[number];

const PRESETS = ['biggest_payer_15_days_late'] as const;
const PRESET_DAYS_LATE = 15;
const HORIZONS: readonly number[] = [30, 60, 90];
const MAX_DAYS_LATE = 90;
const OPEN_STATUSES: readonly string[] = ['sent', 'partial', 'overdue'];
const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 86_400_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface Entry {
  date: string;
  amount: number;
}

interface FeeEntry extends Entry {
  customerId: string;
}

interface OpenInvoice {
  customerId: string;
  dueDate: string;
  balance: number;
}

interface Ctx {
  today: string;
  startingCash: number;
  customerIds: Set<string>;
  biggestPayerId: string | null;
  openInvoices: OpenInvoice[];
  avgDelay: Map<string, number>;
  feeInflows: FeeEntry[];
  billOutflows: Entry[];
}

interface ForecastOptions {
  lateCustomerId?: string | null;
  lateDays?: number;
  excludeCustomerId?: string | null;
  expense?: Entry | null;
  everyoneOnTime?: boolean;
}

interface ForecastResult {
  daily: { date: string; balance: number }[];
  lowest_balance: number;
  shortfall_date: string | null;
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function isScenarioType(value: string | null): value is ScenarioType {
  return value !== null && (SCENARIO_TYPES as readonly string[]).includes(value);
}

function toNum(value: unknown): number {
  const n = Number(String(value));
  return Number.isFinite(n) ? n : 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function todayIst(): string {
  return toDateStr(new Date(Date.now() + IST_OFFSET_MS));
}

function addDays(dateStr: string, n: number): string {
  return toDateStr(new Date(Date.parse(`${dateStr}T00:00:00Z`) + n * DAY_MS));
}

function diffDays(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS,
  );
}

function dateInMonth(year: number, month: number, day: number): string {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return toDateStr(new Date(Date.UTC(year, month, Math.min(day, lastDay))));
}

function monthsFrom(today: string, count: number): { year: number; month: number }[] {
  const [y, mo] = today.split('-').map(Number);
  return Array.from({ length: count }, (_, m) => {
    const d = new Date(Date.UTC(y, mo - 1 + m, 1));
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
  });
}

function yearMonthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

async function buildContext(today: string): Promise<Ctx> {
  const [profile, paymentAgg, customers, invoices, bills] = await Promise.all([
    db.tutorProfile.findFirst({ orderBy: { createdAt: 'asc' } }),
    db.payment.aggregate({ _sum: { amount: true } }),
    db.customer.findMany({
      select: { id: true, monthlyFee: true, billingDay: true, isActive: true },
      orderBy: { monthlyFee: 'desc' },
    }),
    db.invoice.findMany({
      include: { payments: { select: { amount: true, receivedOn: true } } },
    }),
    db.bill.findMany({
      select: {
        amount: true,
        dueDate: true,
        isRecurring: true,
        status: true,
        paidOn: true,
      },
    }),
  ]);

  const opening = profile ? toNum(profile.openingCashBalance) : 0;
  const collected = toNum(paymentAgg._sum.amount);
  const billsPaid = bills
    .filter((b) => b.paidOn !== null && toDateStr(b.paidOn) <= today)
    .reduce((sum, b) => sum + toNum(b.amount), 0);
  const startingCash = round2(opening + collected - billsPaid);

  let biggestPayerId: string | null = null;
  let topFee = -1;
  for (const c of customers) {
    if (!c.isActive) continue;
    const fee = toNum(c.monthlyFee);
    if (fee > topFee) {
      topFee = fee;
      biggestPayerId = c.id;
    }
  }

  const openInvoices: OpenInvoice[] = [];
  const paidHistory = new Map<string, { finalDate: string; days: number }[]>();
  const invoiceMonthKeys = new Set<string>();

  for (const inv of invoices) {
    const dueDate = toDateStr(inv.dueDate);
    const paid = inv.payments.reduce((sum, p) => sum + toNum(p.amount), 0);

    if (inv.billingMonth) {
      invoiceMonthKeys.add(`${inv.customerId}|${toDateStr(inv.billingMonth).slice(0, 7)}`);
    }

    if (inv.status === 'paid' && inv.payments.length > 0) {
      const finalDate = inv.payments.reduce((max, p) => {
        const d = toDateStr(p.receivedOn);
        return d > max ? d : max;
      }, '');
      const list = paidHistory.get(inv.customerId) ?? [];
      list.push({ finalDate, days: diffDays(dueDate, finalDate) });
      paidHistory.set(inv.customerId, list);
    }

    if (OPEN_STATUSES.includes(inv.status)) {
      const balance = round2(toNum(inv.totalAmount) - paid);
      if (balance > 0) {
        openInvoices.push({ customerId: inv.customerId, dueDate, balance });
      }
    }
  }

  const avgDelay = new Map<string, number>();
  for (const [customerId, list] of paidHistory) {
    const lastThree = [...list]
      .sort((a, b) => b.finalDate.localeCompare(a.finalDate))
      .slice(0, 3);
    const mean = lastThree.reduce((sum, x) => sum + x.days, 0) / lastThree.length;
    avgDelay.set(customerId, Math.max(0, Math.round(mean)));
  }

  const months = monthsFrom(today, 4);

  const feeInflows: FeeEntry[] = [];
  for (const c of customers) {
    if (!c.isActive) continue;
    for (const { year, month } of months) {
      if (invoiceMonthKeys.has(`${c.id}|${yearMonthKey(year, month)}`)) continue;
      const date = dateInMonth(year, month, c.billingDay);
      if (date < today) continue;
      feeInflows.push({ customerId: c.id, date, amount: toNum(c.monthlyFee) });
    }
  }

  const billOutflows: Entry[] = [];
  for (const b of bills) {
    const amount = toNum(b.amount);
    if (b.isRecurring) {
      const dueDay = Number(toDateStr(b.dueDate).slice(8, 10));
      months.forEach(({ year, month }, m) => {
        if (m === 0 && b.status === 'paid') return;
        const date = dateInMonth(year, month, dueDay);
        if (date >= today) billOutflows.push({ date, amount });
      });
    } else if (b.status === 'unpaid') {
      billOutflows.push({ date: toDateStr(b.dueDate), amount });
    }
  }

  return {
    today,
    startingCash,
    customerIds: new Set(customers.map((c) => c.id)),
    biggestPayerId,
    openInvoices,
    avgDelay,
    feeInflows,
    billOutflows,
  };
}

function simulate(
  startingCash: number,
  horizon: number,
  today: string,
  inflows: Entry[],
  outflows: Entry[],
): ForecastResult {
  const end = addDays(today, horizon);
  const clampAndFilter = (entries: Entry[]): Entry[] =>
    entries
      .map((e) => ({ date: e.date < today ? today : e.date, amount: e.amount }))
      .filter((e) => e.date < end);

  const ins = clampAndFilter(inflows);
  const outs = clampAndFilter(outflows);

  const daily: { date: string; balance: number }[] = [];
  let lowest = Number.POSITIVE_INFINITY;
  let shortfall: string | null = null;

  for (let i = 0; i < horizon; i++) {
    const date = addDays(today, i);
    let balance = startingCash;
    for (const e of ins) if (e.date <= date) balance += e.amount;
    for (const e of outs) if (e.date <= date) balance -= e.amount;
    balance = round2(balance);

    daily.push({ date, balance });
    if (balance < lowest) lowest = balance;
    if (shortfall === null && balance < 0) shortfall = date;
  }

  return {
    daily,
    lowest_balance: round2(lowest),
    shortfall_date: shortfall,
  };
}

function forecast(ctx: Ctx, opts: ForecastOptions, horizon: number): ForecastResult {
  const inflows: Entry[] = [];

  for (const inv of ctx.openInvoices) {
    if (opts.excludeCustomerId && opts.excludeCustomerId === inv.customerId) continue;

    let delay = opts.everyoneOnTime ? 0 : (ctx.avgDelay.get(inv.customerId) ?? 0);
    if (
      opts.lateCustomerId &&
      opts.lateCustomerId === inv.customerId &&
      opts.lateDays !== undefined
    ) {
      delay = opts.lateDays;
    }
    inflows.push({ date: addDays(inv.dueDate, delay), amount: inv.balance });
  }

  for (const fee of ctx.feeInflows) {
    if (opts.excludeCustomerId && opts.excludeCustomerId === fee.customerId) continue;
    inflows.push({ date: fee.date, amount: fee.amount });
  }

  const outflows: Entry[] = [...ctx.billOutflows];
  if (opts.expense) outflows.push(opts.expense);

  return simulate(ctx.startingCash, horizon, ctx.today, inflows, outflows);
}

function scenarioOptions(
  scenario: ScenarioType,
  customerId: string | null,
  daysLate: number,
  expense: Entry | null,
): ForecastOptions {
  switch (scenario) {
    case 'customer_pays_late':
      return { lateCustomerId: customerId, lateDays: daysLate };
    case 'customer_does_not_pay':
      return { excludeCustomerId: customerId };
    case 'unexpected_expense':
      return { expense };
    case 'everyone_on_time':
      return { everyoneOnTime: true };
  }
}

function shortfallDelta(baseline: string | null, scenario: string | null): number | null {
  if (baseline === null && scenario === null) return 0;
  if (baseline === null || scenario === null) return null;
  return diffDays(baseline, scenario);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const today = todayIst();

  const horizon = Number(params.get('days') ?? '90');
  if (!HORIZONS.includes(horizon)) {
    return badRequest('Choose a 30, 60 or 90 day horizon.');
  }

  const presetParam = params.get('preset');
  const scenarioParam = params.get('scenario');
  const usingPreset = presetParam !== null && presetParam !== '';

  let scenario: ScenarioType;
  if (usingPreset) {
    if (!(PRESETS as readonly string[]).includes(presetParam as string)) {
      return badRequest('Choose one of the listed preset scenarios.');
    }
    scenario = 'customer_pays_late';
  } else {
    if (!isScenarioType(scenarioParam)) {
      return badRequest('Choose a scenario type to see the what-if result.');
    }
    scenario = scenarioParam;
  }

  let daysLate = PRESET_DAYS_LATE;
  if (scenario === 'customer_pays_late' && !usingPreset) {
    const raw = params.get('days_late');
    const n = raw === null || raw.trim() === '' ? NaN : Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > MAX_DAYS_LATE) {
      return badRequest('Enter a number of days between 1 and 90.');
    }
    daysLate = n;
  }

  let expense: Entry | null = null;
  if (scenario === 'unexpected_expense') {
    const raw = params.get('expense_amount');
    const amount = raw === null || raw.trim() === '' ? NaN : Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) {
      return badRequest('Enter an expense amount greater than Rs 0.');
    }

    const dateRaw = params.get('expense_date');
    let expenseDate = today;
    if (dateRaw) {
      if (!DATE_RE.test(dateRaw) || Number.isNaN(Date.parse(`${dateRaw}T00:00:00Z`))) {
        return badRequest('Enter a valid expense date (YYYY-MM-DD).');
      }
      expenseDate = dateRaw;
    }
    expense = { date: expenseDate, amount: round2(amount) };
  }

  try {
    const ctx = await buildContext(today);

    let customerId: string | null = null;
    if (usingPreset) {
      customerId = ctx.biggestPayerId;
    } else {
      const customerParam = params.get('customer_id')?.trim() ?? '';
      customerId = customerParam || null;
    }

    if (scenario === 'customer_pays_late' || scenario === 'customer_does_not_pay') {
      if (!customerId || !ctx.customerIds.has(customerId)) {
        return badRequest('Pick a customer for this scenario.');
      }
    }

    const baseline = forecast(ctx, {}, horizon);
    const scenarioResult = forecast(
      ctx,
      scenarioOptions(scenario, customerId, daysLate, expense),
      horizon,
    );

    return NextResponse.json({
      baseline: {
        daily: baseline.daily,
        lowest_balance: baseline.lowest_balance,
        shortfall_date: baseline.shortfall_date,
      },
      scenario: {
        daily: scenarioResult.daily,
        lowest_balance: scenarioResult.lowest_balance,
        shortfall_date: scenarioResult.shortfall_date,
      },
      lowest_balance_delta: round2(
        scenarioResult.lowest_balance - baseline.lowest_balance,
      ),
      shortfall_date_delta_days: shortfallDelta(
        baseline.shortfall_date,
        scenarioResult.shortfall_date,
      ),
    });
  } catch (error) {
    console.error('what-if-scenarios failed', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
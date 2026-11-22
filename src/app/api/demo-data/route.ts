import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Demo seed is anchored to a fixed reference date (2025-06-15). Every relative
// date (due dates, paid_on, billing months) is derived from SEED_YEAR so repeated
// loads produce identical rows. Overdue buckets are measured against the
// reference date: 1-7 days, 8-30 days and 30+ days late.

const SEED_YEAR = 2025;
const BILL_MONTHS = [4, 5, 6, 7, 8];
const PAID_BILL_MONTHS = [4, 5];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const METHODS = ['upi', 'cash', 'upi', 'bank'] as const;

type InvoiceStatus = NonNullable<Prisma.InvoiceCreateManyInput['status']>;

type SeedStudent = {
  parentName: string;
  studentName: string;
  subject: string;
  monthlyFee: number;
  billingDay: number;
};

const STUDENTS: SeedStudent[] = [
  { parentName: 'Sunita Rao', studentName: 'Ishaan Rao', subject: 'Maths', monthlyFee: 1500, billingDay: 2 },
  { parentName: 'Vikram Shah', studentName: 'Diya Shah', subject: 'English', monthlyFee: 1500, billingDay: 6 },
  { parentName: 'Meera Iyer', studentName: 'Ananya Iyer', subject: 'Science', monthlyFee: 1800, billingDay: 9 },
  { parentName: 'Arun Nair', studentName: 'Kabir Nair', subject: 'Maths', monthlyFee: 2000, billingDay: 13 },
  { parentName: 'Priya Menon', studentName: 'Riya Menon', subject: 'Physics', monthlyFee: 2000, billingDay: 17 },
  { parentName: 'Suresh Kumar', studentName: 'Aditya Kumar', subject: 'Chemistry', monthlyFee: 2200, billingDay: 20 },
  { parentName: 'Lakshmi Reddy', studentName: 'Sneha Reddy', subject: 'Maths', monthlyFee: 2500, billingDay: 22 },
  { parentName: 'Rajesh Patil', studentName: 'Tanvi Patil', subject: 'Biology', monthlyFee: 2500, billingDay: 24 },
  { parentName: 'Farah Khan', studentName: 'Zoya Khan', subject: 'English', monthlyFee: 2500, billingDay: 26 },
  { parentName: 'Harish Gupta', studentName: 'Arjun Gupta', subject: 'Maths', monthlyFee: 2800, billingDay: 3 },
  { parentName: 'Nandini Das', studentName: 'Pihu Das', subject: 'Science', monthlyFee: 3000, billingDay: 5 },
  { parentName: 'Imran Sheikh', studentName: 'Hamza Sheikh', subject: 'Maths', monthlyFee: 3000, billingDay: 8 },
  { parentName: 'Kavita Joshi', studentName: 'Rhea Joshi', subject: 'Physics', monthlyFee: 3200, billingDay: 11 },
  { parentName: 'Manoj Pillai', studentName: 'Nikhil Pillai', subject: 'Chemistry', monthlyFee: 3500, billingDay: 14 },
  { parentName: 'Deepa Shetty', studentName: 'Ira Shetty', subject: 'Maths', monthlyFee: 3500, billingDay: 16 },
  { parentName: 'Anil Verma', studentName: 'Kiara Verma', subject: 'Maths', monthlyFee: 4000, billingDay: 19 },
];

const BILL_TEMPLATES: {
  name: string;
  category: 'rent' | 'internet' | 'materials';
  amount: number;
  dueDay: number;
}[] = [
  { name: 'Rent', category: 'rent', amount: 8000, dueDay: 1 },
  { name: 'Internet', category: 'internet', amount: 700, dueDay: 5 },
  { name: 'Materials', category: 'materials', amount: 1500, dueDay: 10 },
];

const pad = (n: number): string => String(n).padStart(2, '0');

const day = (month: number, dayOfMonth: number): Date =>
  new Date(Date.UTC(SEED_YEAR, month - 1, dayOfMonth));

type InvoicePlan = {
  customerId: string;
  seq: number;
  student: SeedStudent;
  month: number;
  due: Date;
  status: InvoiceStatus;
  paid: number;
  paidOn: Date | null;
};

// May plan: first two paid, one partial, then a spread of overdue buckets
// (1-7, 8-30, 30+ days late against the reference date) and two not yet due.
function mayPlan(index: number, fee: number): Pick<InvoicePlan, 'due' | 'status' | 'paid' | 'paidOn'> {
  if (index < 2) {
    return { due: day(5, 10), status: 'paid', paid: fee, paidOn: day(5, 7 + index) };
  }
  if (index === 2) {
    return { due: day(5, 25), status: 'partial', paid: 1000, paidOn: day(5, 12) };
  }
  if (index <= 5) {
    return { due: day(6, 10), status: 'overdue', paid: 0, paidOn: null };
  }
  if (index <= 10) {
    return { due: day(5, 25), status: 'overdue', paid: 0, paidOn: null };
  }
  if (index <= 12) {
    return { due: day(5, 5), status: 'overdue', paid: 0, paidOn: null };
  }
  return { due: day(6, 25), status: 'sent', paid: 0, paidOn: null };
}

function buildSeed() {
  const customers: Prisma.CustomerCreateManyInput[] = [];
  const invoices: Prisma.InvoiceCreateManyInput[] = [];
  const lineItems: Prisma.InvoiceLineItemCreateManyInput[] = [];
  const payments: Prisma.PaymentCreateManyInput[] = [];
  const bills: Prisma.BillCreateManyInput[] = [];

  const addInvoice = (plan: InvoicePlan): void => {
    const { customerId, seq, student, month, due, status, paid, paidOn } = plan;
    const invoiceId = randomUUID();
    const issued = day(month, 1);

    invoices.push({
      id: invoiceId,
      invoiceNumber: `DEMO-${SEED_YEAR}-${pad(month)}-${pad(seq)}`,
      customerId,
      billingMonth: issued,
      issuedDate: issued,
      dueDate: due,
      totalAmount: student.monthlyFee,
      status,
      sentAt: issued,
      paidAt: status === 'paid' ? paidOn : null,
      isDemo: true,
    });

    lineItems.push({
      id: randomUUID(),
      invoiceId,
      description: `${student.subject} tuition, ${MONTH_NAMES[month - 1]} ${SEED_YEAR}`,
      quantity: 1,
      unitPrice: student.monthlyFee,
      amount: student.monthlyFee,
      isDemo: true,
    });

    if (paid > 0 && paidOn) {
      payments.push({
        id: randomUUID(),
        customerId,
        invoiceId,
        amount: paid,
        receivedOn: paidOn,
        method: METHODS[seq % METHODS.length],
        source: 'manual',
        isDemo: true,
      });
    }
  };

  STUDENTS.forEach((student, index) => {
    const customerId = randomUUID();

    customers.push({
      id: customerId,
      parentName: student.parentName,
      studentName: student.studentName,
      phone: `98000000${pad(index + 1)}`,
      subject: student.subject,
      monthlyFee: student.monthlyFee,
      billingDay: student.billingDay,
      isActive: true,
      isDemo: true,
    });

    addInvoice({
      customerId,
      seq: index + 1,
      student,
      month: 4,
      due: day(4, 10),
      status: 'paid',
      paid: student.monthlyFee,
      paidOn: day(4, 4 + (index % 6)),
    });

    const may = mayPlan(index, student.monthlyFee);
    addInvoice({
      customerId,
      seq: index + 1,
      student,
      month: 5,
      ...may,
    });
  });

  for (const month of BILL_MONTHS) {
    const isPaid = PAID_BILL_MONTHS.includes(month);
    for (const template of BILL_TEMPLATES) {
      const dueDate = day(month, template.dueDay);
      bills.push({
        id: randomUUID(),
        name: template.name,
        category: template.category,
        amount: template.amount,
        dueDate,
        isRecurring: true,
        status: isPaid ? 'paid' : 'unpaid',
        paidOn: isPaid ? dueDate : null,
        isDemo: true,
      });
    }
  }

  return { customers, invoices, lineItems, payments, bills };
}

// Removes only demo rows. Order respects foreign keys: reminders before alerts,
// payments before invoices and customers, line items before invoices.
// Index 5 is the bills deleteMany, used for bills_removed.
function resetOperations() {
  return [
    db.reminder.deleteMany({ where: { isDemo: true } }),
    db.alert.deleteMany({ where: { isDemo: true } }),
    db.payment.deleteMany({ where: { isDemo: true } }),
    db.invoiceLineItem.deleteMany({ where: { isDemo: true } }),
    db.invoice.deleteMany({ where: { isDemo: true } }),
    db.bill.deleteMany({ where: { isDemo: true } }),
    db.customer.deleteMany({ where: { isDemo: true } }),
  ];
}

const BILLS_DELETE_INDEX = 5;

export async function GET(request: Request) {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [alerts, reminders, payments, invoiceLineItems, invoices, bills, customers] =
      await Promise.all([
        db.alert.count({ where: { isDemo: true } }),
        db.reminder.count({ where: { isDemo: true } }),
        db.payment.count({ where: { isDemo: true } }),
        db.invoiceLineItem.count({ where: { isDemo: true } }),
        db.invoice.count({ where: { isDemo: true } }),
        db.bill.count({ where: { isDemo: true } }),
        db.customer.count({ where: { isDemo: true } }),
      ]);

    const loaded = [alerts, reminders, payments, invoiceLineItems, invoices, bills, customers]
      .some((n) => n > 0);

    return NextResponse.json({
      demoData: {
        loaded,
        alerts,
        reminders,
        payments,
        invoice_line_items: invoiceLineItems,
        invoices,
        bills,
        customers,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const seed = buildSeed();

    // Reset and reload in one transaction so a failed load never leaves a
    // half-seeded state. Repeated calls replace existing demo rows.
    await db.$transaction([
      ...resetOperations(),
      db.customer.createMany({ data: seed.customers }),
      db.invoice.createMany({ data: seed.invoices }),
      db.invoiceLineItem.createMany({ data: seed.lineItems }),
      db.payment.createMany({ data: seed.payments }),
      db.bill.createMany({ data: seed.bills }),
    ]);

    return NextResponse.json({ bills: seed.bills.length });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const results = await db.$transaction(resetOperations());
    const billsRemoved = results[BILLS_DELETE_INDEX]?.count ?? 0;

    return NextResponse.json({ bills_removed: billsRemoved });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
// Demo data — rendered by the pipeline from prisma/schema.prisma. One account per
// role (<role>@example.com, password DEMO_PASSWORD from .env) plus demo@example.com, then every table,
// parents first. Every insert is non-fatal; safe to run again.
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const ids: Record<string, Array<string | number>> = {};
const users: Record<string, string | number> = {};
function pick(model: string, i: number): string | number | undefined {
  const list = ids[model] || [];
  return list.length ? list[i % list.length] : undefined;
}
function why(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  return m.split('\n').filter(Boolean).slice(-1)[0]?.slice(0, 200) ?? m;
}

async function main() {
  console.log('[seed] demo-user: MISSING — this app has no user model');
  try {
    if ((await db.alert.count()) === 0) {
      const rows: Array<() => Record<string, unknown>> = [
        () => ({ alertType: "overdue_chase", severity: "critical", message: "Ananya's April fee Rs 2500 is 3 days overdue", actionLabel: "Send reminder", status: "open", snoozedUntil: new Date("2025-04-18T09:00:00.000Z"), dismissedAt: new Date("2025-04-14T11:00:00.000Z"), actedAt: new Date("2025-04-07T10:20:00.000Z"), shortfallDate: new Date("2025-05-01T00:00:00.000Z"), dueDate: new Date("2025-04-12T00:00:00.000Z"), customerId: pick("Customer", 0), invoiceId: pick("Invoice", 0), billId: pick("Bill", 0), dedupeKey: "overdue_chase:TD-2025-031 #1", isDemo: true }),
        () => ({ alertType: "bill_due_low_cash", severity: "warning", message: "Mobile recharge Rs 399 due tomorrow", actionLabel: "Mark as paid", status: "open", snoozedUntil: new Date("2025-04-18T09:00:00.000Z"), dismissedAt: new Date("2025-04-14T11:00:00.000Z"), actedAt: new Date("2025-04-07T10:20:00.000Z"), shortfallDate: new Date("2025-05-01T00:00:00.000Z"), dueDate: new Date("2025-04-16T00:00:00.000Z"), customerId: pick("Customer", 1), invoiceId: pick("Invoice", 1), billId: pick("Bill", 1), dedupeKey: "bill_due_low_cash:jio-recharge-2025-04 #2", isDemo: true }),
        () => ({ alertType: "forecast_shortfall", severity: "critical", message: "Cash may fall Rs 4,200 short on 1 May for rent", actionLabel: "Review forecast", status: "open", snoozedUntil: new Date("2025-04-18T09:00:00.000Z"), dismissedAt: new Date("2025-04-14T11:00:00.000Z"), actedAt: new Date("2025-04-07T10:20:00.000Z"), shortfallDate: new Date("2025-05-01T00:00:00.000Z"), dueDate: new Date("2025-05-01T00:00:00.000Z"), customerId: pick("Customer", 2), invoiceId: pick("Invoice", 2), billId: pick("Bill", 2), dedupeKey: "forecast_shortfall:2025-05-01 #3", isDemo: true }),
        () => ({ alertType: "bill_due_low_cash", severity: "warning", message: "Rent Rs 12000 due 1 May; balance covers Rs 9,800", actionLabel: "Plan payments", status: "snoozed", snoozedUntil: new Date("2025-04-18T09:00:00.000Z"), dismissedAt: new Date("2025-04-14T11:00:00.000Z"), actedAt: new Date("2025-04-07T10:20:00.000Z"), shortfallDate: new Date("2025-05-01T00:00:00.000Z"), dueDate: new Date("2025-05-01T00:00:00.000Z"), customerId: pick("Customer", 3), invoiceId: pick("Invoice", 3), billId: pick("Bill", 3), dedupeKey: "bill_due_low_cash:rent-2025-05 #4", isDemo: true }),
        () => ({ alertType: "billing_day_reached", severity: "info", message: "Billing day reached for Sai Rao. April invoice is ready", actionLabel: "Review and send", status: "acted", snoozedUntil: new Date("2025-04-18T09:00:00.000Z"), dismissedAt: new Date("2025-04-14T11:00:00.000Z"), actedAt: new Date("2025-04-07T10:20:00.000Z"), shortfallDate: new Date("2025-05-01T00:00:00.000Z"), dueDate: new Date("2025-04-17T00:00:00.000Z"), customerId: pick("Customer", 4), invoiceId: pick("Invoice", 4), billId: pick("Bill", 4), dedupeKey: "billing_day_reached:sai-rao-2025-04 #5", isDemo: true }),
        () => ({ alertType: "final_notice", severity: "critical", message: "Zoya's Rs 1500 balance is 2 days overdue", actionLabel: "Send final notice", status: "dismissed", snoozedUntil: new Date("2025-04-18T09:00:00.000Z"), dismissedAt: new Date("2025-04-14T11:00:00.000Z"), actedAt: new Date("2025-04-07T10:20:00.000Z"), shortfallDate: new Date("2025-05-01T00:00:00.000Z"), dueDate: new Date("2025-04-17T00:00:00.000Z"), customerId: pick("Customer", 5), invoiceId: pick("Invoice", 5), billId: pick("Bill", 5), dedupeKey: "final_notice:TD-2025-033 #6", isDemo: true }),
      ];
      let ok = 0;
      for (const row of rows) {
        try {
          const r = await db.alert.create({ data: row() as never });
          (ids["Alert"] ??= []).push((r as { id: string | number }).id);
          ok++;
        } catch (e) {
          console.log('[seed] Alert row skipped: ' + why(e));
        }
      }
      console.log(`[seed] Alert: ${ok}/${rows.length} rows`);
    } else {
      ids["Alert"] = (await db.alert.findMany({ take: 50, select: { id: true } } as never) as Array<{ id: string | number }>).map((r) => r.id);
    }
  } catch (e) {
    console.log('[seed] Alert skipped: ' + why(e));
  }
  try {
    if ((await db.bill.count()) === 0) {
      const rows: Array<() => Record<string, unknown>> = [
        () => ({ name: "Flat rent - Koramangala", category: "rent", amount: 12000, dueDate: new Date("2025-05-01T00:00:00.000Z"), isRecurring: true, status: "unpaid", paidOn: new Date("2025-04-03T00:00:00.000Z"), isDemo: true }),
        () => ({ name: "Broadband - ACT Fibernet", category: "internet", amount: 899, dueDate: new Date("2025-04-20T00:00:00.000Z"), isRecurring: true, status: "unpaid", paidOn: new Date("2025-04-03T00:00:00.000Z"), isDemo: true }),
        () => ({ name: "Whiteboard markers and worksheets", category: "materials", amount: 650, dueDate: new Date("2025-04-05T00:00:00.000Z"), isRecurring: false, status: "paid", paidOn: new Date("2025-04-03T00:00:00.000Z"), isDemo: true }),
        () => ({ name: "Mobile recharge - Jio", category: "other", amount: 399, dueDate: new Date("2025-04-16T00:00:00.000Z"), isRecurring: true, status: "unpaid", paidOn: new Date("2025-03-27T00:00:00.000Z"), isDemo: true }),
        () => ({ name: "Printer ink cartridges", category: "materials", amount: 1100, dueDate: new Date("2025-04-25T00:00:00.000Z"), isRecurring: false, status: "unpaid", paidOn: new Date("2025-03-27T00:00:00.000Z"), isDemo: true }),
        () => ({ name: "Scheduling app subscription", category: "other", amount: 499, dueDate: new Date("2025-03-28T00:00:00.000Z"), isRecurring: true, status: "paid", paidOn: new Date("2025-03-27T00:00:00.000Z"), isDemo: true }),
      ];
      let ok = 0;
      for (const row of rows) {
        try {
          const r = await db.bill.create({ data: row() as never });
          (ids["Bill"] ??= []).push((r as { id: string | number }).id);
          ok++;
        } catch (e) {
          console.log('[seed] Bill row skipped: ' + why(e));
        }
      }
      console.log(`[seed] Bill: ${ok}/${rows.length} rows`);
    } else {
      ids["Bill"] = (await db.bill.findMany({ take: 50, select: { id: true } } as never) as Array<{ id: string | number }>).map((r) => r.id);
    }
  } catch (e) {
    console.log('[seed] Bill skipped: ' + why(e));
  }
  try {
    if ((await db.customer.count()) === 0) {
      const rows: Array<() => Record<string, unknown>> = [
        () => ({ parentName: "Sunita Iyer", studentName: "Ananya Iyer", phone: "+91 98450 11203", subject: "Maths (Class 10)", monthlyFee: 2500, billingDay: 5, isActive: true, isDemo: true }),
        () => ({ parentName: "Rakesh Gowda", studentName: "Kiran Gowda", phone: "+91 99012 45876", subject: "Science (Class 8)", monthlyFee: 2000, billingDay: 1, isActive: true, isDemo: true }),
        () => ({ parentName: "Farhana Sheikh", studentName: "Zoya Sheikh", phone: "+91 97410 36582", subject: "Physics (Class 12)", monthlyFee: 3500, billingDay: 10, isActive: true, isDemo: true }),
        () => ({ parentName: "Mohan Reddy", studentName: "Teja Reddy", phone: "+91 98661 20734", subject: "English (Class 7)", monthlyFee: 1800, billingDay: 3, isActive: true, isDemo: true }),
        () => ({ parentName: "Priya Nair", studentName: "Aarav Nair", phone: "+91 90039 77145", subject: "Maths (Class 6)", monthlyFee: 1500, billingDay: 1, isActive: false, isDemo: true }),
        () => ({ parentName: "Deepak Joshi", studentName: "Riya Joshi", phone: "+91 98230 54198", subject: "Maths (Class 9)", monthlyFee: 2200, billingDay: 15, isActive: true, isDemo: true }),
        () => ({ parentName: "Lakshmi Rao", studentName: "Sai Rao", phone: "+91 88707 62013", subject: "Chemistry (Class 11)", monthlyFee: 3000, billingDay: 7, isActive: true, isDemo: true }),
      ];
      let ok = 0;
      for (const row of rows) {
        try {
          const r = await db.customer.create({ data: row() as never });
          (ids["Customer"] ??= []).push((r as { id: string | number }).id);
          ok++;
        } catch (e) {
          console.log('[seed] Customer row skipped: ' + why(e));
        }
      }
      console.log(`[seed] Customer: ${ok}/${rows.length} rows`);
    } else {
      ids["Customer"] = (await db.customer.findMany({ take: 50, select: { id: true } } as never) as Array<{ id: string | number }>).map((r) => r.id);
    }
  } catch (e) {
    console.log('[seed] Customer skipped: ' + why(e));
  }
  try {
    if ((await db.tutorProfile.count()) === 0) {
      const rows: Array<() => Record<string, unknown>> = [
        () => ({ name: "Meera Krishnan", upiId: "meera.tutor@okaxis", openingCashBalance: 18500, onboardingCompleted: true }),
        () => ({ name: "Suresh Babu", upiId: "anjali.d@ybl", openingCashBalance: 7200, onboardingCompleted: false }),
        () => ({ name: "Anjali Deshpande", upiId: "anjali.d@ybl", openingCashBalance: 9200, onboardingCompleted: true }),
        () => ({ name: "Rahul Menon", upiId: "rahul.menon@paytm", openingCashBalance: 12750, onboardingCompleted: true }),
      ];
      let ok = 0;
      for (const row of rows) {
        try {
          const r = await db.tutorProfile.create({ data: row() as never });
          (ids["TutorProfile"] ??= []).push((r as { id: string | number }).id);
          ok++;
        } catch (e) {
          console.log('[seed] TutorProfile row skipped: ' + why(e));
        }
      }
      console.log(`[seed] TutorProfile: ${ok}/${rows.length} rows`);
    } else {
      ids["TutorProfile"] = (await db.tutorProfile.findMany({ take: 50, select: { id: true } } as never) as Array<{ id: string | number }>).map((r) => r.id);
    }
  } catch (e) {
    console.log('[seed] TutorProfile skipped: ' + why(e));
  }
  try {
    if ((await db.invoice.count()) === 0) {
      const rows: Array<() => Record<string, unknown>> = [
        () => ({ invoiceNumber: "TD-2025-029 #1", customerId: pick("Customer", 0), billingMonth: new Date("2025-03-01T00:00:00.000Z"), issuedDate: new Date("2025-03-15T00:00:00.000Z"), dueDate: new Date("2025-03-22T00:00:00.000Z"), totalAmount: 2200, status: "paid", sentAt: new Date("2025-03-15T10:05:00.000Z"), paidAt: new Date("2025-03-30T16:42:00.000Z"), isDemo: true }),
        () => ({ invoiceNumber: "TD-2025-031 #2", customerId: pick("Customer", 1), billingMonth: new Date("2025-04-01T00:00:00.000Z"), issuedDate: new Date("2025-04-05T00:00:00.000Z"), dueDate: new Date("2025-04-12T00:00:00.000Z"), totalAmount: 2500, status: "overdue", sentAt: new Date("2025-04-05T09:20:00.000Z"), paidAt: new Date("2025-04-06T11:30:00.000Z"), isDemo: true }),
        () => ({ invoiceNumber: "TD-2025-032 #3", customerId: pick("Customer", 2), billingMonth: new Date("2025-04-01T00:00:00.000Z"), issuedDate: new Date("2025-04-01T00:00:00.000Z"), dueDate: new Date("2025-04-08T00:00:00.000Z"), totalAmount: 2000, status: "paid", sentAt: new Date("2025-04-01T08:45:00.000Z"), paidAt: new Date("2025-04-06T11:30:00.000Z"), isDemo: true }),
        () => ({ invoiceNumber: "TD-2025-033 #4", customerId: pick("Customer", 3), billingMonth: new Date("2025-04-01T00:00:00.000Z"), issuedDate: new Date("2025-04-10T00:00:00.000Z"), dueDate: new Date("2025-04-17T00:00:00.000Z"), totalAmount: 3500, status: "partial", sentAt: new Date("2025-04-10T19:10:00.000Z"), paidAt: new Date("2025-03-30T16:42:00.000Z"), isDemo: true }),
        () => ({ invoiceNumber: "TD-2025-034 #5", customerId: pick("Customer", 4), billingMonth: new Date("2025-04-01T00:00:00.000Z"), issuedDate: new Date("2025-04-12T00:00:00.000Z"), dueDate: new Date("2025-04-20T00:00:00.000Z"), totalAmount: 1800, status: "sent", sentAt: new Date("2025-04-12T07:55:00.000Z"), paidAt: new Date("2025-03-30T16:42:00.000Z"), isDemo: true }),
        () => ({ invoiceNumber: "TD-2025-035 #6", customerId: pick("Customer", 5), billingMonth: new Date("2025-05-01T00:00:00.000Z"), issuedDate: new Date("2025-05-01T00:00:00.000Z"), dueDate: new Date("2025-05-08T00:00:00.000Z"), totalAmount: 3000, status: "draft", sentAt: new Date("2025-03-15T10:05:00.000Z"), paidAt: new Date("2025-03-30T16:42:00.000Z"), isDemo: true }),
      ];
      let ok = 0;
      for (const row of rows) {
        try {
          const r = await db.invoice.create({ data: row() as never });
          (ids["Invoice"] ??= []).push((r as { id: string | number }).id);
          ok++;
        } catch (e) {
          console.log('[seed] Invoice row skipped: ' + why(e));
        }
      }
      console.log(`[seed] Invoice: ${ok}/${rows.length} rows`);
    } else {
      ids["Invoice"] = (await db.invoice.findMany({ take: 50, select: { id: true } } as never) as Array<{ id: string | number }>).map((r) => r.id);
    }
  } catch (e) {
    console.log('[seed] Invoice skipped: ' + why(e));
  }
  try {
    if ((await db.invoiceLineItem.count()) === 0) {
      const rows: Array<() => Record<string, unknown>> = [
        () => ({ invoiceId: pick("Invoice", 0), description: "Maths tuition - March 2025", quantity: 1, unitPrice: 2200, amount: 2200, isDemo: true }),
        () => ({ invoiceId: pick("Invoice", 1), description: "Maths tuition - April 2025", quantity: 1, unitPrice: 2500, amount: 2500, isDemo: true }),
        () => ({ invoiceId: pick("Invoice", 2), description: "Science tuition - April 2025", quantity: 1, unitPrice: 2000, amount: 2000, isDemo: true }),
        () => ({ invoiceId: pick("Invoice", 3), description: "Physics tuition - April 2025", quantity: 1, unitPrice: 3500, amount: 3500, isDemo: true }),
        () => ({ invoiceId: pick("Invoice", 4), description: "English tuition - April 2025", quantity: 1, unitPrice: 1800, amount: 1800, isDemo: true }),
        () => ({ invoiceId: pick("Invoice", 5), description: "Chemistry tuition - May 2025", quantity: 1, unitPrice: 3000, amount: 3000, isDemo: true }),
      ];
      let ok = 0;
      for (const row of rows) {
        try {
          const r = await db.invoiceLineItem.create({ data: row() as never });
          (ids["InvoiceLineItem"] ??= []).push((r as { id: string | number }).id);
          ok++;
        } catch (e) {
          console.log('[seed] InvoiceLineItem row skipped: ' + why(e));
        }
      }
      console.log(`[seed] InvoiceLineItem: ${ok}/${rows.length} rows`);
    } else {
      ids["InvoiceLineItem"] = (await db.invoiceLineItem.findMany({ take: 50, select: { id: true } } as never) as Array<{ id: string | number }>).map((r) => r.id);
    }
  } catch (e) {
    console.log('[seed] InvoiceLineItem skipped: ' + why(e));
  }
  try {
    if ((await db.payment.count()) === 0) {
      const rows: Array<() => Record<string, unknown>> = [
        () => ({ customerId: pick("Customer", 0), invoiceId: pick("Invoice", 0), amount: 2200, receivedOn: new Date("2025-03-30T00:00:00.000Z"), method: "bank", reference: "NEFT-HDFC88214", source: "manual", isDemo: true }),
        () => ({ customerId: pick("Customer", 1), invoiceId: pick("Invoice", 1), amount: 2000, receivedOn: new Date("2025-04-06T00:00:00.000Z"), method: "upi", reference: "UPI412908731", source: "quick_log", isDemo: true }),
        () => ({ customerId: pick("Customer", 2), invoiceId: pick("Invoice", 2), amount: 2000, receivedOn: new Date("2025-04-14T00:00:00.000Z"), method: "upi", reference: "UPI418830215", source: "quick_log", isDemo: true }),
        () => ({ customerId: pick("Customer", 3), invoiceId: pick("Invoice", 3), amount: 1800, receivedOn: new Date("2025-03-04T00:00:00.000Z"), method: "cash", reference: "UPI407715692", source: "manual", isDemo: true }),
        () => ({ customerId: pick("Customer", 4), invoiceId: pick("Invoice", 4), amount: 3000, receivedOn: new Date("2025-03-08T00:00:00.000Z"), method: "upi", reference: "UPI407715692", source: "quick_log", isDemo: true }),
        () => ({ customerId: pick("Customer", 5), invoiceId: pick("Invoice", 5), amount: 500, receivedOn: new Date("2025-04-11T00:00:00.000Z"), method: "cash", reference: "NEFT-HDFC88214", source: "manual", isDemo: true }),
      ];
      let ok = 0;
      for (const row of rows) {
        try {
          const r = await db.payment.create({ data: row() as never });
          (ids["Payment"] ??= []).push((r as { id: string | number }).id);
          ok++;
        } catch (e) {
          console.log('[seed] Payment row skipped: ' + why(e));
        }
      }
      console.log(`[seed] Payment: ${ok}/${rows.length} rows`);
    } else {
      ids["Payment"] = (await db.payment.findMany({ take: 50, select: { id: true } } as never) as Array<{ id: string | number }>).map((r) => r.id);
    }
  } catch (e) {
    console.log('[seed] Payment skipped: ' + why(e));
  }
  try {
    if ((await db.reminder.count()) === 0) {
      const rows: Array<() => Record<string, unknown>> = [
        () => ({ customerId: pick("Customer", 0), invoiceId: pick("Invoice", 0), alertId: pick("Alert", 0), tone: "friendly", language: "english", messageBody: "Hi Sunita, a gentle reminder that April's maths fee of Rs 2500 for Ananya is still pending. Thank you!", daysLateAtCreation: 3, status: "sent", channel: "whatsapp", sentAt: new Date("2025-04-13T09:30:00.000Z"), isDemo: true, badDayBatchId: "BD-2025-04-14", badDayRank: 1 }),
        () => ({ customerId: pick("Customer", 1), invoiceId: pick("Invoice", 1), alertId: pick("Alert", 1), tone: "firm", language: "hindi", messageBody: "नमस्ते Sunita ji, अप्रैल की फीस ₹2500 अभी बकाया है। कृपया जल्द UPI से भुगतान करें।", daysLateAtCreation: 7, status: "draft", channel: "copy", sentAt: new Date("2025-04-14T18:00:00.000Z"), isDemo: true, badDayBatchId: "BD-2025-04-14", badDayRank: 2 }),
        () => ({ customerId: pick("Customer", 2), invoiceId: pick("Invoice", 2), alertId: pick("Alert", 2), tone: "final_notice", language: "english", messageBody: "Hi Farhana, Rs 1500 balance on Zoya's April fee was due 17 April. Please clear it by 20 April to keep the slot.", daysLateAtCreation: 2, status: "sent", channel: "copy", sentAt: new Date("2025-04-14T18:00:00.000Z"), isDemo: true, badDayBatchId: "BD-2025-04-14", badDayRank: 1 }),
        () => ({ customerId: pick("Customer", 3), invoiceId: pick("Invoice", 3), alertId: pick("Alert", 3), tone: "friendly", language: "telugu", messageBody: "నమస్కారం మోహన్ గారు, తేజ ఏప్రిల్ నెల ఫీజు ₹1800 ఇంకా రావలసి ఉంది. ధన్యవాదాలు.", daysLateAtCreation: 0, status: "draft", channel: "other", sentAt: new Date("2025-04-13T12:15:00.000Z"), isDemo: true, badDayBatchId: "BD-2025-04-14", badDayRank: 1 }),
        () => ({ customerId: pick("Customer", 4), invoiceId: pick("Invoice", 4), alertId: pick("Alert", 4), tone: "firm", language: "english", messageBody: "Hi Sunita, Ananya's April fee of Rs 2500 is now 3 days past due. Please pay via UPI using the ID on your invoice.", daysLateAtCreation: 3, status: "sent", channel: "other", sentAt: new Date("2025-04-13T12:15:00.000Z"), isDemo: true, badDayBatchId: "BD-2025-04-14", badDayRank: 1 }),
      ];
      let ok = 0;
      for (const row of rows) {
        try {
          const r = await db.reminder.create({ data: row() as never });
          (ids["Reminder"] ??= []).push((r as { id: string | number }).id);
          ok++;
        } catch (e) {
          console.log('[seed] Reminder row skipped: ' + why(e));
        }
      }
      console.log(`[seed] Reminder: ${ok}/${rows.length} rows`);
    } else {
      ids["Reminder"] = (await db.reminder.findMany({ take: 50, select: { id: true } } as never) as Array<{ id: string | number }>).map((r) => r.id);
    }
  } catch (e) {
    console.log('[seed] Reminder skipped: ' + why(e));
  }
}

main()
  .then(async () => { await db.$disconnect(); })
  .catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(0); });

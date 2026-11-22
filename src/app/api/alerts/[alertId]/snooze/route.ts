import { NextResponse } from 'next/server';
import { Prisma, AlertStatus } from '@prisma/client';
import { db } from '@/lib/db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const SNOOZE_DURATION_ERROR = 'Choose how long to snooze this alert.';
const SNOOZE_RANGE_ERROR = 'Snooze must end after today and no later than the invoice due date.';

/** Calendar day (YYYY-MM-DD) of an instant in India Standard Time. */
function istDay(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export async function POST(
  request: Request,
  { params }: { params: { alertId: string } },
) {
  const alertId = params.alertId;

  if (!UUID_RE.test(alertId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const raw =
    typeof body === 'object' && body !== null
      ? (body as { snoozed_until?: unknown }).snoozed_until
      : undefined;

  if (typeof raw !== 'string' || raw.trim() === '') {
    return NextResponse.json({ error: SNOOZE_DURATION_ERROR }, { status: 400 });
  }

  const trimmed = raw.trim();
  const parsed = DATE_ONLY_RE.test(trimmed)
    ? new Date(`${trimmed}T00:00:00+05:30`)
    : new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return NextResponse.json({ error: SNOOZE_RANGE_ERROR }, { status: 400 });
  }

  try {
    const alert = await db.alert.findUnique({
      where: { id: alertId },
      select: { id: true, status: true, invoiceId: true, dueDate: true },
    });

    if (!alert) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (alert.status === AlertStatus.acted || alert.status === AlertStatus.dismissed) {
      return NextResponse.json(
        { error: 'This alert has already been acted on or dismissed.' },
        { status: 409 },
      );
    }

    // Upper bound: the linked invoice's due date (or the alert's own due date).
    let dueDate: Date | null = null;
    if (alert.invoiceId) {
      const invoice = await db.invoice.findUnique({
        where: { id: alert.invoiceId },
        select: { dueDate: true },
      });
      dueDate = invoice?.dueDate ?? null;
    }
    if (!dueDate) {
      dueDate = alert.dueDate ?? null;
    }

    const snoozeDay = istDay(parsed);
    const todayDay = istDay(new Date());

    if (snoozeDay <= todayDay) {
      return NextResponse.json({ error: SNOOZE_RANGE_ERROR }, { status: 400 });
    }

    if (dueDate) {
      const dueDay = dueDate.toISOString().slice(0, 10);
      if (snoozeDay > dueDay) {
        return NextResponse.json({ error: SNOOZE_RANGE_ERROR }, { status: 400 });
      }
    }

    const updated = await db.alert.update({
      where: { id: alertId },
      data: {
        status: AlertStatus.snoozed,
        snoozedUntil: parsed,
      },
    });

    return NextResponse.json({ alert: updated });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
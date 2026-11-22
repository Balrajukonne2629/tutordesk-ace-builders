
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ActionTarget = { href: string; label: string };

type AlertForTarget = {
  alertType: string;
  actionLabel: string;
  customerId: string | null;
  invoiceId: string | null;
  billId: string | null;
};

function resolveTarget(alert: AlertForTarget): ActionTarget {
  const label = alert.actionLabel;

  switch (alert.alertType) {
    case 'overdue_chase':
    case 'final_notice': {
      if (!alert.customerId) {
        return { href: '/customers', label };
      }
      const params = new URLSearchParams({ customerId: alert.customerId });
      if (alert.invoiceId) params.set('invoiceId', alert.invoiceId);
      return { href: `/reminders/new?${params.toString()}`, label };
    }
    case 'due_tomorrow':
      return {
        href: alert.invoiceId ? `/invoices/${alert.invoiceId}` : '/invoices',
        label,
      };
    case 'forecast_shortfall':
      return { href: '/cash-forecast', label };
    case 'bill_due_low_cash':
      return {
        href: alert.billId ? `/bills/${alert.billId}` : '/bills',
        label,
      };
    case 'billing_day_reached':
      return { href: '/generate-invoices', label };
    default:
      return { href: '/alerts', label };
  }
}

export async function POST(
  _request: Request,
  { params }: { params: { alertId: string } }
) {
  const alertId = params.alertId;

  if (!UUID_RE.test(alertId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    // Race-safe transition: only open or snoozed alerts can be acted on.
    const result = await db.alert.updateMany({
      where: {
        id: alertId,
        status: { in: ['open', 'snoozed'] },
      },
      data: {
        status: 'acted',
        actedAt: new Date(),
      },
    });

    if (result.count === 0) {
      const existing = await db.alert.findUnique({ where: { id: alertId } });
      if (!existing) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      return NextResponse.json(
        { error: 'Alert is dismissed or already acted and cannot be acted on' },
        { status: 409 }
      );
    }

    const alert = await db.alert.findUnique({ where: { id: alertId } });
    if (!alert) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const target = resolveTarget(alert);

    return NextResponse.json({ alert, target });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
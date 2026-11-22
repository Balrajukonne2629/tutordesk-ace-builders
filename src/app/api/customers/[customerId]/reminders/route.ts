import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: { customerId: string } },
) {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const customerId = params.customerId;
  if (!UUID_RE.test(customerId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });
    if (!customer) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const reminders = await db.reminder.findMany({
      where: {
        customerId,
        status: { in: ['draft', 'sent'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ reminders });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
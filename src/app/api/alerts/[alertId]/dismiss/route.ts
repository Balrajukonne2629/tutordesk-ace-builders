import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  { params }: { params: { alertId: string } },
) {
  const alertId = params.alertId;

  try {
    const existing = await db.alert.findUnique({
      where: { id: alertId },
      select: { id: true, status: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (existing.status === 'acted') {
      return NextResponse.json(
        { error: 'Alert has already been acted on and cannot be dismissed' },
        { status: 409 },
      );
    }

    const alert = await db.alert.update({
      where: { id: alertId },
      data: {
        status: 'dismissed',
        dismissedAt: new Date(),
        snoozedUntil: null,
      },
    });

    return NextResponse.json({ alert });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      (e.code === 'P2025' || e.code === 'P2023')
    ) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
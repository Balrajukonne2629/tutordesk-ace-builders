import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

const CHANNELS = ['whatsapp', 'copy', 'other'] as const;
type Channel = (typeof CHANNELS)[number];

const MAX_MESSAGE_LENGTH = 1000;

function isChannel(value: unknown): value is Channel {
  return typeof value === 'string' && (CHANNELS as readonly string[]).includes(value);
}

function handleDbError(e: unknown) {
  if (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    (e.code === 'P2025' || e.code === 'P2023')
  ) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ error: 'Internal error' }, { status: 500 });
}

export async function POST(
  request: Request,
  { params }: { params: { reminderId: string } },
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { channel, sent_at: sentAtRaw } = body as Record<string, unknown>;

  if (!isChannel(channel)) {
    return NextResponse.json(
      { error: 'Choose how you sent this reminder: WhatsApp or copied text.' },
      { status: 400 },
    );
  }

  let requestedSentAt: Date | undefined;
  if (sentAtRaw !== undefined && sentAtRaw !== null) {
    if (typeof sentAtRaw !== 'string') {
      return NextResponse.json(
        { error: 'Sent time cannot be in the future or before the reminder was drafted.' },
        { status: 400 },
      );
    }
    const parsed = new Date(sentAtRaw);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json(
        { error: 'Sent time cannot be in the future or before the reminder was drafted.' },
        { status: 400 },
      );
    }
    requestedSentAt = parsed;
  }

  try {
    const reminder = await db.reminder.findUnique({
      where: { id: params.reminderId },
    });

    if (!reminder) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (reminder.status === 'sent') {
      return NextResponse.json(
        { error: 'This reminder has already been sent and cannot be logged again.' },
        { status: 409 },
      );
    }

    const messageLength = reminder.messageBody.trim().length;
    if (messageLength === 0) {
      return NextResponse.json(
        { error: 'Please write a message before sending the reminder.' },
        { status: 400 },
      );
    }
    if (messageLength > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: 'Reminder message is too long. Keep it under 1000 characters.' },
        { status: 400 },
      );
    }

    const now = new Date();
    const effectiveSentAt = requestedSentAt ?? now;

    if (effectiveSentAt.getTime() > now.getTime() || effectiveSentAt.getTime() < reminder.createdAt.getTime()) {
      return NextResponse.json(
        { error: 'Sent time cannot be in the future or before the reminder was drafted.' },
        { status: 400 },
      );
    }

    // Guarded update: only a draft can move to sent, so concurrent logs cannot double-send.
    const result = await db.reminder.updateMany({
      where: { id: reminder.id, status: 'draft' },
      data: {
        status: 'sent',
        channel,
        sentAt: effectiveSentAt,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'This reminder has already been sent and cannot be logged again.' },
        { status: 409 },
      );
    }

    const updated = await db.reminder.findUnique({
      where: { id: reminder.id },
    });

    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ reminder: updated });
  } catch (e) {
    return handleDbError(e);
  }
}
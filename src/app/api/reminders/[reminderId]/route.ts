
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import type { ReminderLanguage, ReminderTone } from '@prisma/client';
import { db } from '@/lib/db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RECENT_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 1000;

const TONES: readonly ReminderTone[] = ['friendly', 'firm', 'final_notice'];
const LANGUAGES: readonly ReminderLanguage[] = ['english', 'hindi', 'telugu'];

function isTone(value: unknown): value is ReminderTone {
  return typeof value === 'string' && (TONES as readonly string[]).includes(value);
}

function isLanguage(value: unknown): value is ReminderLanguage {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}

function notFound() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function GET(
  _request: Request,
  { params }: { params: { reminderId: string } },
) {
  const reminderId = params.reminderId;
  if (!UUID_RE.test(reminderId)) {
    return notFound();
  }

  try {
    const reminder = await db.reminder.findUnique({ where: { id: reminderId } });
    if (!reminder) {
      return notFound();
    }

    const since = new Date(Date.now() - RECENT_WINDOW_MS);
    const otherRecent = await db.reminder.findFirst({
      where: {
        customerId: reminder.customerId,
        status: 'sent',
        sentAt: { gte: since },
        id: { not: reminder.id },
      },
      select: { id: true },
    });

    return NextResponse.json({
      reminder: { ...reminder, recentlyReminded: otherRecent !== null },
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { reminderId: string } },
) {
  const reminderId = params.reminderId;
  if (!UUID_RE.test(reminderId)) {
    return notFound();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 });
  }
  const input = body as Record<string, unknown>;

  try {
    const existing = await db.reminder.findUnique({ where: { id: reminderId } });
    if (!existing) {
      return notFound();
    }

    if (existing.status === 'sent') {
      return NextResponse.json(
        { error: 'Sent reminders are kept as the reminder log and cannot be edited.' },
        { status: 409 },
      );
    }

    const data: { messageBody?: string; tone?: ReminderTone; language?: ReminderLanguage } = {};

    if ('messageBody' in input) {
      if (typeof input.messageBody !== 'string') {
        return NextResponse.json(
          { error: 'Reminder message cannot be empty. Please write a message.' },
          { status: 400 },
        );
      }
      const trimmed = input.messageBody.trim();
      if (trimmed.length === 0) {
        return NextResponse.json(
          { error: 'Reminder message cannot be empty. Please write a message.' },
          { status: 400 },
        );
      }
      if (trimmed.length > MAX_MESSAGE_LENGTH) {
        return NextResponse.json(
          { error: 'Reminder message is too long. Keep it under 1000 characters.' },
          { status: 400 },
        );
      }
      data.messageBody = trimmed;
    }

    if ('tone' in input) {
      if (!isTone(input.tone)) {
        return NextResponse.json(
          { error: 'Please choose a tone: Friendly, Firm, or Final notice.' },
          { status: 400 },
        );
      }
      data.tone = input.tone;
    }

    if ('language' in input) {
      if (!isLanguage(input.language)) {
        return NextResponse.json(
          { error: 'Language must be English, Hindi, or Telugu.' },
          { status: 400 },
        );
      }
      data.language = input.language;
    }

    const effectiveTone = data.tone ?? existing.tone;
    const effectiveLanguage = data.language ?? existing.language;
    if (effectiveLanguage !== 'english' && effectiveTone !== 'friendly') {
      return NextResponse.json(
        {
          error:
            'Hindi and Telugu are available only for the Friendly reminder. Please choose English or change the tone to Friendly.',
        },
        { status: 400 },
      );
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'No editable fields were provided.' },
        { status: 400 },
      );
    }

    const reminder = await db.reminder.update({
      where: { id: reminderId },
      data,
    });

    return NextResponse.json({ reminder });
  } catch (error) {
    if (isNotFoundError(error)) {
      return notFound();
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { reminderId: string } },
) {
  const reminderId = params.reminderId;
  if (!UUID_RE.test(reminderId)) {
    return notFound();
  }

  try {
    const existing = await db.reminder.findUnique({ where: { id: reminderId } });
    if (!existing) {
      return notFound();
    }

    if (existing.status !== 'draft') {
      return NextResponse.json(
        { error: 'Sent reminders are kept in the reminder log and cannot be discarded.' },
        { status: 409 },
      );
    }

    await db.reminder.delete({ where: { id: reminderId } });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (isNotFoundError(error)) {
      return notFound();
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_MESSAGE_LENGTH = 1000;

function toWhatsappNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10) {
    return `91${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }

  if (digits.length >= 8 && digits.length <= 15) {
    return digits;
  }

  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: { reminderId: string } },
) {
  const reminderId = params.reminderId;

  if (!UUID_PATTERN.test(reminderId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const reminder = await db.reminder.findUnique({
      where: { id: reminderId },
      include: {
        customer: {
          select: { phone: true, parentName: true },
        },
      },
    });

    if (!reminder) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const message = reminder.messageBody.trim();

    if (message.length === 0) {
      return NextResponse.json(
        { error: 'Reminder message cannot be empty. Please write a message.' },
        { status: 422 },
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: 'Reminder message is too long. Keep it under 1000 characters.' },
        { status: 422 },
      );
    }

    const whatsappNumber = toWhatsappNumber(reminder.customer.phone);

    if (!whatsappNumber) {
      return NextResponse.json(
        { error: 'The customer does not have a valid phone number for WhatsApp.' },
        { status: 422 },
      );
    }

    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
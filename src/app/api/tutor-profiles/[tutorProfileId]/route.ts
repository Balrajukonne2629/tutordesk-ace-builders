import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UPI_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
const MAX_MONEY_ABS = 10_000_000_000; // fits Decimal(12, 2)

type PatchBody = {
  name?: unknown;
  upiId?: unknown;
  openingCashBalance?: unknown;
  onboardingStep?: unknown;
};

function parseOpeningCash(value: unknown): number | null {
  let n: number;
  if (typeof value === 'number') {
    n = value;
  } else if (typeof value === 'string' && value.trim() !== '') {
    n = Number(value.trim());
  } else {
    return null;
  }
  if (!Number.isFinite(n) || Math.abs(n) >= MAX_MONEY_ABS) return null;
  return Math.round(n * 100) / 100;
}

export async function PATCH(
  request: Request,
  { params }: { params: { tutorProfileId: string } }
) {
  const tutorProfileId = params.tutorProfileId;

  if (!UUID_RE.test(tutorProfileId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Body must be an object' }, { status: 400 });
  }

  const input = body as PatchBody;
  const data: Prisma.TutorProfileUpdateInput = {};

  if (input.name !== undefined) {
    if (typeof input.name !== 'string') {
      return NextResponse.json({ error: 'name must be a string' }, { status: 400 });
    }
    const name = input.name.trim();
    if (name.length < 1 || name.length > 120) {
      return NextResponse.json(
        { error: 'name must be between 1 and 120 characters' },
        { status: 400 }
      );
    }
    data.name = name;
  }

  if (input.upiId !== undefined) {
    if (input.upiId === null) {
      data.upiId = null;
    } else if (typeof input.upiId !== 'string') {
      return NextResponse.json({ error: 'upiId must be a string or null' }, { status: 400 });
    } else {
      const upi = input.upiId.trim();
      if (upi === '') {
        data.upiId = null;
      } else if (!UPI_RE.test(upi)) {
        return NextResponse.json(
          { error: 'upiId must look like name@bank (for example, ravi@okaxis)' },
          { status: 400 }
        );
      } else {
        data.upiId = upi;
      }
    }
  }

  if (input.openingCashBalance !== undefined) {
    const cash = parseOpeningCash(input.openingCashBalance);
    if (cash === null) {
      return NextResponse.json(
        { error: 'openingCashBalance must be a valid amount' },
        { status: 400 }
      );
    }
    data.openingCashBalance = cash;
  }

  if (input.onboardingStep !== undefined) {
    const step = input.onboardingStep;
    if (typeof step !== 'number' || !Number.isInteger(step) || step < 1 || step > 3) {
      return NextResponse.json(
        { error: 'onboardingStep must be 1, 2 or 3' },
        { status: 400 }
      );
    }
    if (step === 3) {
      data.onboardingCompleted = true;
    }
  }

  try {
    const tutorProfile = await db.tutorProfile.update({
      where: { id: tutorProfileId },
      data,
    });
    return NextResponse.json({ tutorProfile });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
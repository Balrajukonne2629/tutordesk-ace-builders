
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let tutorProfile = await db.tutorProfile.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (!tutorProfile) {
      tutorProfile = await db.tutorProfile.create({
        data: { name: '' },
      });
    }

    return NextResponse.json({ tutorProfile });
  } catch (error) {
    console.error('GET /api/tutor-profiles failed', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionForGym } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ gymSlug: string; memberId: string }> }
) {
  try {
    const params = await props.params;
    const session = await getSessionForGym(params.gymSlug);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messages = await db.notification.findMany({
      where: {
        memberId: params.memberId,
        gym: { slug: params.gymSlug },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching member messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

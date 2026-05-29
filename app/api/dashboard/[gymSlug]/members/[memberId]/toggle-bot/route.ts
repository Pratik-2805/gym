import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionForGym } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ gymSlug: string; memberId: string }> }
) {
  try {
    const params = await props.params;
    const session = await getSessionForGym(params.gymSlug);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { isBotDisabled } = await req.json();

    const member = await db.member.update({
      where: {
        id: params.memberId,
        gym: { slug: params.gymSlug },
      },
      data: { isBotDisabled },
    });

    await db.auditLog.create({
      data: {
        action: isBotDisabled ? 'BOT_PAUSE' : 'BOT_RESUME',
        details: `${isBotDisabled ? 'Paused' : 'Resumed'} chatbot for member ${member.name} (${member.phone})`,
        gymId: member.gymId,
        userId: session.userId,
      },
    });

    return NextResponse.json({ success: true, member });
  } catch (error) {
    console.error('Error toggling bot status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

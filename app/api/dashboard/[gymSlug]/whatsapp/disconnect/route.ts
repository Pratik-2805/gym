import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionForGym } from '@/lib/auth';
import { whatsappManager } from '@/lib/whatsapp-manager';

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ gymSlug: string }> }
) {
  try {
    const params = await props.params;
    const session = await getSessionForGym(params.gymSlug);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const gym = await db.gym.findUnique({
      where: { slug: params.gymSlug },
    });

    if (!gym) {
      return NextResponse.json({ error: 'Gym not found' }, { status: 404 });
    }

    await whatsappManager.disconnectSession(gym.id);

    return NextResponse.json({ success: true, status: 'DISCONNECTED' });
  } catch (error) {
    console.error('Error disconnecting WhatsApp:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

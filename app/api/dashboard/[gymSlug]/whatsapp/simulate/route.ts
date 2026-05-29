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

    const { phone, message } = await req.json();

    if (!phone || !message) {
      return NextResponse.json({ error: 'Phone and message are required' }, { status: 400 });
    }

    // Process through the WhatsApp receiver logic
    const botResponses = await whatsappManager.receiveMessage(gym.id, phone, message);

    return NextResponse.json({ success: true, responses: botResponses });
  } catch (error) {
    console.error('Error simulating WhatsApp inbound message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

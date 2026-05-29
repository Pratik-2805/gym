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

    const member = await db.member.findFirst({
      where: { phone, gymId: gym.id },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Force bot takeover to active since staff is replying manually
    if (!member.isBotDisabled) {
      await db.member.update({
        where: { id: member.id },
        data: { isBotDisabled: true },
      });
    }

    // Save outbound staff reply to Notification logs
    await db.notification.create({
      data: {
        gymId: gym.id,
        memberId: member.id,
        recipientPhone: phone,
        title: 'WhatsApp Staff Reply',
        message,
        type: 'CHATBOT',
        status: 'SENT',
      },
    });

    await whatsappManager.sendMessage(gym.id, phone, message, 'CHATBOT');

    await db.auditLog.create({
      data: {
        action: 'HUMAN_TAKEOVER_REPLY',
        details: `Staff sent direct message to ${member.name} (${phone})`,
        gymId: gym.id,
        userId: session.userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending staff live-chat reply:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

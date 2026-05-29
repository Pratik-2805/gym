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

    const { memberId } = await req.json();

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    const member = await db.member.findUnique({
      where: { id: memberId },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: { plan: true },
        },
      },
    });

    if (!member || member.gymId !== gym.id) {
      return NextResponse.json({ error: 'Member not found or unauthorized' }, { status: 404 });
    }

    const activeMembership = member.memberships[0];

    if (!activeMembership) {
      return NextResponse.json({
        success: false,
        error: 'NO_ACTIVE_MEMBERSHIP',
        message: 'Member does not have an active subscription.',
        member,
      });
    }

    // Log check-in
    await db.auditLog.create({
      data: {
        action: 'MEMBER_CHECKIN',
        details: `Member ${member.name} checked in successfully. Active Plan: ${activeMembership.plan.name}`,
        gymId: gym.id,
      },
    });

    // Send WhatsApp attendance alert
    const checkinTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const message = `Check-in Verified! 🟢\nWelcome back *${member.name}* to *${gym.name}*!\nTime: *${checkinTime}*\nPlan: *${activeMembership.plan.name}*\n\nHave a solid training session today! 🏋️`;
    
    await whatsappManager.sendMessage(gym.id, member.phone, message, 'ACTIVATION');

    return NextResponse.json({
      success: true,
      member: {
        id: member.id,
        name: member.name,
        phone: member.phone,
      },
      membership: {
        planName: activeMembership.plan.name,
        endDate: activeMembership.endDate,
      },
    });
  } catch (error) {
    console.error('Error during checkin API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionForGym } from '@/lib/auth';

export async function GET(
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

    const members = await db.member.findMany({
      where: { gymId: gym.id },
      orderBy: { createdAt: 'desc' },
      include: {
        memberships: {
          include: { plan: true },
        },
      },
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Error fetching members API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const { name, phone, email, address, dob, emergencyContact, notes } = await req.json();

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 });
    }

    // Check if phone already registered in this gym
    const existing = await db.member.findUnique({
      where: {
        gymId_phone: {
          gymId: gym.id,
          phone,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Member phone already exists for this gym' }, { status: 400 });
    }

    const member = await db.member.create({
      data: {
        name,
        phone,
        email: email || null,
        address: address || null,
        dob: dob ? new Date(dob) : null,
        emergencyContact: emergencyContact || null,
        notes: notes || null,
        gymId: gym.id,
      },
    });

    await db.auditLog.create({
      data: {
        action: 'MEMBER_CREATE',
        details: `Created member ${name} (${phone})`,
        gymId: gym.id,
        userId: session.userId,
      },
    });

    return NextResponse.json({ success: true, member });
  } catch (error) {
    console.error('Error creating member API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

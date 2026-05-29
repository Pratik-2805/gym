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

    const plans = await db.membershipPlan.findMany({
      where: { gym: { slug: params.gymSlug } },
      orderBy: { price: 'asc' },
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
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

    const { name, description, price, durationDays } = await req.json();

    if (!name || !price || !durationDays) {
      return NextResponse.json({ error: 'Name, price and durationDays are required' }, { status: 400 });
    }

    const plan = await db.membershipPlan.create({
      data: {
        name,
        description: description || null,
        price: parseFloat(price),
        durationDays: parseInt(durationDays),
        gymId: gym.id,
      },
    });

    await db.auditLog.create({
      data: {
        action: 'PLAN_CREATE',
        details: `Created membership plan ${name} (Price: ₹${price}, Duration: ${durationDays} Days)`,
        gymId: gym.id,
        userId: session.userId,
      },
    });

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error('Error creating membership plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

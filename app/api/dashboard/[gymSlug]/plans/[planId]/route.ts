import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionForGym } from '@/lib/auth';

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ gymSlug: string; planId: string }> }
) {
  try {
    const params = await props.params;
    const session = await getSessionForGym(params.gymSlug);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const plan = await db.membershipPlan.findUnique({
      where: {
        id: params.planId,
        gym: { slug: params.gymSlug },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    await db.membershipPlan.delete({
      where: { id: params.planId },
    });

    await db.auditLog.create({
      data: {
        action: 'PLAN_DELETE',
        details: `Deleted membership plan ${plan.name}`,
        gymId: plan.gymId,
        userId: session.userId,
      },
    });

    return NextResponse.json({ success: true, message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting membership plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

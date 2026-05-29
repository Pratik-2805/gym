import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionForGym } from '@/lib/auth';
import { approveTransaction, rejectTransaction } from '@/lib/payment-processor';

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

    const transactions = await db.transaction.findMany({
      where: { gym: { slug: params.gymSlug } },
      orderBy: { createdAt: 'desc' },
      include: {
        member: true,
        plan: true,
        invoice: true,
      },
    });

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
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

    const { transactionId, action, reason } = await req.json();

    if (!transactionId || !action) {
      return NextResponse.json({ error: 'Transaction ID and Action are required' }, { status: 400 });
    }

    if (action === 'APPROVE') {
      const ok = await approveTransaction(transactionId, session.userId);
      if (!ok) {
        return NextResponse.json({ error: 'Transaction cannot be approved' }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: 'Transaction approved and membership activated' });
    } else if (action === 'REJECT') {
      const ok = await rejectTransaction(transactionId, reason || 'Transaction reference invalid', session.userId);
      if (!ok) {
        return NextResponse.json({ error: 'Transaction cannot be rejected' }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: 'Transaction rejected successfully' });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

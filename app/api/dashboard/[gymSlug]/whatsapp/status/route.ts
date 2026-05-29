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

    const ws = await db.whatsappSession.findFirst({
      where: { gym: { slug: params.gymSlug } },
    });

    return NextResponse.json({
      status: ws?.status || 'DISCONNECTED',
      qrCode: ws?.qrCode || '',
    });
  } catch (error) {
    console.error('Error fetching WhatsApp status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

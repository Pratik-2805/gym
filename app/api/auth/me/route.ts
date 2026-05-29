import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    if (session.role === 'SUPERADMIN') {
      return NextResponse.json({
        authenticated: true,
        user: {
          id: session.userId,
          email: session.email,
          role: session.role,
          gym: null,
        },
      });
    }

    if (!session.gymId) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const user = await db.gymUser.findUnique({
      where: { id: session.userId },
      include: { gym: true },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        gym: user.gym ? { id: user.gym.id, name: user.gym.name, slug: user.gym.slug } : null,
      },
    });
  } catch (error) {
    console.error('Session me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

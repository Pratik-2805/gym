import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { gymName, gymSlug, ownerName, ownerEmail, ownerPassword } = await req.json();

    if (!gymName || !gymSlug || !ownerName || !ownerEmail || !ownerPassword) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Check slug uniqueness
    const existingGym = await db.gym.findUnique({
      where: { slug: gymSlug.toLowerCase() },
    });

    if (existingGym) {
      return NextResponse.json({ error: 'Gym slug already taken' }, { status: 400 });
    }

    // Check user uniqueness
    const existingUser = await db.gymUser.findUnique({
      where: { email: ownerEmail },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Owner email already registered' }, { status: 400 });
    }

    const passwordHash = hashPassword(ownerPassword);

    // Create Gym, Owner User, ChatbotSettings, PaymentSettings in a transaction
    const result = await db.$transaction(async (tx: any) => {
      const gym = await tx.gym.create({
        data: {
          name: gymName,
          slug: gymSlug.toLowerCase(),
        },
      });

      const user = await tx.gymUser.create({
        data: {
          name: ownerName,
          email: ownerEmail,
          passwordHash,
          role: 'OWNER',
          gymId: gym.id,
        },
      });

      await tx.chatbotSettings.create({
        data: {
          gymId: gym.id,
          welcomeMessage: `Welcome to ${gymName}!\n\n1. My Membership\n2. Renew Membership\n3. View Plans\n4. Contact Gym\n5. Offers`,
        },
      });

      await tx.paymentSettings.create({
        data: {
          gymId: gym.id,
        },
      });

      // Default plans
      await tx.membershipPlan.createMany({
        data: [
          { name: 'Monthly Basic', price: 999, durationDays: 30, gymId: gym.id, description: 'Access to Gym during normal timings.' },
          { name: 'Quarterly Pro', price: 2499, durationDays: 90, gymId: gym.id, description: 'Save on 3-month subscription.' },
          { name: 'Annual Elite', price: 7999, durationDays: 365, gymId: gym.id, description: 'Full access for 1 year + 2 personal trainer sessions.' },
        ]
      });

      await tx.auditLog.create({
        data: {
          action: 'GYM_REGISTER',
          details: `Gym ${gymName} registered by ${ownerName} (${ownerEmail})`,
          gymId: gym.id,
          userId: user.id,
        },
      });

      return { gym, user };
    });

    return NextResponse.json({
      success: true,
      gym: result.gym,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

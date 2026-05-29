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
      include: {
        chatbotSettings: true,
        paymentSettings: true,
      },
    });

    if (!gym) {
      return NextResponse.json({ error: 'Gym not found' }, { status: 404 });
    }

    return NextResponse.json({
      chatbotSettings: gym.chatbotSettings,
      paymentSettings: gym.paymentSettings,
    });
  } catch (error) {
    console.error('Error fetching chatbot settings:', error);
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

    const {
      welcomeMessage,
      isAiModeEnabled,
      aiKnowledgeBase,
      upiId,
      upiName,
      razorpayKeyId,
      razorpayKeySecret,
      isRazorpayEnabled,
    } = await req.json();

    // Update settings in database
    const chatbotSettings = await db.chatbotSettings.upsert({
      where: { gymId: gym.id },
      update: {
        welcomeMessage,
        isAiModeEnabled,
        aiKnowledgeBase,
      },
      create: {
        gymId: gym.id,
        welcomeMessage,
        isAiModeEnabled,
        aiKnowledgeBase,
      },
    });

    const paymentSettings = await db.paymentSettings.upsert({
      where: { gymId: gym.id },
      update: {
        upiId,
        upiName,
        razorpayKeyId,
        razorpayKeySecret,
        isRazorpayEnabled,
      },
      create: {
        gymId: gym.id,
        upiId,
        upiName,
        razorpayKeyId,
        razorpayKeySecret,
        isRazorpayEnabled,
      },
    });

    await db.auditLog.create({
      data: {
        action: 'SETTINGS_UPDATE',
        details: `Updated chatbot and payment configurations`,
        gymId: gym.id,
        userId: session.userId,
      },
    });

    return NextResponse.json({
      success: true,
      chatbotSettings,
      paymentSettings,
    });
  } catch (error) {
    console.error('Error updating chatbot settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

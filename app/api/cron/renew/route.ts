import { NextRequest, NextResponse } from 'next/server';
import { runDailyRenewalChecker } from '@/lib/scheduler';

export async function GET(req: NextRequest) {
  try {
    // Validate custom Cron header if present in production
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await runDailyRenewalChecker();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error running daily cron renewal checker:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}

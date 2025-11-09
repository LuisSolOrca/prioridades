import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Manual/External Cron Job endpoint for automatic weekly rescheduling
 *
 * Since Vercel Cron slots are not available, this endpoint can be called:
 * 1. Manually by admins from the admin panel
 * 2. From a free external cron service like cron-job.org
 * 3. Automatically via lazy execution when users access the app
 *
 * To use with cron-job.org:
 * 1. Go to https://cron-job.org
 * 2. Create a free account
 * 3. Create a new cron job:
 *    - URL: https://your-app.vercel.app/api/cron/weekly-reschedule
 *    - Schedule: Every Monday at 00:00
 *    - HTTP Method: GET
 *    - Add header: Authorization: Bearer YOUR_CRON_SECRET
 * 4. Set CRON_SECRET in your environment variables
 *
 * Security: This endpoint requires CRON_SECRET to be set
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security (optional but recommended)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is set, verify it
    if (cronSecret) {
      if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized - Invalid or missing CRON_SECRET' },
          { status: 401 }
        );
      }
    } else {
      console.warn('⚠️ [CRON] CRON_SECRET is not set - endpoint is publicly accessible');
    }

    console.log('🕐 [CRON] Starting weekly auto-reschedule job...');

    // Call the auto-reschedule endpoint
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/priorities/auto-reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ [CRON] Auto-reschedule failed:', result);
      return NextResponse.json(
        {
          error: 'Auto-reschedule failed',
          details: result
        },
        { status: 500 }
      );
    }

    console.log('✅ [CRON] Weekly auto-reschedule completed successfully:', result);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result
    });
  } catch (error: any) {
    console.error('❌ [CRON] Error in weekly-reschedule:', error);
    return NextResponse.json(
      {
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Also support POST method for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}

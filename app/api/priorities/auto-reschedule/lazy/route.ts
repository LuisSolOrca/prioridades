import { NextResponse } from 'next/server';
import { lazyAutoReschedule } from '@/lib/autoReschedule';

/**
 * Lazy auto-reschedule endpoint
 *
 * This endpoint is called from the client-side (dashboard, priorities page, etc.)
 * to trigger auto-rescheduling in the background. It checks if enough time has passed
 * since the last check and triggers auto-reschedule if needed.
 *
 * This runs in the background and returns immediately, so it doesn't block the user.
 */
export async function POST() {
  try {
    // Trigger lazy auto-reschedule (non-blocking, runs in background)
    lazyAutoReschedule();

    return NextResponse.json({
      message: 'Auto-reschedule check triggered',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in lazy auto-reschedule endpoint:', error);
    // Don't fail the request even if there's an error
    return NextResponse.json({
      message: 'Auto-reschedule check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 200 }); // Return 200 to not affect user experience
  }
}

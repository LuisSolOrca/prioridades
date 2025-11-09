/**
 * Lazy auto-reschedule utility
 *
 * This utility checks if auto-rescheduling needs to run and executes it
 * when users access the application. This is a workaround for not having
 * Vercel Cron slots available.
 */

import connectDB from './mongodb';
import Priority from '@/models/Priority';

// Store last check timestamp in memory (resets on deployment)
let lastCheckTimestamp: Date | null = null;
const CHECK_INTERVAL_HOURS = 6; // Check every 6 hours max

/**
 * Check if we need to run auto-reschedule
 * Returns true if it's been more than CHECK_INTERVAL_HOURS since last check
 */
export function shouldCheckAutoReschedule(): boolean {
  if (!lastCheckTimestamp) {
    return true;
  }

  const now = new Date();
  const hoursSinceLastCheck = (now.getTime() - lastCheckTimestamp.getTime()) / (1000 * 60 * 60);

  return hoursSinceLastCheck >= CHECK_INTERVAL_HOURS;
}

/**
 * Trigger auto-reschedule by calling the API endpoint
 * This runs in the background and doesn't block the user request
 */
export async function triggerAutoReschedule(): Promise<void> {
  try {
    // Update last check timestamp immediately to prevent multiple concurrent calls
    lastCheckTimestamp = new Date();

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Call the auto-reschedule endpoint in the background (fire and forget)
    fetch(`${baseUrl}/api/priorities/auto-reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(async (response) => {
        if (response.ok) {
          const result = await response.json();
          console.log('✅ [AUTO-RESCHEDULE] Background auto-reschedule completed:', result.message);
        } else {
          console.error('❌ [AUTO-RESCHEDULE] Failed:', response.statusText);
        }
      })
      .catch((error) => {
        console.error('❌ [AUTO-RESCHEDULE] Error:', error);
      });

  } catch (error) {
    console.error('❌ [AUTO-RESCHEDULE] Failed to trigger:', error);
  }
}

/**
 * Check and trigger auto-reschedule if needed (non-blocking)
 * Call this from high-traffic pages like dashboard
 */
export function lazyAutoReschedule(): void {
  if (shouldCheckAutoReschedule()) {
    console.log('🔄 [AUTO-RESCHEDULE] Triggering background auto-reschedule check...');
    triggerAutoReschedule().catch((error) => {
      console.error('❌ [AUTO-RESCHEDULE] Error in lazy trigger:', error);
    });
  }
}

/**
 * Get count of priorities that need auto-rescheduling
 * Useful for admin dashboard to show pending work
 */
export async function getPendingAutoRescheduleCount(): Promise<number> {
  try {
    await connectDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await Priority.countDocuments({
      weekEnd: { $lt: today },
      status: 'EN_TIEMPO',
    });

    return count;
  } catch (error) {
    console.error('Error getting pending auto-reschedule count:', error);
    return 0;
  }
}

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Priority from '@/models/Priority';
import Comment from '@/models/Comment';
import User from '@/models/User';
import StrategicInitiative from '@/models/StrategicInitiative';
import Client from '@/models/Client';
import Project from '@/models/Project';

export const dynamic = 'force-dynamic';

/**
 * Get week dates adjusted for Mexico City timezone (CST/CDT = UTC-6/UTC-5)
 * This ensures consistency between frontend (browser in Mexico) and backend (Vercel in UTC)
 */
function getWeekDatesForTimezone(date: Date = new Date()): { monday: Date; friday: Date } {
  // Mexico City timezone offset (CST = UTC-6, CDT = UTC-5)
  // We use -6 hours as the standard offset for CST
  const MEXICO_OFFSET_HOURS = -6;

  // Convert UTC time to Mexico time
  const mexicoTime = new Date(date.getTime() + (MEXICO_OFFSET_HOURS * 60 * 60 * 1000));

  // Calculate Monday of the week in Mexico time
  const day = mexicoTime.getUTCDay();
  const diff = mexicoTime.getUTCDate() - day + (day === 0 ? -6 : 1);

  // Create Monday at midnight Mexico time (which is 06:00 UTC)
  const mondayMexico = new Date(Date.UTC(
    mexicoTime.getUTCFullYear(),
    mexicoTime.getUTCMonth(),
    diff,
    -MEXICO_OFFSET_HOURS, // 6:00 UTC = 00:00 Mexico
    0, 0, 0
  ));

  // Create Friday at 23:59:59.999 Mexico time (which is 05:59:59.999 UTC next day)
  const fridayMexico = new Date(Date.UTC(
    mexicoTime.getUTCFullYear(),
    mexicoTime.getUTCMonth(),
    diff + 4,
    23 - MEXICO_OFFSET_HOURS, // 29 = 23 + 6, but we need to handle day overflow
    59, 59, 999
  ));

  return { monday: mondayMexico, friday: fridayMexico };
}

/**
 * API endpoint to automatically reschedule priorities that expired in EN_TIEMPO status
 * This should be called by a cron job at the start of each week (Monday)
 */
export async function POST() {
  try {
    await connectDB();

    // Force model registration (needed in serverless environment)
    User;
    StrategicInitiative;
    Client;
    Project;

    // Get current date and week boundaries
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get current week's Monday and Friday using timezone-aware calculation
    // This ensures dates match what users see in Mexico timezone
    const currentWeek = getWeekDatesForTimezone(now);
    const currentMonday = currentWeek.monday;
    const currentFriday = currentWeek.friday;

    // Find priorities that:
    // 1. Have weekEnd before today (expired)
    // 2. Are still in EN_TIEMPO status
    // 3. Are not already REPROGRAMADO or COMPLETADO
    const expiredPriorities = await Priority.find({
      weekEnd: { $lt: today },
      status: 'EN_TIEMPO',
    });

    console.log(`🔍 Found ${expiredPriorities.length} expired priorities in EN_TIEMPO status`);

    const rescheduledCount = { success: 0, failed: 0 };
    const results = [];

    for (const priority of expiredPriorities) {
      try {
        // Mark original priority as REPROGRAMADO
        await Priority.findByIdAndUpdate(
          priority._id,
          {
            status: 'REPROGRAMADO',
            wasEdited: true,
            lastEditedAt: new Date(),
            updatedAt: new Date()
          },
          { new: true, runValidators: true }
        );

        // Create a new copy for current week
        const newPriority = new Priority({
          title: priority.title,
          description: priority.description,
          weekStart: currentMonday,
          weekEnd: currentFriday,
          completionPercentage: 0, // Reset progress
          status: 'EN_TIEMPO',
          type: priority.type,
          userId: priority.userId,
          initiativeIds: priority.initiativeIds,
          clientId: priority.clientId,
          projectId: priority.projectId,
          checklist: priority.checklist?.map(item => ({
            text: item.text,
            completed: false
          })) || [],
          evidenceLinks: [], // Don't copy evidence links
          wasEdited: false,
          isCarriedOver: true
        });

        const savedPriority = await newPriority.save();

        // Create system comment on the original priority
        await Comment.create({
          priorityId: priority._id,
          userId: priority.userId,
          text: `🤖 Prioridad reprogramada automáticamente • Estado cambiado de "En Tiempo" a "Reprogramado" • Reprogramado de "Semana del ${priority.weekStart.toLocaleDateString('es-MX')}" a "Semana del ${currentMonday.toLocaleDateString('es-MX')}"`,
          isSystemComment: true
        });

        // Create system comment on the new priority
        await Comment.create({
          priorityId: savedPriority._id,
          userId: priority.userId,
          text: `🤖 Prioridad creada automáticamente por reprogramación desde la semana del ${priority.weekStart.toLocaleDateString('es-MX')}`,
          isSystemComment: true
        });

        console.log(`✅ Rescheduled priority: ${priority.title} (${priority._id} → ${savedPriority._id})`);

        results.push({
          originalId: priority._id,
          newId: savedPriority._id,
          title: priority.title,
          userId: priority.userId,
          status: 'success'
        });

        rescheduledCount.success++;
      } catch (error) {
        console.error(`❌ Error rescheduling priority ${priority._id}:`, error);

        results.push({
          originalId: priority._id,
          title: priority.title,
          userId: priority.userId,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        rescheduledCount.failed++;
      }
    }

    return NextResponse.json({
      message: `Auto-rescheduling completed: ${rescheduledCount.success} successful, ${rescheduledCount.failed} failed`,
      stats: rescheduledCount,
      currentWeek: {
        monday: currentMonday.toISOString(),
        friday: currentFriday.toISOString()
      },
      results
    });
  } catch (error: any) {
    console.error('Error in auto-reschedule:', error);
    return NextResponse.json({
      error: error.message,
      message: 'Failed to auto-reschedule priorities'
    }, { status: 500 });
  }
}

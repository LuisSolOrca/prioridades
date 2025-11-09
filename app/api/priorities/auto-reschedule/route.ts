import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Priority from '@/models/Priority';
import Comment from '@/models/Comment';

/**
 * API endpoint to automatically reschedule priorities that expired in EN_TIEMPO status
 * This should be called by a cron job at the start of each week (Monday)
 */
export async function POST() {
  try {
    await connectDB();

    // Get current date and week boundaries
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Calculate next week's Monday and Friday
    const nextMonday = new Date(today);
    const daysUntilMonday = (8 - nextMonday.getDay()) % 7;
    if (daysUntilMonday === 0 && nextMonday.getDay() !== 1) {
      nextMonday.setDate(nextMonday.getDate() + 7);
    } else {
      nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
    }

    const nextFriday = new Date(nextMonday);
    nextFriday.setDate(nextMonday.getDate() + 4);

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

        // Create a new copy for next week
        const newPriority = new Priority({
          title: priority.title,
          description: priority.description,
          weekStart: nextMonday,
          weekEnd: nextFriday,
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
          text: `🤖 Prioridad reprogramada automáticamente • Estado cambiado de "En Tiempo" a "Reprogramado" • Reprogramado de "Semana del ${priority.weekStart.toLocaleDateString('es-MX')}" a "Semana del ${nextMonday.toLocaleDateString('es-MX')}"`,
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
      nextWeek: {
        monday: nextMonday.toISOString(),
        friday: nextFriday.toISOString()
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

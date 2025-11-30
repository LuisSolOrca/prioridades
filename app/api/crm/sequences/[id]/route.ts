import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import EmailSequence from '@/models/EmailSequence';
import SequenceEnrollment from '@/models/SequenceEnrollment';
import { hasPermission } from '@/lib/permissions';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'viewCRM')) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const objectId = new mongoose.Types.ObjectId(id);

    const sequence = await EmailSequence.findById(objectId)
      .populate('createdBy', 'name email')
      .populate('steps.templateId', 'name subject');

    if (!sequence) {
      return NextResponse.json({ error: 'Secuencia no encontrada' }, { status: 404 });
    }

    // Get stats
    const [activeCount, completedCount, exitedCount, totalCount] = await Promise.all([
      SequenceEnrollment.countDocuments({ sequenceId: objectId, status: 'active' }),
      SequenceEnrollment.countDocuments({ sequenceId: objectId, status: 'completed' }),
      SequenceEnrollment.countDocuments({ sequenceId: objectId, status: 'exited' }),
      SequenceEnrollment.countDocuments({ sequenceId: objectId }),
    ]);

    // Get aggregate stats
    const enrollmentStats = await SequenceEnrollment.aggregate([
      { $match: { sequenceId: objectId } },
      {
        $group: {
          _id: null,
          totalEmailsSent: { $sum: '$emailsSent' },
          totalEmailsOpened: { $sum: '$emailsOpened' },
          totalEmailsClicked: { $sum: '$emailsClicked' },
          totalEmailsReplied: { $sum: '$emailsReplied' },
        },
      },
    ]);

    const stats = enrollmentStats[0] || {
      totalEmailsSent: 0,
      totalEmailsOpened: 0,
      totalEmailsClicked: 0,
      totalEmailsReplied: 0,
    };

    return NextResponse.json({
      ...sequence.toJSON(),
      activeEnrolled: activeCount,
      completedCount,
      exitedCount,
      totalEnrolled: totalCount,
      openRate: stats.totalEmailsSent > 0
        ? Math.round((stats.totalEmailsOpened / stats.totalEmailsSent) * 100)
        : 0,
      clickRate: stats.totalEmailsOpened > 0
        ? Math.round((stats.totalEmailsClicked / stats.totalEmailsOpened) * 100)
        : 0,
      replyRate: stats.totalEmailsSent > 0
        ? Math.round((stats.totalEmailsReplied / stats.totalEmailsSent) * 100)
        : 0,
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching sequence:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'canManageDeals')) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();

    // Ensure steps have correct order
    if (body.steps) {
      body.steps = body.steps.map((step: any, index: number) => ({
        ...step,
        order: index + 1,
      }));
    }

    const sequence = await EmailSequence.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!sequence) {
      return NextResponse.json({ error: 'Secuencia no encontrada' }, { status: 404 });
    }

    return NextResponse.json(sequence);
  } catch (error: any) {
    console.error('Error updating sequence:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores pueden eliminar secuencias' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Check for active enrollments
    const activeEnrollments = await SequenceEnrollment.countDocuments({
      sequenceId: id,
      status: 'active',
    });

    if (activeEnrollments > 0) {
      return NextResponse.json({
        error: `No se puede eliminar: hay ${activeEnrollments} contactos activos en esta secuencia`,
      }, { status: 400 });
    }

    // Delete all enrollments first
    await SequenceEnrollment.deleteMany({ sequenceId: id });

    // Delete the sequence
    const sequence = await EmailSequence.findByIdAndDelete(id);

    if (!sequence) {
      return NextResponse.json({ error: 'Secuencia no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting sequence:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

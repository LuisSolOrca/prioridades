import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Activity from '@/models/Activity';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const activity = await Activity.findById(params.id)
      .populate('clientId', 'name')
      .populate('contactId', 'firstName lastName email')
      .populate('dealId', 'title value')
      .populate('createdBy', 'name')
      .populate('assignedTo', 'name');

    if (!activity) {
      return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
    }

    return NextResponse.json(activity);
  } catch (error: any) {
    console.error('Error fetching activity:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();

    // Si se está completando, registrar fecha
    if (body.isCompleted && !body.completedAt) {
      body.completedAt = new Date();
    }

    const activity = await Activity.findByIdAndUpdate(
      params.id,
      body,
      { new: true, runValidators: true }
    )
      .populate('clientId', 'name')
      .populate('contactId', 'firstName lastName')
      .populate('dealId', 'title value')
      .populate('createdBy', 'name')
      .populate('assignedTo', 'name');

    if (!activity) {
      return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
    }

    return NextResponse.json(activity);
  } catch (error: any) {
    console.error('Error updating activity:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const activity = await Activity.findByIdAndDelete(params.id);

    if (!activity) {
      return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Actividad eliminada correctamente' });
  } catch (error: any) {
    console.error('Error deleting activity:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

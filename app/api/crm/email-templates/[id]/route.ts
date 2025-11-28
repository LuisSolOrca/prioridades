import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import EmailTemplate from '@/models/EmailTemplate';
import { hasPermission } from '@/lib/permissions';

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
    const template = await EmailTemplate.findById(id)
      .populate('createdBy', 'name');

    if (!template) {
      return NextResponse.json({ error: 'Template no encontrado' }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error: any) {
    console.error('Error fetching template:', error);
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
    const body = await request.json();
    const userId = (session.user as any).id;

    const template = await EmailTemplate.findById(id);
    if (!template) {
      return NextResponse.json({ error: 'Template no encontrado' }, { status: 404 });
    }

    // Only owner or admin can edit
    const user = session.user as any;
    if (template.createdBy.toString() !== userId && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No tienes permiso para editar este template' }, { status: 403 });
    }

    const updated = await EmailTemplate.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name');

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating template:', error);
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

    if (!hasPermission(session, 'canManageDeals')) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const userId = (session.user as any).id;

    const template = await EmailTemplate.findById(id);
    if (!template) {
      return NextResponse.json({ error: 'Template no encontrado' }, { status: 404 });
    }

    // Only owner or admin can delete
    const user = session.user as any;
    if (template.createdBy.toString() !== userId && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No tienes permiso para eliminar este template' }, { status: 403 });
    }

    await EmailTemplate.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

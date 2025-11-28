import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import CustomField from '@/models/CustomField';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const query: any = {};

    if (entityType) {
      query.entityType = entityType;
    }

    if (!includeInactive) {
      query.isActive = true;
    }

    const fields = await CustomField.find(query)
      .populate('createdBy', 'name')
      .sort({ entityType: 1, order: 1 })
      .lean();

    return NextResponse.json(fields);
  } catch (error: any) {
    console.error('Error fetching custom fields:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores pueden crear campos personalizados' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const userId = user.id;

    // Validar nombre único para el tipo de entidad
    const existingField = await CustomField.findOne({
      entityType: body.entityType,
      name: body.name,
    });

    if (existingField) {
      return NextResponse.json({
        error: `Ya existe un campo con el nombre "${body.name}" para ${body.entityType}`,
      }, { status: 400 });
    }

    // Obtener el orden máximo actual
    const maxOrderField = await CustomField.findOne({ entityType: body.entityType })
      .sort({ order: -1 });
    const nextOrder = maxOrderField ? maxOrderField.order + 1 : 0;

    const field = await CustomField.create({
      ...body,
      order: body.order ?? nextOrder,
      createdBy: userId,
    });

    const populated = await CustomField.findById(field._id)
      .populate('createdBy', 'name');

    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    console.error('Error creating custom field:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

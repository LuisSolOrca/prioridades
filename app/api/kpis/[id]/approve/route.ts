import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import KPI from '@/models/KPI';
import User from '@/models/User';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo admins pueden aprobar KPIs
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const kpi = await KPI.findById(params.id);

    if (!kpi) {
      return NextResponse.json({ error: 'KPI no encontrado' }, { status: 404 });
    }

    // Validar que el KPI esté en estado EN_REVISION
    if (kpi.status !== 'EN_REVISION') {
      return NextResponse.json(
        { error: 'Solo se pueden aprobar KPIs en estado EN_REVISION' },
        { status: 400 }
      );
    }

    // Validar que el aprobador exista (si se especificó)
    const approverId = body.approvedBy || (session.user as any).id;
    const approverExists = await User.exists({ _id: approverId });

    if (!approverExists) {
      return NextResponse.json(
        { error: 'El usuario aprobador no existe' },
        { status: 400 }
      );
    }

    kpi.status = 'APROBADO';
    kpi.approvedBy = approverId;
    kpi.approvedAt = new Date();

    await kpi.save();

    const updatedKpi = await KPI.findById(kpi._id)
      .populate('initiativeId', 'name color')
      .populate('responsible', 'name email')
      .populate('createdBy', 'name email')
      .populate('reviewedBy', 'name email')
      .populate('approvedBy', 'name email')
      .lean();

    return NextResponse.json(updatedKpi);
  } catch (error: any) {
    console.error('Error approving KPI:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

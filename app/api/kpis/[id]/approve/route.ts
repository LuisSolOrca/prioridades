import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import KPI from '@/models/KPI';

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

    kpi.status = 'APROBADO';
    kpi.approvedBy = (session.user as any).id;
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

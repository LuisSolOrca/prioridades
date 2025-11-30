import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import WebFormSubmission from '@/models/WebFormSubmission';
import mongoose from 'mongoose';
import '@/models/Contact';
import '@/models/Deal';
import '@/models/Client';

/**
 * GET /api/crm/web-forms/[id]/submissions
 * Lista las submissions de un formulario
 */
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const utmSource = searchParams.get('utmSource');

    // Construir query
    const query: any = { formId: params.id };

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.submittedAt = {};
      if (startDate) {
        query.submittedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.submittedAt.$lte = new Date(endDate);
      }
    }

    if (utmSource) {
      query.utmSource = utmSource;
    }

    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      WebFormSubmission.find(query)
        .populate('contactId', 'firstName lastName email')
        .populate('dealId', 'title value')
        .populate('clientId', 'name')
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WebFormSubmission.countDocuments(query),
    ]);

    return NextResponse.json({
      submissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { error: error.message || 'Error obteniendo submissions' },
      { status: 500 }
    );
  }
}

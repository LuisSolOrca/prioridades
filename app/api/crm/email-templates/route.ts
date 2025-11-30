import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import EmailTemplate from '@/models/EmailTemplate';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'viewCRM')) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    await connectDB();

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const scope = searchParams.get('scope'); // 'sequences' | 'workflows' | 'both'
    const includeShared = searchParams.get('includeShared') !== 'false';

    const query: any = {
      isActive: true,
      $or: [
        { createdBy: userId },
        ...(includeShared ? [{ isShared: true }] : []),
      ],
    };

    if (category) {
      query.category = category;
    }

    // Filtrar por scope - incluir plantillas del scope específico o 'both'
    if (scope && scope !== 'both') {
      query.scope = { $in: [scope, 'both'] };
    }

    if (search) {
      query.$and = [
        query.$or ? { $or: query.$or } : {},
        {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { subject: { $regex: search, $options: 'i' } },
          ],
        },
      ];
      delete query.$or;
    }

    const templates = await EmailTemplate.find(query)
      .populate('createdBy', 'name')
      .sort({ usageCount: -1, createdAt: -1 })
      .lean();

    return NextResponse.json(templates);
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'canManageDeals')) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const userId = (session.user as any).id;

    const template = await EmailTemplate.create({
      ...body,
      createdBy: userId,
    });

    const populated = await EmailTemplate.findById(template._id)
      .populate('createdBy', 'name');

    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

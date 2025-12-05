import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import MarketingCampaign from '@/models/MarketingCampaign';

// GET - List campaigns with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    // Build query
    const query: any = {};

    if (platform) {
      query.platform = platform;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Get total count
    const total = await MarketingCampaign.countDocuments(query);

    // Get campaigns
    const campaigns = await MarketingCampaign.find(query)
      .populate('createdBy', 'name email')
      .populate('ownerId', 'name email')
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      campaigns,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Error al obtener campañas' },
      { status: 500 }
    );
  }
}

// POST - Create new campaign
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Check permission
    const user = session.user as any;
    if (!user.permissions?.canManageCampaigns && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const body = await request.json();

    const {
      name,
      description,
      platform,
      objective,
      budgetType,
      budget,
      currency,
      startDate,
      endDate,
      targeting,
      adCreatives,
      tags,
      linkedDealIds,
      linkedClientIds,
      linkedContactIds,
    } = body;

    // Validate required fields
    if (!name || !platform || !objective || budget === undefined) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: name, platform, objective, budget' },
        { status: 400 }
      );
    }

    await connectDB();

    const campaign = await MarketingCampaign.create({
      name: name.trim(),
      description: description?.trim(),
      platform,
      objective,
      status: 'DRAFT',
      budgetType: budgetType || 'DAILY',
      budget,
      currency: currency || 'MXN',
      spentAmount: 0,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      targeting,
      adCreatives,
      tags,
      linkedDealIds,
      linkedClientIds,
      linkedContactIds,
      createdBy: session.user.id,
      ownerId: session.user.id,
      metrics: {
        impressions: 0,
        reach: 0,
        clicks: 0,
        ctr: 0,
        spend: 0,
        conversions: 0,
        conversionValue: 0,
        costPerResult: 0,
        costPerClick: 0,
        frequency: 0,
        lastUpdatedAt: new Date(),
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Error al crear campaña' },
      { status: 500 }
    );
  }
}

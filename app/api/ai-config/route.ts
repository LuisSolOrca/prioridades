import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import AIPromptConfig from '@/models/AIPromptConfig';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo los administradores pueden ver la configuración
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const promptType = searchParams.get('promptType');

    let query: any = {};
    if (promptType) {
      query.promptType = promptType;
    }

    const configs = await AIPromptConfig.find(query).sort({ promptType: 1 }).lean();

    return NextResponse.json(configs);
  } catch (error: any) {
    console.error('Error fetching AI config:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo los administradores pueden modificar la configuración
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { promptType, systemPrompt, userPromptTemplate, temperature, maxTokens, isActive } = body;

    if (!promptType) {
      return NextResponse.json({ error: 'promptType es requerido' }, { status: 400 });
    }

    // Validaciones
    if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
      return NextResponse.json({ error: 'temperature debe estar entre 0 y 2' }, { status: 400 });
    }

    if (maxTokens !== undefined && (maxTokens < 50 || maxTokens > 4000)) {
      return NextResponse.json({ error: 'maxTokens debe estar entre 50 y 4000' }, { status: 400 });
    }

    const updateData: any = {};
    if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
    if (userPromptTemplate !== undefined) updateData.userPromptTemplate = userPromptTemplate;
    if (temperature !== undefined) updateData.temperature = temperature;
    if (maxTokens !== undefined) updateData.maxTokens = maxTokens;
    if (isActive !== undefined) updateData.isActive = isActive;

    const config = await AIPromptConfig.findOneAndUpdate(
      { promptType },
      updateData,
      { new: true, upsert: true }
    );

    return NextResponse.json(config);
  } catch (error: any) {
    console.error('Error updating AI config:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo los administradores pueden crear configuraciones
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();

    const config = await AIPromptConfig.create(body);

    return NextResponse.json(config, { status: 201 });
  } catch (error: any) {
    console.error('Error creating AI config:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

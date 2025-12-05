import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Touchpoint from '@/models/Touchpoint';
import mongoose from 'mongoose';

// POST - Identify visitor touchpoints with contact
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { visitorId, contactId } = body;

    if (!visitorId || !contactId) {
      return NextResponse.json(
        { error: 'visitorId y contactId son requeridos' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(contactId)) {
      return NextResponse.json({ error: 'contactId invalido' }, { status: 400 });
    }

    // Update all anonymous touchpoints with this visitor ID
    const result = await (Touchpoint as any).identifyVisitor(
      visitorId,
      new mongoose.Types.ObjectId(contactId)
    );

    return NextResponse.json({
      success: true,
      updated: result.modifiedCount || 0,
      message: `Se identificaron ${result.modifiedCount || 0} touchpoints`,
    });
  } catch (error: any) {
    console.error('Error identifying touchpoints:', error);
    return NextResponse.json(
      { error: error.message || 'Error al identificar touchpoints' },
      { status: 500 }
    );
  }
}

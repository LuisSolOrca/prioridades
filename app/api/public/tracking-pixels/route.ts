import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import TrackingPixel from '@/models/TrackingPixel';

// GET - Get active pixels for a specific context
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const context = searchParams.get('context') || 'landingPages'; // app, landingPages, publicForms

    await connectDB();

    const query: any = { isActive: true };

    // Filter by injection context
    if (context === 'app') {
      query['injectIn.app'] = true;
    } else if (context === 'landingPages') {
      query['injectIn.landingPages'] = true;
    } else if (context === 'publicForms') {
      query['injectIn.publicForms'] = true;
    }

    const pixels = await TrackingPixel.find(query).select(
      'type pixelId conversionLabel customScript trackEvents'
    );

    return NextResponse.json(pixels);
  } catch (error: any) {
    console.error('Error fetching public tracking pixels:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

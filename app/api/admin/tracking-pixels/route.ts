import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import TrackingPixel from '@/models/TrackingPixel';
import User from '@/models/User';

// GET - List all tracking pixels
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const pixels = await TrackingPixel.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json(pixels);
  } catch (error: any) {
    console.error('Error fetching tracking pixels:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create a new tracking pixel
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const data = await request.json();

    const pixel = await TrackingPixel.create({
      ...data,
      createdBy: user._id,
    });

    return NextResponse.json(pixel, { status: 201 });
  } catch (error: any) {
    console.error('Error creating tracking pixel:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update a tracking pixel
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const data = await request.json();
    const { id, ...updateData } = data;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const pixel = await TrackingPixel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!pixel) {
      return NextResponse.json({ error: 'Pixel no encontrado' }, { status: 404 });
    }

    return NextResponse.json(pixel);
  } catch (error: any) {
    console.error('Error updating tracking pixel:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a tracking pixel
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    await TrackingPixel.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting tracking pixel:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

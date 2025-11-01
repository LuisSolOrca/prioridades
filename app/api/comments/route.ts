import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Comment from '@/models/Comment';
import Priority from '@/models/Priority';
import User from '@/models/User';
import { sendEmail, emailTemplates } from '@/lib/email';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const priorityId = searchParams.get('priorityId');

    if (!priorityId) {
      return NextResponse.json({ error: 'priorityId es requerido' }, { status: 400 });
    }

    const comments = await Comment.find({ priorityId })
      .populate('userId', 'name email')
      .sort({ createdAt: 1 }) // Ordenar del más antiguo al más reciente
      .lean();

    return NextResponse.json(comments);
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { priorityId, text } = body;

    if (!priorityId || !text) {
      return NextResponse.json({
        error: 'priorityId y text son requeridos'
      }, { status: 400 });
    }

    if (text.trim().length === 0) {
      return NextResponse.json({
        error: 'El comentario no puede estar vacío'
      }, { status: 400 });
    }

    const comment = await Comment.create({
      priorityId,
      userId: (session.user as any).id,
      text: text.trim()
    });

    // Poblar el usuario antes de devolver
    const populatedComment = await Comment.findById(comment._id)
      .populate('userId', 'name email')
      .lean();

    // Enviar notificación por email al dueño de la prioridad
    try {
      const priority = await Priority.findById(priorityId).lean();
      if (priority) {
        const priorityOwner = await User.findById(priority.userId).lean();
        const commentAuthor = await User.findById((session.user as any).id).lean();

        // Solo enviar si el comentario NO es del dueño de la prioridad
        if (
          priorityOwner &&
          commentAuthor &&
          priorityOwner._id.toString() !== commentAuthor._id.toString() &&
          priorityOwner.emailNotifications?.enabled &&
          priorityOwner.emailNotifications?.newComments
        ) {
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
          const emailContent = emailTemplates.newComment({
            priorityTitle: priority.title,
            commentAuthor: commentAuthor.name,
            commentText: text.trim(),
            priorityUrl: `${baseUrl}/priorities`,
          });

          // Enviar email de forma asíncrona sin bloquear la respuesta
          sendEmail({
            to: priorityOwner.email,
            subject: emailContent.subject,
            html: emailContent.html,
          }).catch(err => console.error('Error sending notification email:', err));
        }
      }
    } catch (emailError) {
      // No fallar la creación del comentario si el email falla
      console.error('Error sending email notification:', emailError);
    }

    return NextResponse.json(populatedComment, { status: 201 });
  } catch (error: any) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDownloadUrl } from '@/lib/r2-client';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';

export const maxDuration = 30;

/**
 * POST /api/ai/transcribe
 * Transcribe audio from R2 using Groq's Whisper API
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { r2Key, projectId, messageId } = body;

    if (!r2Key) {
      return NextResponse.json({
        error: 'r2Key is required'
      }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({
        error: 'projectId is required'
      }, { status: 400 });
    }

    // Verify that the r2Key belongs to the project
    if (!r2Key.includes(projectId)) {
      return NextResponse.json({
        error: 'Acceso no autorizado'
      }, { status: 403 });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        error: 'API Key de Groq no configurada'
      }, { status: 500 });
    }

    // Get signed URL from R2
    const audioUrl = await getDownloadUrl({
      key: r2Key,
      expiresIn: 300 // 5 minutes should be enough
    });

    // Fetch the audio file from R2
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      return NextResponse.json({
        error: 'Error al obtener el audio de R2'
      }, { status: 500 });
    }

    const audioBuffer = await audioResponse.arrayBuffer();

    // Determine file extension based on r2Key
    const extension = r2Key.endsWith('.mp4') ? 'mp4' : 'webm';
    const mimeType = extension === 'mp4' ? 'audio/mp4' : 'audio/webm';
    const filename = `audio.${extension}`;

    // Create FormData for the Groq API
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: mimeType });
    formData.append('file', blob, filename);
    formData.append('model', 'whisper-large-v3');
    formData.append('language', 'es'); // Spanish by default
    formData.append('response_format', 'json');

    // Call Groq Whisper API
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', errorText);
      return NextResponse.json({
        error: 'Error en la transcripción'
      }, { status: response.status });
    }

    const result = await response.json();
    const transcriptionText = result.text;

    // Save transcription to the message if messageId is provided
    if (messageId) {
      try {
        await connectDB();
        await ChannelMessage.findByIdAndUpdate(messageId, {
          'voiceMessage.transcription': transcriptionText
        });
      } catch (dbError) {
        console.error('Error saving transcription to database:', dbError);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({
      text: transcriptionText,
      language: result.language || 'es'
    });

  } catch (error: any) {
    console.error('Error transcribing audio:', error);
    return NextResponse.json(
      { error: error.message || 'Error al transcribir audio' },
      { status: 500 }
    );
  }
}

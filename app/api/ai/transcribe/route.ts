import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const maxDuration = 30;

/**
 * POST /api/ai/transcribe
 * Transcribe audio using Groq's Whisper API
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { audioData, mimeType } = body;

    if (!audioData) {
      return NextResponse.json({
        error: 'Audio data is required'
      }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        error: 'API Key de Groq no configurada'
      }, { status: 500 });
    }

    // Convert base64 to blob
    const binaryData = Buffer.from(audioData, 'base64');

    // Determine file extension based on mime type
    const extension = mimeType?.includes('mp4') ? 'mp4' : 'webm';
    const filename = `audio.${extension}`;

    // Create FormData for the Groq API
    const formData = new FormData();
    const blob = new Blob([binaryData], { type: mimeType || 'audio/webm' });
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

    return NextResponse.json({
      text: result.text,
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

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Send, X, Loader2 } from 'lucide-react';

interface VoiceRecorderProps {
  projectId: string;
  onSend: (voiceData: {
    r2Key: string;
    duration: number;
    mimeType: string;
    waveform: number[];
  }) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export default function VoiceRecorder({ projectId, onSend, onCancel, disabled }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;

      // Set up audio analyser for waveform
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Determine supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(audioBlob);
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setDuration(0);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // Start waveform visualization
      const waveformSamples: number[] = [];
      const visualize = () => {
        if (!analyserRef.current || !isRecording) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average amplitude
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalized = Math.min(1, average / 128);
        waveformSamples.push(normalized);

        // Keep only last 50 samples for visualization
        if (waveformSamples.length > 50) {
          waveformSamples.shift();
        }
        setWaveformData([...waveformSamples]);

        animationRef.current = requestAnimationFrame(visualize);
      };
      visualize();

    } catch (err: any) {
      console.error('Error starting recording:', err);
      if (err.name === 'NotAllowedError') {
        setError('Permiso de micrófono denegado. Por favor habilítalo en la configuración del navegador.');
      } else if (err.name === 'NotFoundError') {
        setError('No se encontró ningún micrófono.');
      } else {
        setError('Error al iniciar la grabación: ' + err.message);
      }
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  }, [isRecording]);

  const handleSend = async () => {
    if (!audioBlob) return;

    try {
      setProcessing(true);

      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          // Remove data URL prefix
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
      });
      reader.readAsDataURL(audioBlob);
      const base64Data = await base64Promise;

      // Get mime type from blob
      const mimeType = audioBlob.type || 'audio/webm';

      // Upload to R2
      const uploadResponse = await fetch(`/api/projects/${projectId}/voice-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: base64Data,
          mimeType,
          duration,
          waveform: waveformData
        })
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al subir el audio');
      }

      const uploadResult = await uploadResponse.json();

      onSend({
        r2Key: uploadResult.r2Key,
        duration,
        mimeType,
        waveform: waveformData
      });

    } catch (err: any) {
      console.error('Error processing audio:', err);
      setError('Error al procesar el audio: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    stopRecording();
    setAudioBlob(null);
    setWaveformData([]);
    setDuration(0);
    onCancel();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Max recording time: 5 minutes
  useEffect(() => {
    if (duration >= 300 && isRecording) {
      stopRecording();
    }
  }, [duration, isRecording, stopRecording]);

  if (error) {
    return (
      <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <span className="text-sm text-red-600 dark:text-red-400 flex-1">{error}</span>
        <button
          onClick={handleCancel}
          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition"
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {formatDuration(duration)}
          </span>
        </div>
      )}

      {/* Waveform visualization */}
      <div className="flex-1 flex items-center gap-0.5 h-8 overflow-hidden">
        {waveformData.map((amplitude, index) => (
          <div
            key={index}
            className="w-1 bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-75"
            style={{ height: `${Math.max(4, amplitude * 32)}px` }}
          />
        ))}
        {waveformData.length === 0 && !isRecording && audioBlob && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Mensaje de voz listo ({formatDuration(duration)})
          </span>
        )}
        {waveformData.length === 0 && !isRecording && !audioBlob && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Haz clic en el micrófono para grabar
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {!isRecording && !audioBlob && (
          <button
            onClick={startRecording}
            disabled={disabled}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-400 transition"
            title="Iniciar grabación"
          >
            <Mic size={20} />
          </button>
        )}

        {isRecording && (
          <button
            onClick={stopRecording}
            className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition"
            title="Detener grabación"
          >
            <Square size={20} />
          </button>
        )}

        {audioBlob && !isRecording && (
          <>
            <button
              onClick={handleSend}
              disabled={processing}
              className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:bg-gray-400 transition"
              title="Enviar mensaje de voz"
            >
              {processing ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </>
        )}

        <button
          onClick={handleCancel}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition"
          title="Cancelar"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}

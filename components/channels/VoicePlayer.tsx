'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, FileText, Loader2, Copy, Check } from 'lucide-react';

interface VoicePlayerProps {
  data: string; // Base64 encoded audio
  duration: number;
  mimeType: string;
  waveform?: number[];
  compact?: boolean;
  transcription?: string; // Pre-existing transcription
  onTranscriptionComplete?: (text: string) => void; // Callback when transcription is done
}

export default function VoicePlayer({
  data,
  duration,
  mimeType,
  waveform = [],
  compact = false,
  transcription: initialTranscription,
  onTranscriptionComplete
}: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [transcription, setTranscription] = useState(initialTranscription || '');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();

    // Create blob URL from base64
    try {
      const byteCharacters = atob(data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      audio.src = URL.createObjectURL(blob);
    } catch (err) {
      console.error('Error decoding audio:', err);
      setAudioError(true);
      return;
    }

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onerror = () => {
      console.error('Audio playback error');
      setAudioError(true);
    };

    audioRef.current = audio;

    return () => {
      audio.pause();
      if (audio.src) {
        URL.revokeObjectURL(audio.src);
      }
    };
  }, [data, mimeType]);

  const togglePlay = () => {
    if (!audioRef.current || audioError) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current || audioError) return;

    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleTranscribe = async () => {
    if (isTranscribing || transcription) return;

    try {
      setIsTranscribing(true);
      setTranscriptionError(null);

      const response = await fetch('/api/ai/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: data,
          mimeType: mimeType
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error en la transcripción');
      }

      const result = await response.json();
      setTranscription(result.text);

      if (onTranscriptionComplete) {
        onTranscriptionComplete(result.text);
      }
    } catch (err: any) {
      console.error('Error transcribing:', err);
      setTranscriptionError(err.message || 'Error al transcribir');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleCopyTranscription = async () => {
    if (!transcription) return;

    try {
      await navigator.clipboard.writeText(transcription);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying:', err);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Generate default waveform if not provided
  const displayWaveform = waveform.length > 0
    ? waveform
    : Array.from({ length: 30 }, () => 0.3 + Math.random() * 0.5);

  if (audioError) {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'p-2' : 'p-3'} bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 text-sm`}>
        <VolumeX size={16} />
        <span>Error al cargar el audio</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
        <button
          onClick={togglePlay}
          className="p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
        </button>
        <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-w-md">
      {/* Audio Player */}
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
        {/* Play/Pause button */}
        <button
          onClick={togglePlay}
          className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-md hover:shadow-lg flex-shrink-0"
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>

        {/* Waveform and progress */}
        <div className="flex-1 min-w-0">
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="relative h-8 flex items-center gap-0.5 cursor-pointer group"
          >
            {displayWaveform.map((amplitude, index) => {
              const barPercentage = (index / displayWaveform.length) * 100;
              const isActive = barPercentage <= progressPercentage;
              return (
                <div
                  key={index}
                  className={`w-1 rounded-full transition-all duration-100 ${
                    isActive
                      ? 'bg-blue-600 dark:bg-blue-400'
                      : 'bg-gray-300 dark:bg-gray-600 group-hover:bg-gray-400 dark:group-hover:bg-gray-500'
                  }`}
                  style={{ height: `${Math.max(4, amplitude * 28)}px` }}
                />
              );
            })}
          </div>

          {/* Time display */}
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span className="font-mono">{formatTime(currentTime)}</span>
            <span className="font-mono">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Mute button */}
        <button
          onClick={toggleMute}
          className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition flex-shrink-0"
          title={isMuted ? 'Activar sonido' : 'Silenciar'}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        {/* Transcribe button */}
        <button
          onClick={handleTranscribe}
          disabled={isTranscribing || !!transcription}
          className={`p-1.5 transition flex-shrink-0 ${
            transcription
              ? 'text-green-500 dark:text-green-400'
              : isTranscribing
                ? 'text-blue-500 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400'
          }`}
          title={transcription ? 'Transcripción disponible' : isTranscribing ? 'Transcribiendo...' : 'Transcribir con IA'}
        >
          {isTranscribing ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <FileText size={18} />
          )}
        </button>
      </div>

      {/* Transcription Result */}
      {transcription && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <FileText size={14} className="text-purple-500" />
                <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                  Transcripción
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {transcription}
              </p>
            </div>
            <button
              onClick={handleCopyTranscription}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition flex-shrink-0"
              title="Copiar transcripción"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* Transcription Error */}
      {transcriptionError && (
        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-600 dark:text-red-400">
          {transcriptionError}
        </div>
      )}
    </div>
  );
}

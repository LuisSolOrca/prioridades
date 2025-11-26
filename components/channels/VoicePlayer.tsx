'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface VoicePlayerProps {
  data: string; // Base64 encoded audio
  duration: number;
  mimeType: string;
  waveform?: number[];
  compact?: boolean;
}

export default function VoicePlayer({ data, duration, mimeType, waveform = [], compact = false }: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [audioError, setAudioError] = useState(false);

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
    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 max-w-md">
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
      >
        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
    </div>
  );
}

'use client';

import { ILandingGlobalStyles } from '@/models/LandingPage';

interface VideoContent {
  url: string;
  title?: string;
  autoplay?: boolean;
  loop?: boolean;
}

interface VideoSectionProps {
  content: VideoContent;
  styles?: Record<string, any>;
  globalStyles: ILandingGlobalStyles;
}

export default function VideoSection({ content, styles, globalStyles }: VideoSectionProps) {
  const { url, title, autoplay, loop } = content;

  const getEmbedUrl = (videoUrl: string) => {
    const params = new URLSearchParams();

    if (autoplay) {
      params.set('autoplay', '1');
      params.set('mute', '1'); // Required for autoplay
    }
    if (loop) {
      params.set('loop', '1');
    }

    // YouTube
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      let videoId = '';
      if (videoUrl.includes('youtu.be')) {
        videoId = videoUrl.split('/').pop()?.split('?')[0] || '';
      } else {
        videoId = new URLSearchParams(new URL(videoUrl).search).get('v') || '';
      }

      if (loop) {
        params.set('playlist', videoId); // YouTube requires playlist for loop
      }

      const queryString = params.toString();
      return `https://www.youtube.com/embed/${videoId}${queryString ? '?' + queryString : ''}`;
    }

    // Vimeo
    if (videoUrl.includes('vimeo.com')) {
      const videoId = videoUrl.split('/').pop()?.split('?')[0] || '';

      if (autoplay) {
        params.set('background', '1'); // Vimeo style autoplay
      }

      const queryString = params.toString();
      return `https://player.vimeo.com/video/${videoId}${queryString ? '?' + queryString : ''}`;
    }

    // Direct video URL
    return videoUrl;
  };

  const isDirectVideo = url && !url.includes('youtube.com') && !url.includes('youtu.be') && !url.includes('vimeo.com');

  return (
    <section
      style={{
        backgroundColor: styles?.backgroundColor || '#ffffff',
        padding: styles?.padding || '60px 24px',
      }}
      id="video"
    >
      <div className="max-w-4xl mx-auto">
        {title && (
          <h2
            className="text-center mb-8"
            style={{
              fontFamily: 'var(--heading-font)',
              color: globalStyles.textColor,
              fontSize: '2rem',
              fontWeight: 700,
            }}
          >
            {title}
          </h2>
        )}
        <div
          className="relative w-full"
          style={{
            paddingBottom: '56.25%',
            borderRadius: 'var(--border-radius)',
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }}
        >
          {url ? (
            isDirectVideo ? (
              <video
                src={url}
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay={autoplay}
                muted={autoplay}
                loop={loop}
                controls={!autoplay}
                playsInline
              />
            ) : (
              <iframe
                src={getEmbedUrl(url)}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            )
          ) : (
            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
              <svg
                className="w-16 h-16 mb-4 text-gray-400 dark:text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm">Ingresa una URL de video</span>
              <span className="text-xs mt-1 opacity-75">YouTube, Vimeo o URL directa</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

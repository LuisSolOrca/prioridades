'use client';

import { ILandingGlobalStyles } from '@/models/LandingPage';

interface HeroContent {
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  backgroundImage?: string;
  backgroundVideo?: string;
  alignment?: 'left' | 'center' | 'right';
  overlayOpacity?: number;
}

interface HeroSectionProps {
  content: HeroContent;
  styles?: Record<string, any>;
  globalStyles: ILandingGlobalStyles;
}

export default function HeroSection({ content, styles, globalStyles }: HeroSectionProps) {
  const {
    title,
    subtitle,
    ctaText,
    ctaUrl,
    secondaryCtaText,
    secondaryCtaUrl,
    backgroundImage,
    backgroundVideo,
    alignment = 'center',
    overlayOpacity = 0.5,
  } = content;

  const alignmentClasses = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  };

  const containerStyle: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor || globalStyles.backgroundColor,
    backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative',
    padding: styles?.padding || '80px 24px',
    minHeight: styles?.minHeight || '500px',
    display: 'flex',
    alignItems: 'center',
  };

  const textColor = styles?.color || (backgroundImage ? '#ffffff' : globalStyles.textColor);

  return (
    <section style={containerStyle}>
      {/* Overlay for background image */}
      {backgroundImage && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: `rgba(0,0,0,${overlayOpacity})`,
          }}
        />
      )}

      {/* Background video */}
      {backgroundVideo && (
        <video
          autoPlay
          muted
          loop
          playsInline
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        >
          <source src={backgroundVideo} type="video/mp4" />
        </video>
      )}

      <div
        className={`relative z-10 w-full max-w-[var(--container-width)] mx-auto flex flex-col ${alignmentClasses[alignment]}`}
      >
        <h1
          style={{
            fontFamily: 'var(--heading-font)',
            color: textColor,
            fontSize: styles?.titleSize || '3rem',
            fontWeight: 700,
            marginBottom: '1.5rem',
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>

        {subtitle && (
          <p
            style={{
              fontFamily: 'var(--font-family)',
              color: textColor,
              fontSize: styles?.subtitleSize || '1.25rem',
              opacity: 0.9,
              marginBottom: '2rem',
              maxWidth: alignment === 'center' ? '700px' : undefined,
            }}
          >
            {subtitle}
          </p>
        )}

        <div className={`flex gap-4 ${alignment === 'center' ? 'justify-center' : ''}`}>
          {ctaText && (
            <a
              href={ctaUrl || '#'}
              style={{
                backgroundColor: globalStyles.primaryColor,
                color: '#ffffff',
                padding: '14px 32px',
                borderRadius: 'var(--border-radius)',
                fontWeight: 600,
                fontSize: '1rem',
                textDecoration: 'none',
                display: 'inline-block',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              className="hover:scale-105 hover:shadow-lg"
            >
              {ctaText}
            </a>
          )}

          {secondaryCtaText && (
            <a
              href={secondaryCtaUrl || '#'}
              style={{
                backgroundColor: 'transparent',
                color: textColor,
                padding: '14px 32px',
                borderRadius: 'var(--border-radius)',
                fontWeight: 600,
                fontSize: '1rem',
                textDecoration: 'none',
                display: 'inline-block',
                border: `2px solid ${textColor}`,
                transition: 'transform 0.2s',
              }}
              className="hover:scale-105"
            >
              {secondaryCtaText}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

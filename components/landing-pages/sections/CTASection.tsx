'use client';

import { ILandingGlobalStyles } from '@/models/LandingPage';

interface CTAContent {
  title: string;
  subtitle?: string;
  ctaText: string;
  ctaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
}

interface CTASectionProps {
  content: CTAContent;
  styles?: Record<string, any>;
  globalStyles: ILandingGlobalStyles;
}

export default function CTASection({ content, styles, globalStyles }: CTASectionProps) {
  const { title, subtitle, ctaText, ctaUrl, secondaryCtaText, secondaryCtaUrl } = content;

  const bgColor = styles?.backgroundColor || globalStyles.primaryColor;
  const isLight = bgColor === '#ffffff' || bgColor === '#fff' || bgColor === 'white';
  const textColor = isLight ? globalStyles.textColor : '#ffffff';

  return (
    <section
      style={{
        backgroundColor: bgColor,
        padding: styles?.padding || '80px 24px',
      }}
    >
      <div className="max-w-[var(--container-width)] mx-auto text-center">
        <h2
          style={{
            fontFamily: 'var(--heading-font)',
            color: textColor,
            fontSize: '2.5rem',
            fontWeight: 700,
            marginBottom: '1rem',
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            style={{
              fontFamily: 'var(--font-family)',
              color: textColor,
              opacity: 0.9,
              fontSize: '1.25rem',
              marginBottom: '2rem',
              maxWidth: '600px',
              margin: '0 auto 2rem',
            }}
          >
            {subtitle}
          </p>
        )}
        <div className="flex gap-4 justify-center flex-wrap">
          <a
            href={ctaUrl || '#'}
            style={{
              backgroundColor: isLight ? globalStyles.primaryColor : '#ffffff',
              color: isLight ? '#ffffff' : globalStyles.primaryColor,
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

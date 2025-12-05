'use client';

import { ILandingGlobalStyles } from '@/models/LandingPage';

interface LogoItem { url: string; alt: string; link?: string; }
interface LogosContent { title?: string; logos: LogoItem[]; }
interface LogosSectionProps { content: LogosContent; styles?: Record<string, any>; globalStyles: ILandingGlobalStyles; }

export default function LogosSection({ content, styles, globalStyles }: LogosSectionProps) {
  const { title, logos = [] } = content;

  return (
    <section style={{ backgroundColor: styles?.backgroundColor || '#ffffff', padding: styles?.padding || '40px 24px' }}>
      <div className="max-w-[var(--container-width)] mx-auto">
        {title && <p className="text-center mb-8" style={{ fontFamily: 'var(--font-family)', color: globalStyles.textColor, opacity: 0.6, fontSize: '0.95rem' }}>{title}</p>}
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {logos.map((logo, index) => (
            logo.link ? (
              <a key={index} href={logo.link} target="_blank" rel="noopener noreferrer" className="opacity-50 hover:opacity-100 transition-opacity">
                <img src={logo.url} alt={logo.alt} className="h-8 md:h-10 object-contain grayscale hover:grayscale-0 transition-all" />
              </a>
            ) : (
              <img key={index} src={logo.url} alt={logo.alt} className="h-8 md:h-10 object-contain opacity-50 grayscale" />
            )
          ))}
        </div>
      </div>
    </section>
  );
}

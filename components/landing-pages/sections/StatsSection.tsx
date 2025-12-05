'use client';

import { ILandingGlobalStyles } from '@/models/LandingPage';

interface StatItem { value: string; label: string; }
interface StatsContent { title?: string; items: StatItem[]; }
interface StatsSectionProps { content: StatsContent; styles?: Record<string, any>; globalStyles: ILandingGlobalStyles; }

export default function StatsSection({ content, styles, globalStyles }: StatsSectionProps) {
  const { title, items = [] } = content;
  const bgColor = styles?.backgroundColor || globalStyles.primaryColor;
  const isLight = bgColor === '#ffffff' || bgColor === '#fff';
  const textColor = isLight ? globalStyles.textColor : '#ffffff';

  return (
    <section style={{ backgroundColor: bgColor, padding: styles?.padding || '60px 24px' }}>
      <div className="max-w-[var(--container-width)] mx-auto">
        {title && <h2 className="text-center mb-12" style={{ fontFamily: 'var(--heading-font)', color: textColor, fontSize: '2rem', fontWeight: 700 }}>{title}</h2>}
        <div className={`grid gap-8 ${items.length <= 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-4'}`}>
          {items.map((item, index) => (
            <div key={index} className="text-center">
              <p style={{ fontFamily: 'var(--heading-font)', color: textColor, fontSize: '3rem', fontWeight: 700, marginBottom: '0.5rem' }}>{item.value}</p>
              <p style={{ fontFamily: 'var(--font-family)', color: textColor, opacity: 0.9, fontSize: '1rem' }}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

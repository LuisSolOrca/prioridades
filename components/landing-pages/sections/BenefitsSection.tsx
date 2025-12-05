'use client';

import { ILandingGlobalStyles } from '@/models/LandingPage';
import { Check } from 'lucide-react';

interface BenefitItem {
  icon?: string;
  title: string;
  description?: string;
}

interface BenefitsContent {
  title?: string;
  subtitle?: string;
  items: BenefitItem[];
}

interface BenefitsSectionProps {
  content: BenefitsContent;
  styles?: Record<string, any>;
  globalStyles: ILandingGlobalStyles;
}

export default function BenefitsSection({ content, styles, globalStyles }: BenefitsSectionProps) {
  const { title, subtitle, items = [] } = content;

  return (
    <section
      style={{
        backgroundColor: styles?.backgroundColor || '#ffffff',
        padding: styles?.padding || '60px 24px',
      }}
    >
      <div className="max-w-[var(--container-width)] mx-auto">
        {(title || subtitle) && (
          <div className="text-center mb-12">
            {title && (
              <h2 style={{ fontFamily: 'var(--heading-font)', color: globalStyles.textColor, fontSize: '2.25rem', fontWeight: 700, marginBottom: '1rem' }}>
                {title}
              </h2>
            )}
            {subtitle && (
              <p style={{ fontFamily: 'var(--font-family)', color: globalStyles.textColor, opacity: 0.7, fontSize: '1.125rem' }}>
                {subtitle}
              </p>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {items.map((item, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${globalStyles.secondaryColor}20` }}>
                <Check className="w-5 h-5" style={{ color: globalStyles.secondaryColor }} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--heading-font)', color: globalStyles.textColor, fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  {item.title}
                </h3>
                {item.description && (
                  <p style={{ fontFamily: 'var(--font-family)', color: globalStyles.textColor, opacity: 0.7, fontSize: '0.95rem' }}>
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

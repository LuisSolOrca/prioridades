'use client';

import { ILandingGlobalStyles } from '@/models/LandingPage';
import { Check } from 'lucide-react';

interface PricingPlan {
  name: string;
  price: string;
  period?: string;
  description?: string;
  features: string[];
  ctaText: string;
  ctaUrl?: string;
  highlighted?: boolean;
}

interface PricingContent {
  title?: string;
  subtitle?: string;
  plans: PricingPlan[];
}

interface PricingSectionProps {
  content: PricingContent;
  styles?: Record<string, any>;
  globalStyles: ILandingGlobalStyles;
}

export default function PricingSection({ content, styles, globalStyles }: PricingSectionProps) {
  const { title, subtitle, plans = [] } = content;

  return (
    <section style={{ backgroundColor: styles?.backgroundColor || '#F9FAFB', padding: styles?.padding || '80px 24px' }} id="pricing">
      <div className="max-w-[var(--container-width)] mx-auto">
        {(title || subtitle) && (
          <div className="text-center mb-12">
            {title && <h2 style={{ fontFamily: 'var(--heading-font)', color: globalStyles.textColor, fontSize: '2.25rem', fontWeight: 700, marginBottom: '1rem' }}>{title}</h2>}
            {subtitle && <p style={{ fontFamily: 'var(--font-family)', color: globalStyles.textColor, opacity: 0.7, fontSize: '1.125rem' }}>{subtitle}</p>}
          </div>
        )}
        <div className={`grid gap-8 ${plans.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-2xl p-8 ${plan.highlighted ? 'ring-2 shadow-xl scale-105' : 'shadow-md'}`}
              style={{ borderColor: plan.highlighted ? globalStyles.primaryColor : undefined, borderRadius: 'var(--border-radius)' }}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 text-sm font-semibold text-white rounded-full" style={{ backgroundColor: globalStyles.primaryColor }}>
                  Popular
                </div>
              )}
              <h3 style={{ fontFamily: 'var(--heading-font)', color: globalStyles.textColor, fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>{plan.name}</h3>
              {plan.description && <p style={{ color: globalStyles.textColor, opacity: 0.6, fontSize: '0.95rem', marginBottom: '1rem' }}>{plan.description}</p>}
              <div className="mb-6">
                <span style={{ fontFamily: 'var(--heading-font)', color: globalStyles.textColor, fontSize: '3rem', fontWeight: 700 }}>{plan.price}</span>
                {plan.period && <span style={{ color: globalStyles.textColor, opacity: 0.6 }}>{plan.period}</span>}
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="w-5 h-5 flex-shrink-0" style={{ color: globalStyles.secondaryColor }} />
                    <span style={{ color: globalStyles.textColor, fontSize: '0.95rem' }}>{feature}</span>
                  </li>
                ))}
              </ul>
              <a
                href={plan.ctaUrl || '#'}
                className="block w-full text-center py-3 font-semibold rounded-lg transition-all hover:scale-[1.02]"
                style={{
                  backgroundColor: plan.highlighted ? globalStyles.primaryColor : 'transparent',
                  color: plan.highlighted ? '#ffffff' : globalStyles.primaryColor,
                  border: plan.highlighted ? 'none' : `2px solid ${globalStyles.primaryColor}`,
                  borderRadius: 'var(--border-radius)',
                }}
              >
                {plan.ctaText}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

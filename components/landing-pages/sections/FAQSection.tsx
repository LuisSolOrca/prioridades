'use client';

import { useState } from 'react';
import { ILandingGlobalStyles } from '@/models/LandingPage';
import { ChevronDown } from 'lucide-react';

interface FAQItem { question: string; answer: string; }
interface FAQContent { title?: string; subtitle?: string; items: FAQItem[]; }
interface FAQSectionProps { content: FAQContent; styles?: Record<string, any>; globalStyles: ILandingGlobalStyles; }

export default function FAQSection({ content, styles, globalStyles }: FAQSectionProps) {
  const { title, subtitle, items = [] } = content;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section style={{ backgroundColor: styles?.backgroundColor || '#ffffff', padding: styles?.padding || '80px 24px' }} id="faq">
      <div className="max-w-3xl mx-auto">
        {(title || subtitle) && (
          <div className="text-center mb-12">
            {title && <h2 style={{ fontFamily: 'var(--heading-font)', color: globalStyles.textColor, fontSize: '2.25rem', fontWeight: 700, marginBottom: '1rem' }}>{title}</h2>}
            {subtitle && <p style={{ fontFamily: 'var(--font-family)', color: globalStyles.textColor, opacity: 0.7, fontSize: '1.125rem' }}>{subtitle}</p>}
          </div>
        )}
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="border rounded-lg overflow-hidden" style={{ borderRadius: 'var(--border-radius)' }}>
              <button onClick={() => setOpenIndex(openIndex === index ? null : index)} className="w-full flex items-center justify-between p-5 text-left bg-white hover:bg-gray-50">
                <span style={{ fontFamily: 'var(--heading-font)', color: globalStyles.textColor, fontWeight: 600, fontSize: '1.1rem' }}>{item.question}</span>
                <ChevronDown className={`w-5 h-5 transition-transform ${openIndex === index ? 'rotate-180' : ''}`} style={{ color: globalStyles.primaryColor }} />
              </button>
              {openIndex === index && (
                <div className="p-5 pt-0 bg-white">
                  <p style={{ fontFamily: 'var(--font-family)', color: globalStyles.textColor, opacity: 0.8, lineHeight: 1.7 }}>{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

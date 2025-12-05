'use client';

import { useState, useEffect, useCallback } from 'react';
import { ILandingGlobalStyles } from '@/models/LandingPage';
import { Quote, ChevronLeft, ChevronRight } from 'lucide-react';

interface TestimonialItem {
  quote: string;
  author: string;
  role?: string;
  company?: string;
  image?: string;
  rating?: number;
}

interface TestimonialsContent {
  title?: string;
  subtitle?: string;
  items: TestimonialItem[];
  layout?: 'grid' | 'carousel';
  autoplay?: boolean;
  autoplayInterval?: number;
}

interface TestimonialsSectionProps {
  content: TestimonialsContent;
  styles?: Record<string, any>;
  globalStyles: ILandingGlobalStyles;
}

function TestimonialCard({ item, globalStyles }: { item: TestimonialItem; globalStyles: ILandingGlobalStyles }) {
  return (
    <div className="bg-gray-50 rounded-lg p-6 h-full" style={{ borderRadius: 'var(--border-radius)' }}>
      <Quote className="w-8 h-8 mb-4" style={{ color: globalStyles.primaryColor, opacity: 0.3 }} />
      {item.rating && (
        <div className="flex gap-1 mb-3">
          {[...Array(5)].map((_, i) => (
            <svg key={i} className="w-5 h-5" fill={i < item.rating! ? '#F59E0B' : '#E5E7EB'} viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
      )}
      <p style={{ fontFamily: 'var(--font-family)', color: globalStyles.textColor, fontSize: '1rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>"{item.quote}"</p>
      <div className="flex items-center gap-3">
        {item.image ? (
          <img src={item.image} alt={item.author} className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: globalStyles.primaryColor }}>
            {item.author.charAt(0)}
          </div>
        )}
        <div>
          <p style={{ fontFamily: 'var(--heading-font)', color: globalStyles.textColor, fontWeight: 600 }}>{item.author}</p>
          {(item.role || item.company) && (
            <p style={{ fontFamily: 'var(--font-family)', color: globalStyles.textColor, opacity: 0.6, fontSize: '0.875rem' }}>
              {item.role}{item.role && item.company && ', '}{item.company}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TestimonialsSection({ content, styles, globalStyles }: TestimonialsSectionProps) {
  const { title, subtitle, items = [], layout = 'grid', autoplay = true, autoplayInterval = 5000 } = content;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (layout !== 'carousel' || !autoplay || isPaused || items.length <= 1) return;

    const interval = setInterval(goToNext, autoplayInterval);
    return () => clearInterval(interval);
  }, [layout, autoplay, autoplayInterval, isPaused, items.length, goToNext]);

  return (
    <section style={{ backgroundColor: styles?.backgroundColor || '#ffffff', padding: styles?.padding || '60px 24px' }}>
      <div className="max-w-[var(--container-width)] mx-auto">
        {(title || subtitle) && (
          <div className="text-center mb-12">
            {title && <h2 style={{ fontFamily: 'var(--heading-font)', color: globalStyles.textColor, fontSize: '2.25rem', fontWeight: 700, marginBottom: '1rem' }}>{title}</h2>}
            {subtitle && <p style={{ fontFamily: 'var(--font-family)', color: globalStyles.textColor, opacity: 0.7, fontSize: '1.125rem' }}>{subtitle}</p>}
          </div>
        )}

        {layout === 'carousel' ? (
          <div
            className="relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Carousel Container */}
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
              >
                {items.map((item, index) => (
                  <div key={index} className="w-full flex-shrink-0 px-4">
                    <div className="max-w-2xl mx-auto">
                      <TestimonialCard item={item} globalStyles={globalStyles} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Arrows */}
            {items.length > 1 && (
              <>
                <button
                  onClick={goToPrev}
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                  style={{ backgroundColor: globalStyles.primaryColor }}
                  aria-label="Anterior"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={goToNext}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                  style={{ backgroundColor: globalStyles.primaryColor }}
                  aria-label="Siguiente"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </>
            )}

            {/* Dots Indicator */}
            {items.length > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                {items.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className="w-2.5 h-2.5 rounded-full transition-colors"
                    style={{
                      backgroundColor: index === currentIndex ? globalStyles.primaryColor : '#D1D5DB'
                    }}
                    aria-label={`Ir al testimonio ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((item, index) => (
              <TestimonialCard key={index} item={item} globalStyles={globalStyles} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

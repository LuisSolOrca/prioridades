'use client';

import { ILandingGlobalStyles } from '@/models/LandingPage';

interface GalleryItem { url: string; alt?: string; caption?: string; }
interface GalleryContent { title?: string; columns?: 2 | 3 | 4; items: GalleryItem[]; }
interface GallerySectionProps { content: GalleryContent; styles?: Record<string, any>; globalStyles: ILandingGlobalStyles; }

export default function GallerySection({ content, styles, globalStyles }: GallerySectionProps) {
  const { title, columns = 3, items = [] } = content;
  const gridCols = { 2: 'grid-cols-1 md:grid-cols-2', 3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3', 4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' };

  return (
    <section style={{ backgroundColor: styles?.backgroundColor || '#ffffff', padding: styles?.padding || '60px 24px' }}>
      <div className="max-w-[var(--container-width)] mx-auto">
        {title && <h2 className="text-center mb-10" style={{ fontFamily: 'var(--heading-font)', color: globalStyles.textColor, fontSize: '2rem', fontWeight: 700 }}>{title}</h2>}
        <div className={`grid ${gridCols[columns]} gap-4`}>
          {items.map((item, i) => (
            <div key={i} className="relative overflow-hidden rounded-lg group" style={{ borderRadius: 'var(--border-radius)' }}>
              <img src={item.url} alt={item.alt || ''} className="w-full h-48 object-cover transition-transform group-hover:scale-105" />
              {item.caption && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <p className="text-white text-sm">{item.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

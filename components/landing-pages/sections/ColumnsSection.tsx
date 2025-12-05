'use client';

import { ILandingGlobalStyles, ILandingSection } from '@/models/LandingPage';
import SectionRenderer from './SectionRenderer';

interface ColumnsContent { columns: 2 | 3 | 4; children?: ILandingSection[][]; gap?: number; }
interface ColumnsSectionProps { content: ColumnsContent; styles?: Record<string, any>; globalStyles: ILandingGlobalStyles; }

export default function ColumnsSection({ content, styles, globalStyles }: ColumnsSectionProps) {
  const { columns = 2, children = [], gap = 24 } = content;
  const gridCols = { 2: 'grid-cols-1 md:grid-cols-2', 3: 'grid-cols-1 md:grid-cols-3', 4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' };

  return (
    <section style={{ backgroundColor: styles?.backgroundColor || 'transparent', padding: styles?.padding || '40px 24px' }}>
      <div className="max-w-[var(--container-width)] mx-auto">
        <div className={`grid ${gridCols[columns]}`} style={{ gap: `${gap}px` }}>
          {children.map((columnSections, colIndex) => (
            <div key={colIndex} className="flex flex-col gap-4">
              {columnSections.map((section) => (
                <SectionRenderer key={section.id} section={section} globalStyles={globalStyles} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

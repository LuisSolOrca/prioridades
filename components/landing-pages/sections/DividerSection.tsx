'use client';

import { ILandingGlobalStyles } from '@/models/LandingPage';

interface DividerContent { style?: 'solid' | 'dashed' | 'dotted'; width?: string; }
interface DividerSectionProps { content: DividerContent; styles?: Record<string, any>; globalStyles: ILandingGlobalStyles; }

export default function DividerSection({ content, styles, globalStyles }: DividerSectionProps) {
  return (
    <section style={{ backgroundColor: styles?.backgroundColor || 'transparent', padding: styles?.padding || '20px 24px' }}>
      <div className="max-w-[var(--container-width)] mx-auto">
        <hr style={{ border: 'none', borderTop: `1px ${content.style || 'solid'} ${globalStyles.textColor}20`, width: content.width || '100%', margin: '0 auto' }} />
      </div>
    </section>
  );
}

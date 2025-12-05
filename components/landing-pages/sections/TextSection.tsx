'use client';

import { ILandingGlobalStyles } from '@/models/LandingPage';

interface TextContent { html: string; }
interface TextSectionProps { content: TextContent; styles?: Record<string, any>; globalStyles: ILandingGlobalStyles; }

export default function TextSection({ content, styles, globalStyles }: TextSectionProps) {
  return (
    <section style={{ backgroundColor: styles?.backgroundColor || '#ffffff', padding: styles?.padding || '40px 24px' }}>
      <div
        className="max-w-3xl mx-auto prose prose-lg"
        style={{ fontFamily: 'var(--font-family)', color: globalStyles.textColor }}
        dangerouslySetInnerHTML={{ __html: content.html || '' }}
      />
    </section>
  );
}

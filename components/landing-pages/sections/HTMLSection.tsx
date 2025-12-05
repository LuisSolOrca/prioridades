'use client';

import { ILandingGlobalStyles } from '@/models/LandingPage';

interface HTMLContent { html: string; css?: string; }
interface HTMLSectionProps { content: HTMLContent; styles?: Record<string, any>; globalStyles: ILandingGlobalStyles; }

export default function HTMLSection({ content, styles }: HTMLSectionProps) {
  return (
    <section style={{ backgroundColor: styles?.backgroundColor || 'transparent', padding: styles?.padding || '0' }}>
      {content.css && <style dangerouslySetInnerHTML={{ __html: content.css }} />}
      <div dangerouslySetInnerHTML={{ __html: content.html || '' }} />
    </section>
  );
}

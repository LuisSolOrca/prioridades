'use client';

import { ILandingGlobalStyles } from '@/models/LandingPage';

interface SpacerContent { height?: number; }
interface SpacerSectionProps { content: SpacerContent; styles?: Record<string, any>; globalStyles: ILandingGlobalStyles; }

export default function SpacerSection({ content, styles }: SpacerSectionProps) {
  return <div style={{ height: content.height || styles?.height || 40, backgroundColor: styles?.backgroundColor || 'transparent' }} />;
}

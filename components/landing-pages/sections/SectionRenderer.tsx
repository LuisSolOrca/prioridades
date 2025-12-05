'use client';

import { ILandingSection, ILandingGlobalStyles } from '@/models/LandingPage';
import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';
import BenefitsSection from './BenefitsSection';
import TestimonialsSection from './TestimonialsSection';
import PricingSection from './PricingSection';
import FAQSection from './FAQSection';
import CTASection from './CTASection';
import FormSection from './FormSection';
import VideoSection from './VideoSection';
import StatsSection from './StatsSection';
import LogosSection from './LogosSection';
import TextSection from './TextSection';
import DividerSection from './DividerSection';
import SpacerSection from './SpacerSection';
import HeaderSection from './HeaderSection';
import FooterSection from './FooterSection';
import CountdownSection from './CountdownSection';
import GallerySection from './GallerySection';
import TeamSection from './TeamSection';
import ComparisonSection from './ComparisonSection';
import ColumnsSection from './ColumnsSection';
import HTMLSection from './HTMLSection';

interface SectionRendererProps {
  section: ILandingSection;
  globalStyles: ILandingGlobalStyles;
  isEditing?: boolean;
  onSelect?: () => void;
  isSelected?: boolean;
  form?: any;
  onFormSubmit?: (data: any) => void;
}

export default function SectionRenderer({
  section,
  globalStyles,
  isEditing = false,
  onSelect,
  isSelected = false,
  form,
  onFormSubmit,
}: SectionRendererProps) {
  const sectionStyles = {
    ...section.styles,
    '--primary-color': globalStyles.primaryColor,
    '--secondary-color': globalStyles.secondaryColor,
    '--text-color': globalStyles.textColor,
    '--font-family': globalStyles.fontFamily,
    '--heading-font': globalStyles.headingFontFamily || globalStyles.fontFamily,
    '--container-width': `${globalStyles.containerWidth}px`,
    '--border-radius': `${globalStyles.borderRadius}px`,
  } as React.CSSProperties;

  const wrapperClasses = `
    landing-section
    ${isEditing ? 'cursor-pointer hover:outline hover:outline-2 hover:outline-blue-300' : ''}
    ${isSelected ? 'outline outline-2 outline-blue-500' : ''}
  `;

  const renderSection = () => {
    const commonProps = {
      content: section.content,
      styles: section.styles,
      globalStyles,
    };

    switch (section.type) {
      case 'hero':
        return <HeroSection {...commonProps} />;
      case 'features':
        return <FeaturesSection {...commonProps} />;
      case 'benefits':
        return <BenefitsSection {...commonProps} />;
      case 'testimonials':
        return <TestimonialsSection {...commonProps} />;
      case 'pricing':
        return <PricingSection {...commonProps} />;
      case 'faq':
        return <FAQSection {...commonProps} />;
      case 'cta':
        return <CTASection {...commonProps} />;
      case 'form':
        return <FormSection {...commonProps} form={form} onSubmit={onFormSubmit} />;
      case 'video':
        return <VideoSection {...commonProps} />;
      case 'stats':
        return <StatsSection {...commonProps} />;
      case 'logos':
        return <LogosSection {...commonProps} />;
      case 'text':
        return <TextSection {...commonProps} />;
      case 'divider':
        return <DividerSection {...commonProps} />;
      case 'spacer':
        return <SpacerSection {...commonProps} />;
      case 'header':
        return <HeaderSection {...commonProps} />;
      case 'footer':
        return <FooterSection {...commonProps} />;
      case 'countdown':
        return <CountdownSection {...commonProps} />;
      case 'gallery':
        return <GallerySection {...commonProps} />;
      case 'team':
        return <TeamSection {...commonProps} />;
      case 'comparison':
        return <ComparisonSection {...commonProps} />;
      case 'columns':
        return <ColumnsSection {...commonProps} globalStyles={globalStyles} />;
      case 'html':
        return <HTMLSection {...commonProps} />;
      default:
        return (
          <div className="p-8 text-center text-gray-500">
            Seccion no soportada: {section.type}
          </div>
        );
    }
  };

  // Check visibility for responsive
  const visibility = section.visibility || { desktop: true, mobile: true };

  return (
    <div
      className={wrapperClasses}
      style={sectionStyles}
      onClick={isEditing ? onSelect : undefined}
      data-section-id={section.id}
      data-section-type={section.type}
      data-visibility-desktop={visibility.desktop}
      data-visibility-mobile={visibility.mobile}
    >
      {renderSection()}
    </div>
  );
}

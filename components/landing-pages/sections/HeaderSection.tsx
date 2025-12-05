'use client';

import { useState } from 'react';
import { ILandingGlobalStyles } from '@/models/LandingPage';
import { Menu, X } from 'lucide-react';

interface MenuItem { label: string; url: string; }
interface HeaderContent { logo?: string; logoText?: string; menuItems?: MenuItem[]; ctaText?: string; ctaUrl?: string; sticky?: boolean; }
interface HeaderSectionProps { content: HeaderContent; styles?: Record<string, any>; globalStyles: ILandingGlobalStyles; }

export default function HeaderSection({ content, styles, globalStyles }: HeaderSectionProps) {
  const { logo, logoText, menuItems = [], ctaText, ctaUrl, sticky } = content;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header style={{ backgroundColor: styles?.backgroundColor || '#ffffff', padding: styles?.padding || '16px 24px', position: sticky ? 'sticky' : 'relative', top: 0, zIndex: 50, boxShadow: sticky ? '0 1px 3px rgba(0,0,0,0.1)' : undefined }}>
      <div className="max-w-[var(--container-width)] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          {logo ? <img src={logo} alt="Logo" className="h-8" /> : logoText && <span style={{ fontFamily: 'var(--heading-font)', color: globalStyles.textColor, fontSize: '1.5rem', fontWeight: 700 }}>{logoText}</span>}
        </div>
        <nav className="hidden md:flex items-center gap-8">
          {menuItems.map((item, i) => (
            <a key={i} href={item.url} style={{ fontFamily: 'var(--font-family)', color: globalStyles.textColor, fontSize: '0.95rem', textDecoration: 'none' }} className="hover:opacity-70">{item.label}</a>
          ))}
          {ctaText && (
            <a href={ctaUrl || '#'} style={{ backgroundColor: globalStyles.primaryColor, color: '#fff', padding: '10px 20px', borderRadius: 'var(--border-radius)', fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none' }} className="hover:opacity-90">{ctaText}</a>
          )}
        </nav>
        <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}</button>
      </div>
      {mobileMenuOpen && (
        <nav className="md:hidden mt-4 pb-4 flex flex-col gap-4">
          {menuItems.map((item, i) => (
            <a key={i} href={item.url} style={{ color: globalStyles.textColor }} onClick={() => setMobileMenuOpen(false)}>{item.label}</a>
          ))}
          {ctaText && <a href={ctaUrl || '#'} style={{ backgroundColor: globalStyles.primaryColor, color: '#fff', padding: '10px 20px', borderRadius: 'var(--border-radius)', textAlign: 'center' }}>{ctaText}</a>}
        </nav>
      )}
    </header>
  );
}

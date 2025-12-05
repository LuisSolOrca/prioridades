'use client';

import { ILandingGlobalStyles } from '@/models/LandingPage';

interface FooterLink { label: string; url: string; }
interface SocialLink { platform: string; url: string; }
interface FooterContent { companyName?: string; logo?: string; description?: string; links?: FooterLink[]; socialLinks?: SocialLink[]; copyright?: string; }
interface FooterSectionProps { content: FooterContent; styles?: Record<string, any>; globalStyles: ILandingGlobalStyles; }

export default function FooterSection({ content, styles, globalStyles }: FooterSectionProps) {
  const { companyName, logo, description, links = [], socialLinks = [], copyright } = content;
  const bgColor = styles?.backgroundColor || '#1F2937';
  const textColor = bgColor === '#ffffff' ? globalStyles.textColor : '#ffffff';

  return (
    <footer style={{ backgroundColor: bgColor, padding: styles?.padding || '60px 24px 30px' }}>
      <div className="max-w-[var(--container-width)] mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            {logo ? <img src={logo} alt="Logo" className="h-8 mb-4" /> : companyName && <p style={{ fontFamily: 'var(--heading-font)', color: textColor, fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>{companyName}</p>}
            {description && <p style={{ color: textColor, opacity: 0.7, fontSize: '0.95rem', maxWidth: '300px' }}>{description}</p>}
          </div>
          {links.length > 0 && (
            <div>
              <p style={{ color: textColor, fontWeight: 600, marginBottom: '1rem' }}>Enlaces</p>
              <ul className="space-y-2">
                {links.map((link, i) => (
                  <li key={i}><a href={link.url} style={{ color: textColor, opacity: 0.7, textDecoration: 'none' }} className="hover:opacity-100">{link.label}</a></li>
                ))}
              </ul>
            </div>
          )}
          {socialLinks.length > 0 && (
            <div>
              <p style={{ color: textColor, fontWeight: 600, marginBottom: '1rem' }}>Siguenos</p>
              <div className="flex gap-4">
                {socialLinks.map((social, i) => (
                  <a key={i} href={social.url} target="_blank" rel="noopener noreferrer" style={{ color: textColor, opacity: 0.7 }} className="hover:opacity-100">{social.platform}</a>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ borderTop: `1px solid ${textColor}20`, paddingTop: '1.5rem' }}>
          <p style={{ color: textColor, opacity: 0.6, fontSize: '0.875rem', textAlign: 'center' }}>{copyright || `© ${new Date().getFullYear()} ${companyName || 'Company'}. Todos los derechos reservados.`}</p>
        </div>
      </div>
    </footer>
  );
}

'use client';

import { ILandingGlobalStyles } from '@/models/LandingPage';
import { Linkedin, Twitter } from 'lucide-react';

interface TeamMember { name: string; role: string; image?: string; bio?: string; linkedin?: string; twitter?: string; }
interface TeamContent { title?: string; subtitle?: string; members: TeamMember[]; }
interface TeamSectionProps { content: TeamContent; styles?: Record<string, any>; globalStyles: ILandingGlobalStyles; }

export default function TeamSection({ content, styles, globalStyles }: TeamSectionProps) {
  const { title, subtitle, members = [] } = content;

  return (
    <section style={{ backgroundColor: styles?.backgroundColor || '#ffffff', padding: styles?.padding || '60px 24px' }}>
      <div className="max-w-[var(--container-width)] mx-auto">
        {(title || subtitle) && (
          <div className="text-center mb-12">
            {title && <h2 style={{ fontFamily: 'var(--heading-font)', color: globalStyles.textColor, fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{title}</h2>}
            {subtitle && <p style={{ color: globalStyles.textColor, opacity: 0.7 }}>{subtitle}</p>}
          </div>
        )}
        <div className={`grid gap-8 ${members.length <= 3 ? 'grid-cols-1 md:grid-cols-3 max-w-4xl mx-auto' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
          {members.map((member, i) => (
            <div key={i} className="text-center">
              {member.image ? (
                <img src={member.image} alt={member.name} className="w-32 h-32 rounded-full object-cover mx-auto mb-4" />
              ) : (
                <div className="w-32 h-32 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white" style={{ backgroundColor: globalStyles.primaryColor }}>{member.name.charAt(0)}</div>
              )}
              <h3 style={{ fontFamily: 'var(--heading-font)', color: globalStyles.textColor, fontSize: '1.25rem', fontWeight: 600 }}>{member.name}</h3>
              <p style={{ color: globalStyles.primaryColor, fontSize: '0.95rem', marginBottom: '0.5rem' }}>{member.role}</p>
              {member.bio && <p style={{ color: globalStyles.textColor, opacity: 0.7, fontSize: '0.9rem', marginBottom: '0.75rem' }}>{member.bio}</p>}
              {(member.linkedin || member.twitter) && (
                <div className="flex justify-center gap-3 mt-3">
                  {member.linkedin && (
                    <a
                      href={member.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
                      style={{ backgroundColor: globalStyles.primaryColor }}
                    >
                      <Linkedin className="w-4 h-4 text-white" />
                    </a>
                  )}
                  {member.twitter && (
                    <a
                      href={member.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
                      style={{ backgroundColor: globalStyles.primaryColor }}
                    >
                      <Twitter className="w-4 h-4 text-white" />
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

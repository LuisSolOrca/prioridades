'use client';

import { ILandingGlobalStyles } from '@/models/LandingPage';
import { Check, X } from 'lucide-react';

interface ComparisonRow { feature: string; us: boolean | string; them: boolean | string; }
interface ComparisonContent { title?: string; ourName?: string; theirName?: string; rows: ComparisonRow[]; }
interface ComparisonSectionProps { content: ComparisonContent; styles?: Record<string, any>; globalStyles: ILandingGlobalStyles; }

export default function ComparisonSection({ content, styles, globalStyles }: ComparisonSectionProps) {
  const { title, ourName = 'Nosotros', theirName = 'Competencia', rows = [] } = content;

  const renderValue = (value: boolean | string, isUs: boolean) => {
    if (typeof value === 'boolean') {
      return value ? <Check className="w-5 h-5" style={{ color: isUs ? globalStyles.secondaryColor : '#9CA3AF' }} /> : <X className="w-5 h-5 text-red-400" />;
    }
    return <span style={{ color: globalStyles.textColor }}>{value}</span>;
  };

  return (
    <section style={{ backgroundColor: styles?.backgroundColor || '#F9FAFB', padding: styles?.padding || '60px 24px' }}>
      <div className="max-w-4xl mx-auto">
        {title && <h2 className="text-center mb-10" style={{ fontFamily: 'var(--heading-font)', color: globalStyles.textColor, fontSize: '2rem', fontWeight: 700 }}>{title}</h2>}
        <div className="bg-white rounded-xl shadow-md overflow-hidden" style={{ borderRadius: 'var(--border-radius)' }}>
          <table className="w-full">
            <thead style={{ backgroundColor: globalStyles.primaryColor }}>
              <tr>
                <th className="p-4 text-left text-white">Caracteristica</th>
                <th className="p-4 text-center text-white font-bold">{ourName}</th>
                <th className="p-4 text-center text-white/70">{theirName}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="p-4" style={{ color: globalStyles.textColor }}>{row.feature}</td>
                  <td className="p-4 text-center">{renderValue(row.us, true)}</td>
                  <td className="p-4 text-center">{renderValue(row.them, false)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

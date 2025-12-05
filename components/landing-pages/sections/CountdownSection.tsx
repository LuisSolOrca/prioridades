'use client';

import { useState, useEffect } from 'react';
import { ILandingGlobalStyles } from '@/models/LandingPage';

interface CountdownContent { title?: string; targetDate: string; expiredMessage?: string; }
interface CountdownSectionProps { content: CountdownContent; styles?: Record<string, any>; globalStyles: ILandingGlobalStyles; }

export default function CountdownSection({ content, styles, globalStyles }: CountdownSectionProps) {
  const { title, targetDate, expiredMessage = 'El evento ha comenzado' } = content;
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setExpired(true); clearInterval(timer); return; }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="text-center">
      <div className="bg-white rounded-lg shadow-md p-4 mb-2" style={{ borderRadius: 'var(--border-radius)' }}>
        <span style={{ fontFamily: 'var(--heading-font)', color: globalStyles.primaryColor, fontSize: '2.5rem', fontWeight: 700 }}>{value.toString().padStart(2, '0')}</span>
      </div>
      <span style={{ color: globalStyles.textColor, opacity: 0.7, fontSize: '0.875rem' }}>{label}</span>
    </div>
  );

  return (
    <section style={{ backgroundColor: styles?.backgroundColor || '#F3F4F6', padding: styles?.padding || '60px 24px' }}>
      <div className="max-w-2xl mx-auto text-center">
        {title && <h2 style={{ fontFamily: 'var(--heading-font)', color: globalStyles.textColor, fontSize: '1.5rem', fontWeight: 600, marginBottom: '2rem' }}>{title}</h2>}
        {expired ? (
          <p style={{ fontFamily: 'var(--heading-font)', color: globalStyles.primaryColor, fontSize: '1.5rem', fontWeight: 600 }}>{expiredMessage}</p>
        ) : (
          <div className="flex justify-center gap-4">
            <TimeBlock value={timeLeft.days} label="Dias" />
            <TimeBlock value={timeLeft.hours} label="Horas" />
            <TimeBlock value={timeLeft.minutes} label="Minutos" />
            <TimeBlock value={timeLeft.seconds} label="Segundos" />
          </div>
        )}
      </div>
    </section>
  );
}

'use client';

import { ILandingGlobalStyles } from '@/models/LandingPage';
import {
  Zap, Shield, TrendingUp, Users, BarChart, Clock, Lock, Globe,
  Layout, Star, Check, Settings, Heart, Target, Award, Lightbulb
} from 'lucide-react';

interface FeatureItem {
  icon?: string;
  title: string;
  description: string;
}

interface FeaturesContent {
  title?: string;
  subtitle?: string;
  columns?: 2 | 3 | 4;
  items: FeatureItem[];
}

interface FeaturesSectionProps {
  content: FeaturesContent;
  styles?: Record<string, any>;
  globalStyles: ILandingGlobalStyles;
}

const iconMap: Record<string, any> = {
  zap: Zap,
  shield: Shield,
  'trending-up': TrendingUp,
  users: Users,
  'bar-chart': BarChart,
  clock: Clock,
  lock: Lock,
  globe: Globe,
  layout: Layout,
  star: Star,
  check: Check,
  settings: Settings,
  heart: Heart,
  target: Target,
  award: Award,
  lightbulb: Lightbulb,
};

export default function FeaturesSection({ content, styles, globalStyles }: FeaturesSectionProps) {
  const { title, subtitle, columns = 3, items = [] } = content;

  const containerStyle: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor || '#F9FAFB',
    padding: styles?.padding || '80px 24px',
  };

  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <section style={containerStyle}>
      <div className="max-w-[var(--container-width)] mx-auto">
        {(title || subtitle) && (
          <div className="text-center mb-12">
            {title && (
              <h2
                style={{
                  fontFamily: 'var(--heading-font)',
                  color: globalStyles.textColor,
                  fontSize: '2.25rem',
                  fontWeight: 700,
                  marginBottom: '1rem',
                }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                style={{
                  fontFamily: 'var(--font-family)',
                  color: globalStyles.textColor,
                  opacity: 0.7,
                  fontSize: '1.125rem',
                  maxWidth: '600px',
                  margin: '0 auto',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}

        <div className={`grid ${gridCols[columns]} gap-8`}>
          {items.map((item, index) => {
            const IconComponent = item.icon ? iconMap[item.icon] || Star : Star;

            return (
              <div
                key={index}
                className="p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                style={{ borderRadius: 'var(--border-radius)' }}
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${globalStyles.primaryColor}15` }}
                >
                  <IconComponent
                    className="w-6 h-6"
                    style={{ color: globalStyles.primaryColor }}
                  />
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--heading-font)',
                    color: globalStyles.textColor,
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    marginBottom: '0.5rem',
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    fontFamily: 'var(--font-family)',
                    color: globalStyles.textColor,
                    opacity: 0.7,
                    fontSize: '0.95rem',
                    lineHeight: 1.6,
                  }}
                >
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

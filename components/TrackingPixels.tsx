'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

type PixelType = 'META_PIXEL' | 'GOOGLE_ADS' | 'LINKEDIN_INSIGHT' | 'TIKTOK_PIXEL' | 'TWITTER_PIXEL' | 'CUSTOM';

interface TrackingPixel {
  _id: string;
  type: PixelType;
  pixelId: string;
  conversionLabel?: string;
  customScript?: string;
  trackEvents: {
    pageView: boolean;
    formSubmit: boolean;
    buttonClick: boolean;
    purchase: boolean;
    lead: boolean;
    customEvents: string[];
  };
}

interface TrackingPixelsProps {
  context: 'app' | 'landingPages' | 'publicForms';
}

export default function TrackingPixels({ context }: TrackingPixelsProps) {
  const [pixels, setPixels] = useState<TrackingPixel[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchPixels = async () => {
      try {
        const res = await fetch(`/api/public/tracking-pixels?context=${context}`);
        if (res.ok) {
          const data = await res.json();
          setPixels(data);
        }
      } catch (error) {
        console.error('Error fetching tracking pixels:', error);
      } finally {
        setLoaded(true);
      }
    };

    fetchPixels();
  }, [context]);

  if (!loaded || pixels.length === 0) return null;

  return (
    <>
      {pixels.map((pixel) => (
        <PixelScript key={pixel._id} pixel={pixel} />
      ))}
    </>
  );
}

function PixelScript({ pixel }: { pixel: TrackingPixel }) {
  switch (pixel.type) {
    case 'META_PIXEL':
      return <MetaPixel pixelId={pixel.pixelId} trackEvents={pixel.trackEvents} />;
    case 'GOOGLE_ADS':
      return <GoogleAdsTag pixelId={pixel.pixelId} conversionLabel={pixel.conversionLabel} trackEvents={pixel.trackEvents} />;
    case 'LINKEDIN_INSIGHT':
      return <LinkedInInsightTag pixelId={pixel.pixelId} trackEvents={pixel.trackEvents} />;
    case 'TIKTOK_PIXEL':
      return <TikTokPixel pixelId={pixel.pixelId} trackEvents={pixel.trackEvents} />;
    case 'TWITTER_PIXEL':
      return <TwitterPixel pixelId={pixel.pixelId} trackEvents={pixel.trackEvents} />;
    case 'CUSTOM':
      return <CustomScript script={pixel.customScript || ''} />;
    default:
      return null;
  }
}

// Facebook/Meta Pixel
function MetaPixel({ pixelId, trackEvents }: { pixelId: string; trackEvents: TrackingPixel['trackEvents'] }) {
  return (
    <>
      <Script
        id={`fb-pixel-${pixelId}`}
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            ${trackEvents.pageView ? "fbq('track', 'PageView');" : ''}
          `,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

// Google Ads Tag (gtag.js)
function GoogleAdsTag({ pixelId, conversionLabel, trackEvents }: { pixelId: string; conversionLabel?: string; trackEvents: TrackingPixel['trackEvents'] }) {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${pixelId}`}
        strategy="afterInteractive"
      />
      <Script
        id={`gtag-${pixelId}`}
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${pixelId}');
            ${conversionLabel ? `
            // Conversion tracking function
            window.trackGoogleConversion = function(value, currency) {
              gtag('event', 'conversion', {
                'send_to': '${pixelId}/${conversionLabel}',
                'value': value || 1.0,
                'currency': currency || 'USD'
              });
            };
            ` : ''}
          `,
        }}
      />
    </>
  );
}

// LinkedIn Insight Tag
function LinkedInInsightTag({ pixelId, trackEvents }: { pixelId: string; trackEvents: TrackingPixel['trackEvents'] }) {
  return (
    <>
      <Script
        id={`linkedin-insight-${pixelId}`}
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            _linkedin_partner_id = "${pixelId}";
            window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
            window._linkedin_data_partner_ids.push(_linkedin_partner_id);
            (function(l) {
              if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
              window.lintrk.q=[]}
              var s = document.getElementsByTagName("script")[0];
              var b = document.createElement("script");
              b.type = "text/javascript";b.async = true;
              b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
              s.parentNode.insertBefore(b, s);})(window.lintrk);
          `,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          alt=""
          src={`https://px.ads.linkedin.com/collect/?pid=${pixelId}&fmt=gif`}
        />
      </noscript>
    </>
  );
}

// TikTok Pixel
function TikTokPixel({ pixelId, trackEvents }: { pixelId: string; trackEvents: TrackingPixel['trackEvents'] }) {
  return (
    <Script
      id={`tiktok-pixel-${pixelId}`}
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          !function (w, d, t) {
            w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
            ttq.load('${pixelId}');
            ${trackEvents.pageView ? "ttq.page();" : ''}
          }(window, document, 'ttq');
        `,
      }}
    />
  );
}

// Twitter/X Pixel
function TwitterPixel({ pixelId, trackEvents }: { pixelId: string; trackEvents: TrackingPixel['trackEvents'] }) {
  return (
    <Script
      id={`twitter-pixel-${pixelId}`}
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
          },s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
          a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
          twq('config','${pixelId}');
          ${trackEvents.pageView ? "twq('track','PageView');" : ''}
        `,
      }}
    />
  );
}

// Custom Script
function CustomScript({ script }: { script: string }) {
  // Only render if there's actual content
  if (!script.trim()) return null;

  // Remove script tags if present (we'll wrap it properly)
  const cleanScript = script
    .replace(/<script[^>]*>/gi, '')
    .replace(/<\/script>/gi, '');

  return (
    <Script
      id={`custom-pixel-${Math.random().toString(36).substr(2, 9)}`}
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: cleanScript }}
    />
  );
}

// Helper functions to track events (can be called from other components)
declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    gtag?: (...args: any[]) => void;
    lintrk?: (...args: any[]) => void;
    ttq?: any;
    twq?: (...args: any[]) => void;
    trackGoogleConversion?: (value?: number, currency?: string) => void;
  }
}

export function trackEvent(eventName: string, params?: Record<string, any>) {
  // Facebook/Meta
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, params);
  }

  // Google Ads
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }

  // LinkedIn
  if (typeof window !== 'undefined' && window.lintrk) {
    window.lintrk('track', { conversion_id: eventName });
  }

  // TikTok
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track(eventName, params);
  }

  // Twitter
  if (typeof window !== 'undefined' && window.twq) {
    window.twq('track', eventName, params);
  }
}

export function trackLead(params?: Record<string, any>) {
  trackEvent('Lead', params);
}

export function trackFormSubmit(params?: Record<string, any>) {
  trackEvent('SubmitForm', params);

  // Facebook uses CompleteRegistration for form submissions
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'CompleteRegistration', params);
  }
}

export function trackPurchase(value: number, currency: string = 'USD', params?: Record<string, any>) {
  // Facebook
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'Purchase', { value, currency, ...params });
  }

  // Google Ads
  if (typeof window !== 'undefined' && window.trackGoogleConversion) {
    window.trackGoogleConversion(value, currency);
  }

  // TikTok
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track('CompletePayment', { value, currency, ...params });
  }
}

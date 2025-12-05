'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import SectionRenderer from '@/components/landing-pages/sections/SectionRenderer';
import { ILandingSection, ILandingGlobalStyles } from '@/models/LandingPage';
import TrackingPixels, { trackFormSubmit, trackLead } from '@/components/TrackingPixels';

interface PageData {
  id: string;
  slug: string;
  title: string;
  description?: string;
  favicon?: string;
  scripts?: {
    headScripts?: string;
    bodyStartScripts?: string;
    bodyEndScripts?: string;
  };
  content: {
    sections: ILandingSection[];
    globalStyles: ILandingGlobalStyles;
  };
  form: any;
  variant?: string;
  utmParams: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
  };
}

interface PublicLandingPageProps {
  pageData: PageData;
}

// Generate or get visitor ID from cookie
function getVisitorId(): string {
  if (typeof window === 'undefined') return '';

  const cookieName = 'lp_visitor_id';
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === cookieName) return value;
  }

  const newId = crypto.randomUUID();
  document.cookie = `${cookieName}=${newId};max-age=${365 * 24 * 60 * 60};path=/`;
  return newId;
}

// Generate session ID
function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  const sessionKey = 'lp_session_id';
  let sessionId = sessionStorage.getItem(sessionKey);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(sessionKey, sessionId);
  }
  return sessionId;
}

export default function PublicLandingPage({ pageData }: PublicLandingPageProps) {
  const { content, scripts, form, variant, utmParams, slug, id } = pageData;
  const { sections, globalStyles } = content;

  const [viewId, setViewId] = useState<string | null>(null);
  const [converted, setConverted] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const maxScrollRef = useRef<number>(0);

  // Track page view on mount
  useEffect(() => {
    const trackView = async () => {
      try {
        const visitorId = getVisitorId();
        const sessionId = getSessionId();

        const response = await fetch(`/api/public/lp/${slug}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitorId,
            sessionId,
            variant,
            referrer: document.referrer,
            ...utmParams,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setViewId(data.viewId);
        }
      } catch (e) {
        console.error('Error tracking view:', e);
      }
    };

    trackView();
  }, [slug, variant, utmParams]);

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
      maxScrollRef.current = Math.max(maxScrollRef.current, scrollPercent);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update engagement metrics on unmount
  useEffect(() => {
    const updateMetrics = async () => {
      if (!viewId) return;

      try {
        const timeOnPage = Math.round((Date.now() - startTimeRef.current) / 1000);
        await fetch(`/api/public/lp/${slug}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            viewId,
            timeOnPage,
            scrollDepth: maxScrollRef.current,
          }),
        });
      } catch (e) {}
    };

    // Send metrics before page unload
    const handleBeforeUnload = () => updateMetrics();
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Also update periodically
    const interval = setInterval(updateMetrics, 30000);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(interval);
      updateMetrics();
    };
  }, [viewId, slug]);

  // Handle form submission
  const handleFormSubmit = async (submissionData: any) => {
    if (!viewId || converted) return;

    try {
      await fetch(`/api/public/lp/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viewId,
          converted: true,
          submissionId: submissionData?.submissionId,
        }),
      });
      setConverted(true);

      // Track conversion in retargeting pixels
      trackFormSubmit({ page: slug, variant });
      trackLead({ page: slug, variant });
    } catch (e) {}
  };

  const pageStyles = `
    :root {
      --primary-color: ${globalStyles.primaryColor};
      --secondary-color: ${globalStyles.secondaryColor};
      --background-color: ${globalStyles.backgroundColor};
      --text-color: ${globalStyles.textColor};
      --font-family: ${globalStyles.fontFamily};
      --heading-font: ${globalStyles.headingFontFamily || globalStyles.fontFamily};
      --container-width: ${globalStyles.containerWidth}px;
      --border-radius: ${globalStyles.borderRadius}px;
    }
    body {
      font-family: var(--font-family);
      color: var(--text-color);
      background-color: var(--background-color);
      margin: 0;
      padding: 0;
    }
    * { box-sizing: border-box; }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: pageStyles }} />

      {/* Head Scripts */}
      {scripts?.headScripts && (
        <Script id="head-scripts" strategy="afterInteractive">
          {scripts.headScripts}
        </Script>
      )}

      {/* Body Start Scripts */}
      {scripts?.bodyStartScripts && (
        <div dangerouslySetInnerHTML={{ __html: scripts.bodyStartScripts }} />
      )}

      {/* Page Content */}
      <main>
        {sections.map((section) => (
          <SectionRenderer
            key={section.id}
            section={section}
            globalStyles={globalStyles}
            form={section.type === 'form' && form ? form : undefined}
            onFormSubmit={section.type === 'form' ? handleFormSubmit : undefined}
          />
        ))}
      </main>

      {/* Body End Scripts */}
      {scripts?.bodyEndScripts && (
        <Script id="body-end-scripts" strategy="afterInteractive">
          {scripts.bodyEndScripts}
        </Script>
      )}

      {/* Retargeting Pixels */}
      <TrackingPixels context="landingPages" />
    </>
  );
}

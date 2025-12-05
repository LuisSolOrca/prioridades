import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LandingPage from '@/models/LandingPage';
import LandingPageView from '@/models/LandingPageView';
import Touchpoint from '@/models/Touchpoint';
import { headers } from 'next/headers';
import crypto from 'crypto';
import mongoose from 'mongoose';

// Helper to detect device type from user agent
function getDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' {
  const ua = userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

// Helper to detect browser
function getBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('edg')) return 'Edge';
  if (ua.includes('chrome')) return 'Chrome';
  if (ua.includes('safari')) return 'Safari';
  if (ua.includes('opera') || ua.includes('opr')) return 'Opera';
  return 'Other';
}

// Helper to detect OS
function getOS(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('mac')) return 'macOS';
  if (ua.includes('linux')) return 'Linux';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
  return 'Other';
}

// GET - Get public landing page data
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await connectDB();

    const page = await LandingPage.findOne({
      slug: params.slug,
      status: 'published',
      isActive: true,
    })
      .populate('formId')
      .lean();

    if (!page) {
      return NextResponse.json(
        { error: 'Pagina no encontrada' },
        { status: 404 }
      );
    }

    // Determine which variant to show for A/B testing
    let sections = page.content?.sections || [];
    let variant: string | undefined;

    if (page.abTest?.enabled && page.abTest.variants?.length > 0) {
      // Weighted random selection
      const totalWeight = page.abTest.variants.reduce((sum, v) => sum + v.weight, 0);
      let random = Math.random() * totalWeight;

      for (const v of page.abTest.variants) {
        random -= v.weight;
        if (random <= 0) {
          variant = v.id;
          if (v.sections && v.sections.length > 0) {
            sections = v.sections;
          }
          break;
        }
      }
    }

    return NextResponse.json({
      id: page._id,
      slug: page.slug,
      title: page.title,
      description: page.description,
      keywords: page.keywords,
      favicon: page.favicon,
      ogImage: page.ogImage,
      ogTitle: page.ogTitle || page.title,
      ogDescription: page.ogDescription || page.description,
      scripts: page.scripts,
      content: {
        sections,
        globalStyles: page.content?.globalStyles,
      },
      form: page.formId,
      variant,
    });
  } catch (error: any) {
    console.error('Error fetching public page:', error);
    return NextResponse.json(
      { error: 'Error al cargar la pagina' },
      { status: 500 }
    );
  }
}

// POST - Track page view
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await connectDB();

    const page = await LandingPage.findOne({
      slug: params.slug,
      status: 'published',
      isActive: true,
    });

    if (!page) {
      return NextResponse.json(
        { error: 'Pagina no encontrada' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      visitorId,
      sessionId,
      variant,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      timeOnPage,
      scrollDepth,
      converted,
      submissionId,
    } = body;

    const headersList = headers();
    const userAgent = headersList.get('user-agent') || '';
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ||
               headersList.get('x-real-ip') || '';

    // Generate visitor ID if not provided
    const finalVisitorId = visitorId || crypto.randomUUID();
    const finalSessionId = sessionId || crypto.randomUUID();

    // Check if this is a unique visitor
    const existingVisitor = await LandingPageView.findOne({
      pageId: page._id,
      visitorId: finalVisitorId,
    });

    // Update existing view or create new one
    if (existingVisitor && timeOnPage !== undefined) {
      // Update existing view with new engagement data
      await LandingPageView.findByIdAndUpdate(existingVisitor._id, {
        $set: {
          timeOnPage: Math.max(existingVisitor.timeOnPage, timeOnPage || 0),
          scrollDepth: Math.max(existingVisitor.scrollDepth, scrollDepth || 0),
          converted: existingVisitor.converted || converted,
          submissionId: existingVisitor.submissionId || submissionId,
        },
      });

      return NextResponse.json({
        success: true,
        visitorId: finalVisitorId,
        sessionId: finalSessionId,
        updated: true,
      });
    }

    // Create new view record
    const view = new LandingPageView({
      pageId: page._id,
      visitorId: finalVisitorId,
      sessionId: finalSessionId,
      variant,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      device: getDeviceType(userAgent),
      browser: getBrowser(userAgent),
      os: getOS(userAgent),
      ip,
      userAgent,
      timeOnPage: timeOnPage || 0,
      scrollDepth: scrollDepth || 0,
      converted: converted || false,
      submissionId,
    });

    await view.save();

    // Update page analytics
    await LandingPage.incrementViews(page._id as mongoose.Types.ObjectId, !existingVisitor);

    // Create touchpoint for attribution (only for new visitors)
    if (!existingVisitor) {
      try {
        // Detect channel from UTM params or referrer
        const channel = (Touchpoint as any).detectChannel(utmSource, utmMedium, referrer);

        const touchpoint = new Touchpoint({
          visitorId: finalVisitorId,
          sessionId: finalSessionId,
          type: 'landing_page_view',
          channel,
          source: utmSource,
          medium: utmMedium,
          campaign: utmCampaign,
          content: utmContent,
          term: utmTerm,
          referenceType: 'landingPage',
          referenceId: page._id,
          url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/lp/${params.slug}`,
          referrer,
          metadata: {
            pageSlug: params.slug,
            pageTitle: page.title,
            variant,
          },
          device: getDeviceType(userAgent),
          browser: getBrowser(userAgent),
          os: getOS(userAgent),
          occurredAt: new Date(),
          isIdentified: false,
        });
        await touchpoint.save();
      } catch (tpError) {
        console.error('Error creating landing_page_view touchpoint:', tpError);
      }
    }

    // Update variant views if A/B testing
    if (variant && page.abTest?.enabled) {
      await LandingPage.findOneAndUpdate(
        { _id: page._id, 'abTest.variants.id': variant },
        { $inc: { 'abTest.variants.$.views': 1 } }
      );
    }

    return NextResponse.json({
      success: true,
      visitorId: finalVisitorId,
      sessionId: finalSessionId,
      viewId: view._id,
    });
  } catch (error: any) {
    console.error('Error tracking view:', error);
    return NextResponse.json(
      { error: 'Error al registrar vista' },
      { status: 500 }
    );
  }
}

// PATCH - Update view (for engagement tracking)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await connectDB();

    const body = await request.json();
    const { viewId, timeOnPage, scrollDepth, converted, submissionId, exitUrl } = body;

    if (!viewId) {
      return NextResponse.json(
        { error: 'viewId es requerido' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (timeOnPage !== undefined) updateData.timeOnPage = timeOnPage;
    if (scrollDepth !== undefined) updateData.scrollDepth = scrollDepth;
    if (converted !== undefined) updateData.converted = converted;
    if (submissionId !== undefined) updateData.submissionId = submissionId;
    if (exitUrl !== undefined) updateData.exitUrl = exitUrl;

    const view = await LandingPageView.findByIdAndUpdate(
      viewId,
      { $set: updateData },
      { new: true }
    );

    if (!view) {
      return NextResponse.json(
        { error: 'Vista no encontrada' },
        { status: 404 }
      );
    }

    // If converted, update page and variant analytics
    if (converted) {
      await LandingPage.incrementConversions(view.pageId);

      if (view.variant) {
        await LandingPage.findOneAndUpdate(
          { _id: view.pageId, 'abTest.variants.id': view.variant },
          { $inc: { 'abTest.variants.$.conversions': 1 } }
        );
      }

      // Create conversion touchpoint for attribution
      try {
        const page = await LandingPage.findById(view.pageId).select('title slug').lean();

        // Detect channel from view's UTM params
        const channel = (Touchpoint as any).detectChannel(
          view.utmSource,
          view.utmMedium,
          view.referrer
        );

        const touchpoint = new Touchpoint({
          visitorId: view.visitorId,
          sessionId: view.sessionId,
          type: 'landing_page_conversion',
          channel,
          source: view.utmSource,
          medium: view.utmMedium,
          campaign: view.utmCampaign,
          content: view.utmContent,
          term: view.utmTerm,
          referenceType: 'landingPage',
          referenceId: view.pageId,
          url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/lp/${(page as any)?.slug || params.slug}`,
          referrer: view.referrer,
          metadata: {
            pageSlug: (page as any)?.slug || params.slug,
            pageTitle: (page as any)?.title,
            variant: view.variant,
            submissionId,
          },
          device: view.device,
          browser: view.browser,
          os: view.os,
          occurredAt: new Date(),
          isIdentified: false, // Will be identified when form submission links to contact
        });
        await touchpoint.save();
      } catch (tpError) {
        console.error('Error creating landing_page_conversion touchpoint:', tpError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating view:', error);
    return NextResponse.json(
      { error: 'Error al actualizar vista' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import MarketingPlatformConfig from '@/models/MarketingPlatformConfig';
import { encryptToken } from '@/lib/marketing/tokenEncryption';

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const WHATSAPP_REDIRECT_URI = process.env.WHATSAPP_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/marketing/whatsapp/callback`;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      const errorReason = searchParams.get('error_reason') || error;
      console.error('WhatsApp OAuth error:', error, errorReason);
      return NextResponse.redirect(
        new URL(`/admin/marketing-integrations?error=${encodeURIComponent(errorReason)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/admin/marketing-integrations?error=No code received', request.url)
      );
    }

    // Exchange code for access token
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', META_APP_ID!);
    tokenUrl.searchParams.set('client_secret', META_APP_SECRET!);
    tokenUrl.searchParams.set('redirect_uri', WHATSAPP_REDIRECT_URI);
    tokenUrl.searchParams.set('code', code);

    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('WhatsApp token exchange error:', tokenData.error);
      return NextResponse.redirect(
        new URL(`/admin/marketing-integrations?error=${encodeURIComponent(tokenData.error.message)}`, request.url)
      );
    }

    const { access_token: shortLivedToken } = tokenData;

    // Exchange for long-lived token
    const longLivedUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longLivedUrl.searchParams.set('client_id', META_APP_ID!);
    longLivedUrl.searchParams.set('client_secret', META_APP_SECRET!);
    longLivedUrl.searchParams.set('fb_exchange_token', shortLivedToken);

    const longLivedResponse = await fetch(longLivedUrl.toString());
    const longLivedData = await longLivedResponse.json();

    const { access_token: longLivedToken, expires_in } = longLivedData.error
      ? { access_token: shortLivedToken, expires_in: 3600 }
      : longLivedData;

    // Get WhatsApp Business Accounts
    let wabaData: any[] = [];
    let phoneNumbers: any[] = [];

    try {
      // Get user's businesses
      const businessResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/businesses?access_token=${longLivedToken}`
      );
      const businessData = await businessResponse.json();

      // For each business, get WhatsApp Business Accounts
      for (const business of businessData.data || []) {
        const wabaResponse = await fetch(
          `https://graph.facebook.com/v18.0/${business.id}/owned_whatsapp_business_accounts?access_token=${longLivedToken}`
        );
        const wabaResult = await wabaResponse.json();

        for (const waba of wabaResult.data || []) {
          wabaData.push({
            id: waba.id,
            name: waba.name,
            businessId: business.id,
            businessName: business.name,
          });

          // Get phone numbers for this WABA
          const phonesResponse = await fetch(
            `https://graph.facebook.com/v18.0/${waba.id}/phone_numbers?access_token=${longLivedToken}`
          );
          const phonesResult = await phonesResponse.json();

          for (const phone of phonesResult.data || []) {
            phoneNumbers.push({
              id: phone.id,
              displayPhoneNumber: phone.display_phone_number,
              verifiedName: phone.verified_name,
              qualityRating: phone.quality_rating,
              wabaId: waba.id,
            });
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch WhatsApp Business Accounts:', e);
    }

    await connectDB();

    // Calculate token expiration
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + (expires_in || 5184000));

    // Upsert the platform config
    await MarketingPlatformConfig.findOneAndUpdate(
      { platform: 'WHATSAPP' },
      {
        platform: 'WHATSAPP',
        accessToken: encryptToken(longLivedToken),
        tokenExpiresAt,
        platformAccountName: wabaData[0]?.name || 'WhatsApp Business',
        platformAccountId: wabaData[0]?.id,
        platformData: {
          wabaAccounts: wabaData,
          phoneNumbers,
          selectedWabaId: wabaData[0]?.id,
          selectedPhoneNumberId: phoneNumbers[0]?.id,
        },
        scope: 'whatsapp_business_management,whatsapp_business_messaging',
        isActive: true,
        configuredBy: session.user.id,
        consecutiveErrors: 0,
        lastError: null,
        lastErrorAt: null,
      },
      { upsert: true, new: true }
    );

    return NextResponse.redirect(
      new URL('/admin/marketing-integrations?success=whatsapp', request.url)
    );
  } catch (error) {
    console.error('Error in WhatsApp OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/admin/marketing-integrations?error=Internal server error', request.url)
    );
  }
}

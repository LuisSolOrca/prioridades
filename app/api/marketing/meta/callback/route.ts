import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import MarketingPlatformConfig from '@/models/MarketingPlatformConfig';
import { encryptToken } from '@/lib/marketing/tokenEncryption';

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const META_REDIRECT_URI = process.env.META_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/marketing/meta/callback`;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      const errorReason = searchParams.get('error_reason') || 'Unknown error';
      console.error('Meta OAuth error:', error, errorReason);
      return NextResponse.redirect(
        new URL(`/admin/marketing-integrations?error=${encodeURIComponent(errorReason)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/admin/marketing-integrations?error=No code received', request.url)
      );
    }

    // Validate state (CSRF protection)
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        if (stateData.userId !== session.user.id) {
          return NextResponse.redirect(
            new URL('/admin/marketing-integrations?error=Invalid state', request.url)
          );
        }
      } catch {
        console.warn('Could not validate state parameter');
      }
    }

    // Exchange code for access token
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', META_APP_ID!);
    tokenUrl.searchParams.set('client_secret', META_APP_SECRET!);
    tokenUrl.searchParams.set('redirect_uri', META_REDIRECT_URI);
    tokenUrl.searchParams.set('code', code);

    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Meta token exchange error:', tokenData.error);
      return NextResponse.redirect(
        new URL(`/admin/marketing-integrations?error=${encodeURIComponent(tokenData.error.message)}`, request.url)
      );
    }

    const { access_token: shortLivedToken } = tokenData;

    // Exchange short-lived token for long-lived token (60 days)
    const longLivedUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longLivedUrl.searchParams.set('client_id', META_APP_ID!);
    longLivedUrl.searchParams.set('client_secret', META_APP_SECRET!);
    longLivedUrl.searchParams.set('fb_exchange_token', shortLivedToken);

    const longLivedResponse = await fetch(longLivedUrl.toString());
    const longLivedData = await longLivedResponse.json();

    if (longLivedData.error) {
      console.error('Meta long-lived token exchange error:', longLivedData.error);
      return NextResponse.redirect(
        new URL(`/admin/marketing-integrations?error=${encodeURIComponent(longLivedData.error.message)}`, request.url)
      );
    }

    const { access_token: longLivedToken, expires_in } = longLivedData;

    // Get user info and ad accounts
    const meResponse = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${longLivedToken}`
    );
    const meData = await meResponse.json();

    // Get ad accounts
    const adAccountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_status&access_token=${longLivedToken}`
    );
    const adAccountsData = await adAccountsResponse.json();

    // Get pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token&access_token=${longLivedToken}`
    );
    const pagesData = await pagesResponse.json();

    await connectDB();

    // Calculate token expiration
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + (expires_in || 5184000)); // Default 60 days

    // Upsert the platform config
    const config = await MarketingPlatformConfig.findOneAndUpdate(
      { platform: 'META' },
      {
        platform: 'META',
        accessToken: encryptToken(longLivedToken),
        tokenExpiresAt,
        platformUserId: meData.id,
        platformAccountName: meData.name,
        platformData: {
          adAccounts: adAccountsData.data || [],
          pages: pagesData.data?.map((p: any) => ({ id: p.id, name: p.name })) || [],
        },
        scope: 'ads_read,ads_management,business_management,pages_read_engagement',
        isActive: true,
        configuredBy: session.user.id,
        consecutiveErrors: 0,
        lastError: null,
        lastErrorAt: null,
      },
      { upsert: true, new: true }
    );

    return NextResponse.redirect(
      new URL('/admin/marketing-integrations?success=meta', request.url)
    );
  } catch (error) {
    console.error('Error in Meta OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/admin/marketing-integrations?error=Internal server error', request.url)
    );
  }
}

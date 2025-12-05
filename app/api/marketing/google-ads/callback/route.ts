import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import MarketingPlatformConfig from '@/models/MarketingPlatformConfig';
import { encryptToken } from '@/lib/marketing/tokenEncryption';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_ADS_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/marketing/google-ads/callback`;
const GOOGLE_DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

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
      const errorDescription = searchParams.get('error_description') || 'Unknown error';
      console.error('Google OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/admin/marketing-integrations?error=${encodeURIComponent(errorDescription)}`, request.url)
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

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Google token exchange error:', tokenData);
      return NextResponse.redirect(
        new URL(`/admin/marketing-integrations?error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`, request.url)
      );
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    // Get user info
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const userInfo = await userInfoResponse.json();

    // Get Google Ads customer accounts (requires developer token)
    let customerAccounts: any[] = [];
    if (GOOGLE_DEVELOPER_TOKEN) {
      try {
        const customersResponse = await fetch(
          'https://googleads.googleapis.com/v15/customers:listAccessibleCustomers',
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
              'developer-token': GOOGLE_DEVELOPER_TOKEN,
            },
          }
        );
        const customersData = await customersResponse.json();
        customerAccounts = customersData.resourceNames?.map((name: string) => ({
          id: name.replace('customers/', ''),
          name: name,
        })) || [];
      } catch (e) {
        console.warn('Could not fetch Google Ads customers:', e);
      }
    }

    await connectDB();

    // Calculate token expiration
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + (expires_in || 3600));

    // Upsert the platform config
    await MarketingPlatformConfig.findOneAndUpdate(
      { platform: 'GOOGLE_ADS' },
      {
        platform: 'GOOGLE_ADS',
        accessToken: encryptToken(access_token),
        refreshToken: refresh_token ? encryptToken(refresh_token) : undefined,
        tokenExpiresAt,
        platformUserId: userInfo.id,
        platformAccountName: userInfo.email,
        platformData: {
          customerAccounts,
          developerToken: GOOGLE_DEVELOPER_TOKEN ? 'configured' : 'not_configured',
        },
        scope: 'https://www.googleapis.com/auth/adwords',
        isActive: true,
        configuredBy: session.user.id,
        consecutiveErrors: 0,
        lastError: null,
        lastErrorAt: null,
      },
      { upsert: true, new: true }
    );

    return NextResponse.redirect(
      new URL('/admin/marketing-integrations?success=google-ads', request.url)
    );
  } catch (error) {
    console.error('Error in Google Ads OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/admin/marketing-integrations?error=Internal server error', request.url)
    );
  }
}

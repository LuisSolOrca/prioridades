import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import MarketingPlatformConfig from '@/models/MarketingPlatformConfig';
import { encryptToken } from '@/lib/marketing/tokenEncryption';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GA4_REDIRECT_URI = process.env.GA4_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/marketing/ga4/callback`;

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
      console.error('GA4 OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/admin/marketing-integrations?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/admin/marketing-integrations?error=No code received', request.url)
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: GA4_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('GA4 token exchange error:', tokenData);
      return NextResponse.redirect(
        new URL(`/admin/marketing-integrations?error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`, request.url)
      );
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    // Get GA4 properties
    let properties: any[] = [];
    try {
      const accountsResponse = await fetch(
        'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
        {
          headers: {
            'Authorization': `Bearer ${access_token}`,
          },
        }
      );
      const accountsData = await accountsResponse.json();

      // Extract properties from all accounts
      for (const account of accountsData.accountSummaries || []) {
        for (const property of account.propertySummaries || []) {
          properties.push({
            accountId: account.account,
            accountName: account.displayName,
            propertyId: property.property,
            propertyName: property.displayName,
          });
        }
      }
    } catch (e) {
      console.warn('Could not fetch GA4 properties:', e);
    }

    await connectDB();

    // Calculate token expiration
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + (expires_in || 3600));

    // Upsert the platform config
    await MarketingPlatformConfig.findOneAndUpdate(
      { platform: 'GA4' },
      {
        platform: 'GA4',
        accessToken: encryptToken(access_token),
        refreshToken: refresh_token ? encryptToken(refresh_token) : undefined,
        tokenExpiresAt,
        platformAccountName: properties[0]?.accountName || 'Google Analytics',
        platformData: {
          properties,
          selectedPropertyId: properties[0]?.propertyId,
        },
        scope: 'analytics.readonly',
        isActive: true,
        configuredBy: session.user.id,
        consecutiveErrors: 0,
        lastError: null,
        lastErrorAt: null,
      },
      { upsert: true, new: true }
    );

    return NextResponse.redirect(
      new URL('/admin/marketing-integrations?success=ga4', request.url)
    );
  } catch (error) {
    console.error('Error in GA4 OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/admin/marketing-integrations?error=Internal server error', request.url)
    );
  }
}

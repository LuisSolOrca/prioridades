import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import MarketingPlatformConfig from '@/models/MarketingPlatformConfig';
import { encryptToken } from '@/lib/marketing/tokenEncryption';

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/marketing/linkedin/callback`;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      console.error('LinkedIn OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/admin/marketing-integrations?error=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/admin/marketing-integrations?error=No code received', request.url)
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: LINKEDIN_REDIRECT_URI,
        client_id: LINKEDIN_CLIENT_ID!,
        client_secret: LINKEDIN_CLIENT_SECRET!,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('LinkedIn token exchange error:', tokenData);
      return NextResponse.redirect(
        new URL(`/admin/marketing-integrations?error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`, request.url)
      );
    }

    const { access_token, expires_in, refresh_token, refresh_token_expires_in } = tokenData;

    // Get user profile
    const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });
    const profileData = await profileResponse.json();

    // Get ad accounts
    let adAccounts: any[] = [];
    try {
      const adAccountsResponse = await fetch(
        'https://api.linkedin.com/v2/adAccountsV2?q=search&search=(status:(values:List(ACTIVE)))',
        {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      );
      const adAccountsData = await adAccountsResponse.json();
      adAccounts = adAccountsData.elements || [];
    } catch (e) {
      console.warn('Could not fetch LinkedIn ad accounts:', e);
    }

    await connectDB();

    // Calculate token expiration
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + (expires_in || 5184000));

    // Upsert the platform config
    await MarketingPlatformConfig.findOneAndUpdate(
      { platform: 'LINKEDIN' },
      {
        platform: 'LINKEDIN',
        accessToken: encryptToken(access_token),
        refreshToken: refresh_token ? encryptToken(refresh_token) : undefined,
        tokenExpiresAt,
        platformUserId: profileData.id,
        platformAccountName: `${profileData.localizedFirstName || ''} ${profileData.localizedLastName || ''}`.trim(),
        platformData: {
          adAccounts,
          refreshTokenExpiresIn: refresh_token_expires_in,
        },
        scope: 'r_ads,r_ads_reporting,w_organization_social,r_organization_social',
        isActive: true,
        configuredBy: session.user.id,
        consecutiveErrors: 0,
        lastError: null,
        lastErrorAt: null,
      },
      { upsert: true, new: true }
    );

    return NextResponse.redirect(
      new URL('/admin/marketing-integrations?success=linkedin', request.url)
    );
  } catch (error) {
    console.error('Error in LinkedIn OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/admin/marketing-integrations?error=Internal server error', request.url)
    );
  }
}

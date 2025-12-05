import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import MarketingPlatformConfig from '@/models/MarketingPlatformConfig';
import { encryptToken } from '@/lib/marketing/tokenEncryption';

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
const TWITTER_REDIRECT_URI = process.env.TWITTER_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/marketing/twitter/callback`;

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
      console.error('Twitter OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/admin/marketing-integrations?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/admin/marketing-integrations?error=Missing code or state', request.url)
      );
    }

    // Parse state to get codeVerifier
    let codeVerifier: string;
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      codeVerifier = stateData.codeVerifier;
    } catch {
      return NextResponse.redirect(
        new URL('/admin/marketing-integrations?error=Invalid state', request.url)
      );
    }

    // Exchange code for tokens
    const basicAuth = Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64');

    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: TWITTER_REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Twitter token exchange error:', tokenData);
      return NextResponse.redirect(
        new URL(`/admin/marketing-integrations?error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`, request.url)
      );
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    // Get user info
    const userResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,public_metrics', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });
    const userData = await userResponse.json();

    await connectDB();

    // Calculate token expiration
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + (expires_in || 7200));

    // Upsert the platform config
    await MarketingPlatformConfig.findOneAndUpdate(
      { platform: 'TWITTER' },
      {
        platform: 'TWITTER',
        accessToken: encryptToken(access_token),
        refreshToken: refresh_token ? encryptToken(refresh_token) : undefined,
        tokenExpiresAt,
        platformUserId: userData.data?.id,
        platformAccountName: userData.data?.name,
        platformData: {
          username: userData.data?.username,
          profileImageUrl: userData.data?.profile_image_url,
          followersCount: userData.data?.public_metrics?.followers_count,
          followingCount: userData.data?.public_metrics?.following_count,
          tweetCount: userData.data?.public_metrics?.tweet_count,
        },
        scope: 'tweet.read,users.read,offline.access',
        isActive: true,
        configuredBy: session.user.id,
        consecutiveErrors: 0,
        lastError: null,
        lastErrorAt: null,
      },
      { upsert: true, new: true }
    );

    return NextResponse.redirect(
      new URL('/admin/marketing-integrations?success=twitter', request.url)
    );
  } catch (error) {
    console.error('Error in Twitter OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/admin/marketing-integrations?error=Internal server error', request.url)
    );
  }
}

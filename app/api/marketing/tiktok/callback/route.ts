import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import MarketingPlatformConfig from '@/models/MarketingPlatformConfig';
import { encryptToken } from '@/lib/marketing/tokenEncryption';

const TIKTOK_APP_ID = process.env.TIKTOK_APP_ID;
const TIKTOK_APP_SECRET = process.env.TIKTOK_APP_SECRET;

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
      console.error('TikTok OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/admin/marketing-integrations?error=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/admin/marketing-integrations?error=No code received', request.url)
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_key: TIKTOK_APP_ID!,
        client_secret: TIKTOK_APP_SECRET!,
        code,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('TikTok token exchange error:', tokenData);
      return NextResponse.redirect(
        new URL(`/admin/marketing-integrations?error=${encodeURIComponent(tokenData.error.message || tokenData.error)}`, request.url)
      );
    }

    const { access_token, refresh_token, expires_in, open_id } = tokenData;

    // Get user info
    let userInfo: any = {};
    try {
      const userResponse = await fetch(
        'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,follower_count,following_count,likes_count,video_count',
        {
          headers: {
            'Authorization': `Bearer ${access_token}`,
          },
        }
      );
      const userData = await userResponse.json();
      userInfo = userData.data?.user || {};
    } catch (e) {
      console.warn('Could not fetch TikTok user info:', e);
    }

    await connectDB();

    // Calculate token expiration
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + (expires_in || 86400));

    // Upsert the platform config
    await MarketingPlatformConfig.findOneAndUpdate(
      { platform: 'TIKTOK' },
      {
        platform: 'TIKTOK',
        accessToken: encryptToken(access_token),
        refreshToken: refresh_token ? encryptToken(refresh_token) : undefined,
        tokenExpiresAt,
        platformUserId: open_id,
        platformAccountName: userInfo.display_name || 'TikTok User',
        platformData: {
          openId: open_id,
          avatarUrl: userInfo.avatar_url,
          followerCount: userInfo.follower_count,
          followingCount: userInfo.following_count,
          likesCount: userInfo.likes_count,
          videoCount: userInfo.video_count,
        },
        scope: 'user.info.basic,video.list,video.insights',
        isActive: true,
        configuredBy: session.user.id,
        consecutiveErrors: 0,
        lastError: null,
        lastErrorAt: null,
      },
      { upsert: true, new: true }
    );

    return NextResponse.redirect(
      new URL('/admin/marketing-integrations?success=tiktok', request.url)
    );
  } catch (error) {
    console.error('Error in TikTok OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/admin/marketing-integrations?error=Internal server error', request.url)
    );
  }
}

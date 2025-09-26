import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Twitter API credentials not configured' }, 
        { status: 500 }
      );
    }

    const isDevelopment = process.env.NODE_ENV === 'development';
    const baseUrl = isDevelopment 
      ? 'http://localhost:3000' 
      : 'https://mansdas.vercel.app';
    
    // Twitter OAuth 2.0 Authorization URL
    const redirectUri = `${baseUrl}/api/auth/callback/twitter`;
    const state = Math.random().toString(36).substring(2, 15); // CSRF koruması için
    const scope = 'tweet.read%20users.read%20tweet.write'; // İzinler
    
    const oauthUrl = `https://twitter.com/i/oauth2/authorize?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${scope}&` +
      `state=${state}&` +
      `code_challenge=challenge&` +
      `code_challenge_method=plain`;
    
    return NextResponse.json({
      success: true,
      oauth_url: oauthUrl,
      message: "Twitter OAuth 2.0 URL generated",
      callback_url: redirectUri,
      state: state
    });

  } catch (error) {
    console.error('Twitter OAuth initialization error:', error);
    return NextResponse.json(
      { error: 'OAuth initialization failed' }, 
      { status: 500 }
    );
  }
}
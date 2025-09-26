import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // OAuth 2.0 callback parametrelerini al
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Kullanıcı erişimi reddetti
    if (error === 'access_denied') {
      return NextResponse.redirect(
        new URL('/hesaplar?error=access_denied', req.url)
      );
    }

    // Gerekli parametreler eksik
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/hesaplar?error=invalid_callback', req.url)
      );
    }

    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL('/hesaplar?error=config_missing', req.url)
      );
    }

    // TODO: Burada Twitter API'si ile access token alışverişi yapılacak
    // Authorization code'u access token'a çevir
    const isDevelopment = process.env.NODE_ENV === 'development';
    const baseUrl = isDevelopment 
      ? 'http://localhost:3000' 
      : 'https://mansdas.vercel.app';
    
    const redirectUri = `${baseUrl}/api/auth/callback/twitter`;
    
    // Token exchange için Twitter API'sine istek at
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': redirectUri,
        'code_verifier': 'challenge'
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Twitter token exchange failed:', errorText);
      return NextResponse.redirect(
        new URL('/hesaplar?error=token_exchange_failed', req.url)
      );
    }

    const tokens = await tokenResponse.json();
    
    // TODO: Burada kullanıcı bilgilerini al ve veritabanına kaydet
    console.log('Twitter tokens received:', { access_token: '***' });

    // Başarılı bağlantı için hesaplar sayfasına yönlendir
    return NextResponse.redirect(
      new URL('/hesaplar?success=twitter_connected', req.url)
    );

  } catch (error) {
    console.error('Twitter OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/hesaplar?error=callback_failed', req.url)
    );
  }
}
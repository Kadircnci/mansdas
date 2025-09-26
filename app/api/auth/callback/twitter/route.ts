import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/mongodb';
import { Account } from '../../../../../models';
import jwt from 'jsonwebtoken';

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
    
    // Twitter kullanıcı bilgilerini al
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    });

    if (!userResponse.ok) {
      console.error('Twitter user info fetch failed');
      return NextResponse.redirect(
        new URL('/hesaplar?error=user_info_failed', req.url)
      );
    }

    const userData = await userResponse.json();
    
    // JWT token'dan kullanıcı ID'sini al (eğer authentication header varsa)
    const authHeader = req.headers.get('authorization');
    let userId = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.SECRET_KEY!) as { userId: string };
        userId = decoded.userId;
      } catch (error) {
        console.warn('JWT decode failed, checking cookies...');
      }
    }
    
    // Cookie'den de kontrol et
    if (!userId) {
      const cookies = req.headers.get('cookie') || '';
      const accessTokenMatch = cookies.match(/access_token=([^;]+)/);
      if (accessTokenMatch) {
        try {
          const decoded = jwt.verify(accessTokenMatch[1], process.env.SECRET_KEY!) as { userId: string };
          userId = decoded.userId;
        } catch (error) {
          console.warn('Cookie JWT decode failed');
        }
      }
    }

    if (!userId) {
      return NextResponse.redirect(
        new URL('/hesaplar?error=authentication_required', req.url)
      );
    }

    // Veritabanına Twitter hesabını kaydet
    await dbConnect();
    
    const twitterAccount = await Account.findOneAndUpdate(
      {
        owner_id: userId,
        platform: 'twitter',
        external_id: userData.data.id
      },
      {
        owner_id: userId,
        platform: 'twitter',
        external_id: userData.data.id,
        name: userData.data.name,
        username: userData.data.username,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined,
        is_active: true,
        last_sync: new Date()
      },
      { 
        upsert: true, 
        new: true 
      }
    );

    console.log('Twitter account saved:', {
      id: twitterAccount._id,
      username: userData.data.username,
      name: userData.data.name
    });

    // Başarılı bağlantı için hesaplar sayfasına yönlendir
    return NextResponse.redirect(
      new URL('/hesaplar?success=twitter_connected&username=' + userData.data.username, req.url)
    );

  } catch (error) {
    console.error('Twitter OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/hesaplar?error=callback_failed', req.url)
    );
  }
}
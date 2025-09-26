import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // OAuth callback parametrelerini al
    const { searchParams } = new URL(req.url);
    const oauth_token = searchParams.get('oauth_token');
    const oauth_verifier = searchParams.get('oauth_verifier');
    const denied = searchParams.get('denied');

    // Kullanıcı erişimi reddetti
    if (denied) {
      return NextResponse.redirect(
        new URL('/hesaplar?error=access_denied', req.url)
      );
    }

    // Gerekli parametreler eksik
    if (!oauth_token || !oauth_verifier) {
      return NextResponse.redirect(
        new URL('/hesaplar?error=invalid_callback', req.url)
      );
    }

    // TODO: Burada Twitter API'si ile access token alışverişi yapılacak
    // Şimdilik demo response dönüyoruz

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
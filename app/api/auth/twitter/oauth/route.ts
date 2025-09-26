import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // TODO: Burada Twitter OAuth URL'i oluşturulacak
    // Şimdilik demo response dönüyoruz
    
    const isDevelopment = process.env.NODE_ENV === 'development';
    const baseUrl = isDevelopment 
      ? 'http://localhost:3000' 
      : 'https://mansdas.vercel.app';
    
    const demoOAuthUrl = `https://api.twitter.com/oauth/authenticate?oauth_token=demo_token&oauth_callback=${baseUrl}/api/auth/callback/twitter`;
    
    return NextResponse.json({
      success: true,
      oauth_url: demoOAuthUrl,
      message: "Demo mode - Twitter OAuth URL generated",
      callback_url: `${baseUrl}/api/auth/callback/twitter`
    });

  } catch (error) {
    console.error('Twitter OAuth initialization error:', error);
    return NextResponse.json(
      { error: 'OAuth initialization failed' }, 
      { status: 500 }
    );
  }
}
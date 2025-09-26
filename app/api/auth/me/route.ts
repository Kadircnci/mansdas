import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../../../lib/middleware/auth';

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyToken(req);
    
    if ('error' in authResult) {
      return NextResponse.json(
        { detail: authResult.error },
        { status: authResult.status }
      );
    }

    return NextResponse.json({
      user: {
        id: authResult.user._id.toString(),
        username: authResult.user.username,
        role: authResult.user.role
      }
    });

  } catch (error) {
    console.error('Get user info error:', error);
    return NextResponse.json(
      { detail: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
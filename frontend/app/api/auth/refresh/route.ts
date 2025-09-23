// Next.js API Route - Token Refresh
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.SECRET_KEY || 'dev-secret-change-me';
const ACCESS_TOKEN_EXPIRE_MINUTES = 15;
const REFRESH_TOKEN_EXPIRE_DAYS = 7;

// Mock user data (normally would come from database)
const mockUsers = [
  {
    id: 1,
    username: 'admin',
    role: 'admin'
  },
  {
    id: 2,
    username: 'user',
    role: 'user'
  }
];

export async function POST(req: NextRequest) {
  try {
    const { refresh_token } = await req.json();

    if (!refresh_token) {
      return NextResponse.json(
        { detail: 'Refresh token gerekli' },
        { status: 400 }
      );
    }

    // Verify refresh token
    const decoded = jwt.verify(refresh_token, SECRET_KEY) as any;
    
    // Find user (normally from database)
    const user = mockUsers.find(u => u.id === decoded.user_id);
    if (!user) {
      return NextResponse.json(
        { detail: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { sub: user.username, user_id: user.id, role: user.role },
      SECRET_KEY,
      { expiresIn: `${ACCESS_TOKEN_EXPIRE_MINUTES}m` }
    );

    // Generate new refresh token
    const newRefreshToken = jwt.sign(
      { sub: user.username, user_id: user.id },
      SECRET_KEY,
      { expiresIn: `${REFRESH_TOKEN_EXPIRE_DAYS}d` }
    );

    return NextResponse.json({
      access_token: accessToken,
      token_type: 'bearer',
      refresh_token: newRefreshToken
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { detail: 'Geçersiz refresh token' },
      { status: 401 }
    );
  }
}
// Next.js API Route - Authentication (Mock version for testing)
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// import { sql } from '@vercel/postgres';

const SECRET_KEY = process.env.SECRET_KEY || 'dev-secret-change-me';
const ACCESS_TOKEN_EXPIRE_MINUTES = 15;
const REFRESH_TOKEN_EXPIRE_DAYS = 7;

// Mock user data (normally would come from database)
const mockUsers = [
  {
    id: 1,
    username: 'admin',
    password_hash: '$2a$12$R77XNHbD44lmTQ1FMCRUiOLuH9E.6shiEkLMZDgDiBlK4AQ/ZyrkO', // admin123
    role: 'admin'
  },
  {
    id: 2,
    username: 'user',
    password_hash: '$2a$12$4K8QJl1X2YqKqEF5vF8HXOGHpFVtF9Pp1gVnCrF8LkQr5Qz6Sp8re', // user123
    role: 'user'
  }
];

// Login endpoint
export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    // Mock database query (replace with real Postgres when ready)
    const user = mockUsers.find(u => u.username === username);

    if (!user) {
      return NextResponse.json(
        { detail: 'Kullanıcı adı veya şifre hatalı' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { detail: 'Kullanıcı adı veya şifre hatalı' },
        { status: 401 }
      );
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { sub: user.username, user_id: user.id, role: user.role },
      SECRET_KEY,
      { expiresIn: `${ACCESS_TOKEN_EXPIRE_MINUTES}m` }
    );

    const refreshToken = jwt.sign(
      { sub: user.username, user_id: user.id },
      SECRET_KEY,
      { expiresIn: `${REFRESH_TOKEN_EXPIRE_DAYS}d` }
    );

    return NextResponse.json({
      access_token: accessToken,
      token_type: 'bearer',
      refresh_token: refreshToken,
      user: { id: user.id, username: user.username, role: user.role }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { detail: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
// Next.js API Route - Authentication
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sql } from '@vercel/postgres';

const SECRET_KEY = process.env.SECRET_KEY || 'dev-secret-change-me';
const ACCESS_TOKEN_EXPIRE_MINUTES = 15;
const REFRESH_TOKEN_EXPIRE_DAYS = 7;

// Login endpoint
export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    // Database query
    const { rows } = await sql`
      SELECT id, username, password_hash, role 
      FROM "User" 
      WHERE username = ${username}
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { detail: 'Kullanıcı adı veya şifre hatalı' },
        { status: 401 }
      );
    }

    const user = rows[0];
    
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
      refresh_token: refreshToken
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { detail: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/User';

const SECRET_KEY = process.env.SECRET_KEY || 'dev-secret-change-me';
const ACCESS_TOKEN_EXPIRE_MINUTES = 15;
const REFRESH_TOKEN_EXPIRE_DAYS = 7;

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { detail: 'Kullanıcı adı ve şifre gerekli' },
        { status: 400 }
      );
    }

    await dbConnect();
    const user = await User.findOne({ username });

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
      { sub: user.username, user_id: user._id.toString(), role: user.role },
      SECRET_KEY,
      { expiresIn: `${ACCESS_TOKEN_EXPIRE_MINUTES}m` }
    );

    const refreshToken = jwt.sign(
      { sub: user.username, user_id: user._id.toString() },
      SECRET_KEY,
      { expiresIn: `${REFRESH_TOKEN_EXPIRE_DAYS}d` }
    );

    return NextResponse.json({
      access_token: accessToken,
      token_type: 'bearer',
      refresh_token: refreshToken,
      user: { 
        id: user._id.toString(), 
        username: user.username, 
        role: user.role 
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { detail: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
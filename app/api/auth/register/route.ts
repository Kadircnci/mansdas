import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/User';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { detail: 'Kullanıcı adı ve şifre gerekli' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { detail: 'Şifre en az 6 karakter olmalı' },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { detail: 'Kullanıcı adı en az 3 karakter olmalı' },
        { status: 400 }
      );
    }

    await dbConnect();
    
    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return NextResponse.json(
        { detail: 'Bu kullanıcı adı zaten kullanılıyor' },
        { status: 400 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = new User({
      username,
      password_hash,
      role: 'user'
    });

    await user.save();

    return NextResponse.json({
      message: 'Kullanıcı başarıyla oluşturuldu',
      user: {
        id: user._id.toString(),
        username: user.username,
        role: user.role
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Register error:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { detail: 'Bu kullanıcı adı zaten kullanılıyor' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { detail: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../../../../lib/middleware/auth';
import dbConnect from '../../../../../lib/mongodb';
import User from '../../../../../models/User';

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyToken(req);
    
    if ('error' in authResult) {
      return NextResponse.json(
        { detail: authResult.error },
        { status: authResult.status }
      );
    }

    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { detail: 'Admin yetkisi gerekli' },
        { status: 403 }
      );
    }

    await dbConnect();
    const users = await User.find({}).select('-password_hash');

    return NextResponse.json(users);

  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { detail: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
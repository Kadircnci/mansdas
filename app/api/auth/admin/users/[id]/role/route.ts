import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../../../../../../lib/middleware/auth';
import dbConnect from '../../../../../../../lib/mongodb';
import User from '../../../../../../../models/User';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
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

    const { role } = await req.json();
    
    if (!['admin', 'user'].includes(role)) {
      return NextResponse.json(
        { detail: 'Geçersiz rol' },
        { status: 400 }
      );
    }

    await dbConnect();
    const user = await User.findById(resolvedParams.id);
    
    if (!user) {
      return NextResponse.json(
        { detail: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }

    user.role = role;
    await user.save();

    return NextResponse.json({
      message: 'Kullanıcı rolü güncellendi',
      user: {
        id: user._id.toString(),
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Update user role error:', error);
    return NextResponse.json(
      { detail: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
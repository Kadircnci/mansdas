import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../../../lib/middleware/auth';
import dbConnect from '../../../../lib/mongodb';
import Content from '../../../../models/Content';

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyToken(req);
    
    if ('error' in authResult) {
      return NextResponse.json(
        { detail: authResult.error },
        { status: authResult.status }
      );
    }

    await dbConnect();
    const contents = await Content.find({ author_id: authResult.user._id })
      .populate('author_id', 'username')
      .sort({ createdAt: -1 });

    return NextResponse.json(contents);

  } catch (error) {
    console.error('Get content list error:', error);
    return NextResponse.json(
      { detail: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../../../lib/middleware/auth';
import dbConnect from '../../../../lib/mongodb';
import Content from '../../../../models/Content';

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyToken(req);
    
    if ('error' in authResult) {
      return NextResponse.json(
        { detail: authResult.error },
        { status: authResult.status }
      );
    }

    const { title, content_text, mode, tone, user_prompt, platforms } = await req.json();

    if (!title || !mode) {
      return NextResponse.json(
        { detail: 'Başlık ve mod gerekli' },
        { status: 400 }
      );
    }

    await dbConnect();
    
    // Simple content generation based on mode
    let generated_content = '';
    if (mode === 'ai_generate' && user_prompt) {
      // For demo purposes, create simple generated content
      generated_content = `${tone ? `[${tone} tonunda] ` : ''}${user_prompt} hakkında oluşturulan içerik: ${content_text || ''}`;
    }

    const content = new Content({
      author_id: authResult.user._id,
      title,
      content_text,
      mode,
      tone,
      user_prompt,
      generated_content: generated_content || content_text,
      platforms: platforms || []
    });

    await content.save();
    await content.populate('author_id', 'username');

    return NextResponse.json(content, { status: 201 });

  } catch (error) {
    console.error('Create content error:', error);
    return NextResponse.json(
      { detail: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
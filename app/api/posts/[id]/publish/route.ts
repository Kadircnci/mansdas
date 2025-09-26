import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenLegacy as verifyToken } from '../../../../../lib/middleware/auth';
import dbConnect from '../../../../../lib/mongodb';
import { Account, Post } from '../../../../../models';
import { 
  createSuccessResponse, 
  createErrorResponse,
  HTTP_STATUS,
  ERROR_CODES
} from '../../../../../lib/api-response';
import { 
  withErrorHandler, 
  ValidationError, 
  validateMethod 
} from '../../../../../lib/api-middleware';

// Twitter API v2 post function
async function postToTwitter(accessToken: string, text: string): Promise<{ id: string }> {
  const response = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: text.slice(0, 280) // Twitter character limit
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Twitter API error: ${error.detail || error.title || 'Unknown error'}`);
  }

  return await response.json();
}

export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  validateMethod(req, ['POST']);
  
  const authResult = await verifyToken(req);
  if ('error' in authResult) {
    return NextResponse.json(
      createErrorResponse(ERROR_CODES.UNAUTHORIZED, authResult.error),
      { status: authResult.status }
    );
  }

  const resolvedParams = await params;
  const postId = resolvedParams.id;

  if (!postId) {
    throw new ValidationError('Post ID gerekli');
  }

  await dbConnect();

  try {
    // Post'u veritabanından al
    const post = await Post.findById(postId);
    if (!post) {
      return NextResponse.json(
        createErrorResponse(ERROR_CODES.NOT_FOUND, 'Post bulunamadı'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Kullanıcının post sahibi olup olmadığını kontrol et
    if (post.author_id.toString() !== authResult.user._id.toString()) {
      return NextResponse.json(
        createErrorResponse(ERROR_CODES.FORBIDDEN, 'Bu post\'u yayınlama yetkiniz yok'),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    // Kullanıcının bağlı Twitter hesabını bul
    const twitterAccount = await Account.findOne({
      owner_id: authResult.user._id,
      platform: 'twitter',
      is_active: true
    });

    if (!twitterAccount) {
      return NextResponse.json(
        createErrorResponse(ERROR_CODES.NOT_FOUND, 'Twitter hesabı bağlanmamış'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // İçeriği hazırla (caption varsa onu kullan, yoksa title + content)
    let tweetText = post.caption || post.title;
    
    // Eğer sadece title varsa ve çok kısaysa, content'ten de ekle
    if (tweetText.length < 50 && post.content) {
      const remainingChars = 280 - tweetText.length - 3; // 3 char for "..."
      if (remainingChars > 20) {
        const contentPreview = post.content.slice(0, remainingChars) + '...';
        tweetText = `${tweetText}\n\n${contentPreview}`;
      }
    }

    // Twitter'da paylaş
    const tweetResult = await postToTwitter(twitterAccount.access_token, tweetText);

    // Post durumunu güncelle
    await Post.findByIdAndUpdate(postId, {
      status: 'published',
      published_at: new Date(),
      external_post_id: tweetResult.id || 'unknown',
      $push: {
        platform_results: {
          platform: 'twitter',
          status: 'success',
          external_id: tweetResult.id || 'unknown',
          published_at: new Date()
        }
      }
    });

    return NextResponse.json(
      createSuccessResponse({
        message: 'Tweet başarıyla paylaşıldı!',
        tweet_id: tweetResult.id,
        tweet_text: tweetText.slice(0, 100) + (tweetText.length > 100 ? '...' : ''),
        platform: 'twitter'
      }),
      { status: HTTP_STATUS.OK }
    );

  } catch (error: any) {
    console.error('Twitter publishing error:', error);
    
    // Post durumunu hata olarak güncelle
    await Post.findByIdAndUpdate(postId, {
      status: 'failed',
      last_error: error.message,
      retry_count: { $inc: 1 }
    }).catch(dbError => console.error('DB update error:', dbError));

    return NextResponse.json(
      createErrorResponse(
        ERROR_CODES.EXTERNAL_API_ERROR,
        `Twitter paylaşımı başarısız: ${error.message}`
      ),
      { status: HTTP_STATUS.BAD_GATEWAY }
    );
  }
});
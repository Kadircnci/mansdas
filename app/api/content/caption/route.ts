import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenLegacy as verifyToken } from '../../../../lib/middleware/auth';
import dbConnect from '../../../../lib/mongodb';
import { generateCaption } from '../../../../lib/openai';
import { Analytics } from '../../../../models';
import { 
  createSuccessResponse, 
  createErrorResponse,
  HTTP_STATUS,
  ERROR_CODES
} from '../../../../lib/api-response';
import { 
  withErrorHandler, 
  ValidationError, 
  validateMethod,
  validateContentType 
} from '../../../../lib/api-middleware';

export const POST = withErrorHandler(async (req: NextRequest) => {
  validateMethod(req, ['POST']);
  validateContentType(req);
  
  const authResult = await verifyToken(req);
  if ('error' in authResult) {
    return NextResponse.json(
      createErrorResponse(ERROR_CODES.UNAUTHORIZED, authResult.error),
      { status: authResult.status }
    );
  }

  const body = await req.json();
  const { 
    title, 
    content, 
    platform, 
    tone,
    language = 'Türkçe'
  } = body;

  // Validation
  if (!title?.trim()) {
    throw new ValidationError('Başlık gerekli');
  }

  if (!content?.trim()) {
    throw new ValidationError('İçerik gerekli');
  }

  if (title.trim().length < 5) {
    throw new ValidationError('Başlık en az 5 karakter olmalı');
  }

  if (content.trim().length < 10) {
    throw new ValidationError('İçerik en az 10 karakter olmalı');
  }

  await dbConnect();

  try {
    const startTime = Date.now();
    
    // Generate caption using OpenAI
    const generatedCaption = await generateCaption({
      title: title.trim(),
      content: content.trim(),
      platform,
      tone,
      language
    });

    const responseTime = Date.now() - startTime;

    // Log analytics
    try {
      await Analytics.create({
        user_id: authResult.user._id,
        metric_type: 'api_call',
        platform: platform,
        metadata: {
          api_type: 'caption_generation',
          response_time: responseTime,
          title_length: title.trim().length,
          content_length: content.trim().length,
          caption_length: generatedCaption.length,
          tone,
          language
        }
      });
    } catch (analyticsError) {
      console.warn('Analytics logging failed:', analyticsError);
    }

    return NextResponse.json(
      createSuccessResponse({
        generated_caption: generatedCaption,
        metadata: {
          title: title.trim(),
          content_length: content.trim().length,
          platform,
          tone,
          language,
          response_time: responseTime
        }
      }),
      { status: HTTP_STATUS.OK }
    );
  } catch (error: any) {
    console.error('Caption generation error:', error);
    
    // Log failed generation
    try {
      await Analytics.create({
        user_id: authResult.user._id,
        metric_type: 'api_call',
        platform: platform,
        metadata: {
          api_type: 'caption_generation',
          error_message: error.message,
          title_length: title.trim().length,
          content_length: content.trim().length,
          tone,
          language
        }
      });
    } catch (analyticsError) {
      console.warn('Analytics logging failed:', analyticsError);
    }

    return NextResponse.json(
      createErrorResponse(
        ERROR_CODES.EXTERNAL_API_ERROR,
        'Caption üretimi başarısız: ' + error.message
      ),
      { status: HTTP_STATUS.BAD_GATEWAY }
    );
  }
});
import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenLegacy as verifyToken } from '../../../../lib/middleware/auth';
import dbConnect from '../../../../lib/mongodb';
import { generateContent } from '../../../../lib/openai';
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
    prompt, 
    tone, 
    platform, 
    language = 'Türkçe',
    maxTokens = 500
  } = body;

  // Validation
  if (!prompt?.trim()) {
    throw new ValidationError('İçerik konusu/isteği gerekli');
  }

  if (prompt.trim().length < 10) {
    throw new ValidationError('İçerik konusu en az 10 karakter olmalı');
  }

  if (prompt.trim().length > 1000) {
    throw new ValidationError('İçerik konusu en fazla 1000 karakter olabilir');
  }

  await dbConnect();

  try {
    const startTime = Date.now();
    
    // Generate content using OpenAI
    const generatedContent = await generateContent({
      prompt: prompt.trim(),
      tone,
      platform,
      language,
      maxTokens
    });

    const responseTime = Date.now() - startTime;

    // Log analytics
    try {
      await Analytics.create({
        user_id: authResult.user._id,
        metric_type: 'api_call',
        platform: platform,
        metadata: {
          api_type: 'content_generation',
          response_time: responseTime,
          prompt_length: prompt.trim().length,
          content_length: generatedContent.length,
          tone,
          language
        }
      });
    } catch (analyticsError) {
      console.warn('Analytics logging failed:', analyticsError);
    }

    return NextResponse.json(
      createSuccessResponse({
        generated_content: generatedContent,
        metadata: {
          prompt: prompt.trim(),
          tone,
          platform,
          language,
          response_time: responseTime
        }
      }),
      { status: HTTP_STATUS.OK }
    );
  } catch (error: any) {
    console.error('Content generation error:', error);
    
    // Log failed generation
    try {
      await Analytics.create({
        user_id: authResult.user._id,
        metric_type: 'api_call',
        platform: platform,
        metadata: {
          api_type: 'content_generation',
          error_message: error.message,
          prompt_length: prompt.trim().length,
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
        'İçerik üretimi başarısız: ' + error.message
      ),
      { status: HTTP_STATUS.BAD_GATEWAY }
    );
  }
});
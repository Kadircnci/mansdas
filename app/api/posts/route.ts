import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenLegacy as verifyToken } from '../../../lib/middleware/auth';
import dbConnect from '../../../lib/mongodb';
import { Post, Analytics } from '../../../models';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  validatePaginationParams, 
  createMongoQuery,
  createPaginationMeta,
  HTTP_STATUS,
  ERROR_CODES
} from '../../../lib/api-response';
import { 
  withErrorHandler, 
  ValidationError, 
  validateMethod,
  validateContentType 
} from '../../../lib/api-middleware';

// Get Posts with Pagination and Filtering
export const GET = withErrorHandler(async (req: NextRequest) => {
  validateMethod(req, ['GET']);
  
  const authResult = await verifyToken(req);
  if ('error' in authResult) {
    return NextResponse.json(
      createErrorResponse(ERROR_CODES.UNAUTHORIZED, authResult.error),
      { status: authResult.status }
    );
  }

  await dbConnect();

  // Parse query parameters
  const { searchParams } = new URL(req.url);
  const paginationParams = validatePaginationParams(searchParams);
  const status = searchParams.get('status');
  const platform = searchParams.get('platform');
  const search = searchParams.get('search');

  // Build query
  const query: any = { author_id: authResult.user._id };
  if (status) query.status = status;
  if (platform) query.platforms = { $in: [platform] };
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } }
    ];
  }

  // Get total count for pagination
  const total = await Post.countDocuments(query);
  
  // Get paginated results
  const { skip, limit, sort } = createMongoQuery(paginationParams);
  const posts = await Post.find(query)
    .populate('author_id', 'username profile.firstName profile.lastName')
    .populate('account_id', 'platform name username')
    .sort(sort)
    .skip(skip)
    .limit(limit);

  return NextResponse.json(
    createSuccessResponse(posts, {
      pagination: createPaginationMeta(
        paginationParams.page || 1, 
        paginationParams.limit || 10, 
        total
      )
    }),
    { status: HTTP_STATUS.OK }
  );
});

// Create New Post
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
    scheduled_at, 
    platforms, 
    caption, 
    tone, 
    account_id,
    mode = 'manuel',
    user_prompt,
    generated_content
  } = body;

  // Validation
  if (!title?.trim()) {
    throw new ValidationError('Başlık gerekli');
  }

  if (mode === 'manuel' && !content?.trim()) {
    throw new ValidationError('Manuel modda içerik gerekli');
  }

  if (mode === 'otomatik' && !user_prompt?.trim()) {
    throw new ValidationError('Otomatik modda konu/istek gerekli');
  }

  await dbConnect();

  // Create post
  const post = new Post({
    author_id: authResult.user._id,
    title: title.trim(),
    content: content?.trim(),
    scheduled_at: scheduled_at ? new Date(scheduled_at) : undefined,
    platforms: platforms || [],
    caption: caption?.trim(),
    tone,
    account_id: account_id || undefined,
    mode,
    user_prompt: user_prompt?.trim(),
    generated_content: generated_content?.trim(),
    status: 'taslak'
  });

  await post.save();
  await post.populate([
    { path: 'author_id', select: 'username profile.firstName profile.lastName' },
    { path: 'account_id', select: 'platform name username' }
  ]);

  // Log analytics
  try {
    await Analytics.create({
      user_id: authResult.user._id,
      post_id: post._id,
      metric_type: 'post_created',
      platform: platforms?.[0],
      metadata: {
        mode,
        has_scheduled: !!scheduled_at
      }
    });
  } catch (analyticsError) {
    console.warn('Analytics logging failed:', analyticsError);
  }

  return NextResponse.json(
    createSuccessResponse(post),
    { status: HTTP_STATUS.CREATED }
  );
});
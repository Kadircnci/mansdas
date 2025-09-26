import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenLegacy as verifyToken } from '../../../lib/middleware/auth';
import dbConnect from '../../../lib/mongodb';
import { Account, Analytics } from '../../../models';
import { 
  createSuccessResponse, 
  createErrorResponse,
  HTTP_STATUS,
  ERROR_CODES
} from '../../../lib/api-response';
import { 
  withErrorHandler, 
  ValidationError, 
  ConflictError,
  validateMethod,
  validateContentType 
} from '../../../lib/api-middleware';

// Get User's Social Media Accounts
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

  const { searchParams } = new URL(req.url);
  const platform = searchParams.get('platform');
  const activeOnly = searchParams.get('active') === 'true';

  // Build query
  const query: any = { owner_id: authResult.user._id };
  if (platform) query.platform = platform;
  if (activeOnly) query.is_active = true;

  const accounts = await Account.find(query)
    .populate('owner_id', 'username profile.firstName profile.lastName')
    .sort({ createdAt: -1 });

  return NextResponse.json(
    createSuccessResponse(accounts),
    { status: HTTP_STATUS.OK }
  );
});

// Connect New Social Media Account
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
    platform, 
    external_id, 
    name, 
    username,
    access_token, 
    refresh_token, 
    expires_at,
    profile_picture,
    followers_count
  } = body;

  // Validation
  if (!platform || !['instagram', 'twitter', 'facebook', 'linkedin'].includes(platform)) {
    throw new ValidationError('Geçerli bir platform seçin (instagram, twitter, facebook, linkedin)');
  }

  if (!external_id?.trim()) {
    throw new ValidationError('External ID gerekli');
  }

  await dbConnect();

  // Check if account already exists for this user
  const existingAccount = await Account.findOne({
    owner_id: authResult.user._id,
    platform,
    external_id: external_id.trim()
  });

  if (existingAccount) {
    throw new ConflictError('Bu hesap zaten bağlı');
  }

  // Create new account
  const account = new Account({
    owner_id: authResult.user._id,
    platform,
    external_id: external_id.trim(),
    name: name?.trim(),
    username: username?.trim(),
    access_token,
    refresh_token,
    expires_at: expires_at ? new Date(expires_at) : undefined,
    profile_picture,
    followers_count: followers_count || 0,
    last_sync: new Date(),
    is_active: true
  });

  await account.save();
  await account.populate('owner_id', 'username profile.firstName profile.lastName');

  // Log analytics
  try {
    await Analytics.create({
      user_id: authResult.user._id,
      account_id: account._id,
      metric_type: 'account_connected',
      platform: platform,
      metadata: {
        followers_count
      }
    });
  } catch (analyticsError) {
    console.warn('Analytics logging failed:', analyticsError);
  }

  return NextResponse.json(
    createSuccessResponse(account),
    { status: HTTP_STATUS.CREATED }
  );
});
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { User, Analytics } from '../../models';
import dbConnect from '../mongodb';

const SECRET_KEY = process.env.SECRET_KEY || 'dev-secret-change-me';
const REFRESH_SECRET_KEY = process.env.REFRESH_SECRET_KEY || 'dev-refresh-secret-change-me';

export interface AuthenticatedUser {
  _id: string;
  username: string;
  email?: string;
  role: 'admin' | 'user';
  profile?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    bio?: string;
    company?: string;
    website?: string;
    timezone?: string;
  };
  settings?: {
    emailNotifications: boolean;
    autoPostApproval: boolean;
    defaultTone?: string;
    preferredLanguage: string;
  };
  subscription?: {
    plan: 'free' | 'premium' | 'enterprise';
    status: 'active' | 'inactive' | 'canceled';
    expiresAt?: Date;
  };
  lastLoginAt?: Date;
  isActive: boolean;
}

export interface AuthResult {
  success: true;
  user: AuthenticatedUser;
} 

export interface AuthError {
  success: false;
  error: string;
  status: number;
  code?: string;
}

export async function verifyToken(req: NextRequest): Promise<AuthResult | AuthError> {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { 
        success: false, 
        error: 'Authorization header with Bearer token required', 
        status: 401,
        code: 'MISSING_TOKEN'
      };
    }

    const token = authHeader.substring(7);
    
    let decoded: any;
    try {
      decoded = jwt.verify(token, SECRET_KEY);
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        return {
          success: false,
          error: 'Token expired',
          status: 401,
          code: 'TOKEN_EXPIRED'
        };
      }
      return {
        success: false,
        error: 'Invalid token',
        status: 401,
        code: 'INVALID_TOKEN'
      };
    }

    if (!decoded.user_id) {
      return {
        success: false,
        error: 'Invalid token payload',
        status: 401,
        code: 'INVALID_TOKEN'
      };
    }

    await dbConnect();
    const user = await User.findById(decoded.user_id).select('-password_hash');
    
    if (!user) {
      return { 
        success: false, 
        error: 'User not found', 
        status: 401,
        code: 'USER_NOT_FOUND'
      };
    }

    if (!user.isActive) {
      return {
        success: false,
        error: 'Account deactivated',
        status: 401,
        code: 'ACCOUNT_DEACTIVATED'
      };
    }

    // Update last login time
    try {
      await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });
    } catch (updateError) {
      console.warn('Failed to update last login time:', updateError);
    }

    return { success: true, user: user.toObject() };
  } catch (error: any) {
    console.error('Token verification error:', error);
    return { 
      success: false, 
      error: 'Authentication failed', 
      status: 500,
      code: 'AUTH_ERROR'
    };
  }
}

// Helper function for backward compatibility
export async function verifyTokenLegacy(req: NextRequest): Promise<{ user: any } | { error: string, status: number }> {
  const result = await verifyToken(req);
  
  if (result.success) {
    return { user: result.user };
  } else {
    return { error: result.error, status: result.status };
  }
}

export async function generateTokens(userId: string): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = jwt.sign(
    { user_id: userId },
    SECRET_KEY,
    { expiresIn: '1h' } // Access token expires in 1 hour
  );

  const refreshToken = jwt.sign(
    { user_id: userId },
    REFRESH_SECRET_KEY,
    { expiresIn: '7d' } // Refresh token expires in 7 days
  );

  return { accessToken, refreshToken };
}

export async function verifyRefreshToken(token: string): Promise<{ user_id: string } | null> {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET_KEY) as any;
    return { user_id: decoded.user_id };
  } catch {
    return null;
  }
}

export async function requireAuth(req: NextRequest): Promise<AuthenticatedUser> {
  const result = await verifyToken(req);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.user;
}

export async function requireAdmin(req: NextRequest): Promise<AuthenticatedUser> {
  const user = await requireAuth(req);
  if (user.role !== 'admin') {
    throw new Error('Admin privileges required');
  }
  return user;
}

export async function checkPermission(
  user: AuthenticatedUser, 
  action: string, 
  resource?: any
): Promise<boolean> {
  // Admin has all permissions
  if (user.role === 'admin') {
    return true;
  }

  // Check subscription-based permissions
  const plan = user.subscription?.plan || 'free';
  const isActive = user.subscription?.status === 'active';

  if (!isActive && plan !== 'free') {
    return false; // Inactive paid accounts lose permissions
  }

  // Define permission rules
  const permissions: Record<string, Record<string, boolean>> = {
    free: {
      'create_post': true,
      'edit_own_post': true,
      'delete_own_post': true,
      'connect_account': true,
      'generate_content': true, // Limited
      'view_analytics': false,
      'export_data': false,
      'bulk_operations': false,
    },
    premium: {
      'create_post': true,
      'edit_own_post': true,
      'delete_own_post': true,
      'connect_account': true,
      'generate_content': true,
      'view_analytics': true,
      'export_data': true,
      'bulk_operations': true,
      'advanced_scheduling': true,
    },
    enterprise: {
      'create_post': true,
      'edit_own_post': true,
      'delete_own_post': true,
      'connect_account': true,
      'generate_content': true,
      'view_analytics': true,
      'export_data': true,
      'bulk_operations': true,
      'advanced_scheduling': true,
      'team_management': true,
      'custom_integrations': true,
    }
  };

  return permissions[plan]?.[action] || false;
}

// Rate limiting helper
export async function checkUserRateLimit(
  userId: string, 
  action: string, 
  limit: number = 100, 
  windowMinutes: number = 60
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    await dbConnect();
    
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
    
    const count = await Analytics.countDocuments({
      user_id: userId,
      metric_type: 'api_call',
      'metadata.api_type': action,
      createdAt: { $gte: windowStart }
    });

    const remaining = Math.max(0, limit - count);
    
    return {
      allowed: count < limit,
      remaining
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return { allowed: true, remaining: limit }; // Fail open
  }
}
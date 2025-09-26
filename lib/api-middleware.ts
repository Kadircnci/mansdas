import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, ERROR_CODES, HTTP_STATUS } from './api-response';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

// Custom API Error Class
export class CustomApiError extends Error implements ApiError {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode: number, code: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'CustomApiError';
  }
}

// Predefined Error Classes
export class ValidationError extends CustomApiError {
  constructor(message: string, details?: any) {
    super(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, details);
  }
}

export class UnauthorizedError extends CustomApiError {
  constructor(message: string = 'Unauthorized access') {
    super(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED);
  }
}

export class ForbiddenError extends CustomApiError {
  constructor(message: string = 'Forbidden access') {
    super(message, HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
  }
}

export class NotFoundError extends CustomApiError {
  constructor(message: string = 'Resource not found') {
    super(message, HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
}

export class ConflictError extends CustomApiError {
  constructor(message: string = 'Resource already exists') {
    super(message, HTTP_STATUS.CONFLICT, ERROR_CODES.ALREADY_EXISTS);
  }
}

// Error Handler Wrapper
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error: any) {
      console.error('API Error:', error);

      // Handle custom API errors
      if (error instanceof CustomApiError) {
        return NextResponse.json(
          createErrorResponse(error.code, error.message, error.details),
          { status: error.statusCode }
        );
      }

      // Handle MongoDB/Mongoose errors
      if (error.name === 'ValidationError') {
        return NextResponse.json(
          createErrorResponse(
            ERROR_CODES.VALIDATION_ERROR,
            'Validation failed',
            error.errors
          ),
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }

      if (error.code === 11000) { // MongoDB duplicate key error
        return NextResponse.json(
          createErrorResponse(
            ERROR_CODES.ALREADY_EXISTS,
            'Resource already exists',
            error.keyValue
          ),
          { status: HTTP_STATUS.CONFLICT }
        );
      }

      // Handle JWT errors
      if (error.name === 'JsonWebTokenError') {
        return NextResponse.json(
          createErrorResponse(ERROR_CODES.INVALID_TOKEN, 'Invalid token'),
          { status: HTTP_STATUS.UNAUTHORIZED }
        );
      }

      if (error.name === 'TokenExpiredError') {
        return NextResponse.json(
          createErrorResponse(ERROR_CODES.TOKEN_EXPIRED, 'Token expired'),
          { status: HTTP_STATUS.UNAUTHORIZED }
        );
      }

      // Handle OpenAI errors
      if (error.response?.status === 401) {
        return NextResponse.json(
          createErrorResponse(
            ERROR_CODES.EXTERNAL_API_ERROR,
            'OpenAI API authentication failed'
          ),
          { status: HTTP_STATUS.BAD_GATEWAY }
        );
      }

      // Default server error
      return NextResponse.json(
        createErrorResponse(
          ERROR_CODES.INTERNAL_SERVER_ERROR,
          process.env.NODE_ENV === 'production' 
            ? 'An internal server error occurred' 
            : error.message
        ),
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  };
}

// Request Method Validator
export function validateMethod(
  request: NextRequest,
  allowedMethods: string[]
): void {
  if (!allowedMethods.includes(request.method)) {
    throw new CustomApiError(
      `Method ${request.method} not allowed`,
      405,
      'METHOD_NOT_ALLOWED'
    );
  }
}

// Content Type Validator
export function validateContentType(
  request: NextRequest,
  expectedType: string = 'application/json'
): void {
  const contentType = request.headers.get('content-type');
  
  if (request.method !== 'GET' && contentType && !contentType.includes(expectedType)) {
    throw new ValidationError(
      `Expected content type ${expectedType}`,
      { received: contentType }
    );
  }
}

// Rate Limiting Helper (Basic implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (userLimit.count >= maxRequests) {
    return false;
  }

  userLimit.count++;
  return true;
}
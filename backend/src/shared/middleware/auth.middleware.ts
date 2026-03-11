import { Request, Response, NextFunction } from 'express';
import { extractTokenFromHeader, verifyAccessToken, JWTPayload } from '@/shared/utils/auth';
import { UnauthorizedError } from '@/shared/utils/errors';
import { log } from 'console';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Authenticate user via JWT
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      log('[auth] - No authorization header found');
      throw new UnauthorizedError('No Authorization header provided');
    }

    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      log('[auth] - Invalid token format');
      throw new UnauthorizedError('Invalid token format. Use "Bearer <token>"');
    }

    log('[auth] - Verifying token...');
    const payload = verifyAccessToken(token);
    req.user = payload;

    next();
  } catch (error) {
    log('[auth] - Auth error caught:', error instanceof UnauthorizedError, error instanceof Error);
    if (error instanceof UnauthorizedError) {
      log('[auth] - Passing UnauthorizedError with message:', (error as UnauthorizedError).message);
      next(error);
    } else {
      log('[auth] - Throwing new UnauthorizedError with generic message');
      next(new UnauthorizedError('Invalid or expired token'));
    }
  }
}

/**
 * Optional authentication (doesn't throw if no token)
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (token) {
      const payload = verifyAccessToken(token);
      req.user = payload;
    }

    next();
  } catch (error) {
    // Ignore errors, just continue without user
    next();
  }
}

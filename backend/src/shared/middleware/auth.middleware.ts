import { Request, Response, NextFunction } from 'express';
import { extractTokenFromHeader, verifyAccessToken, JWTPayload } from '@/shared/utils/auth';
import { UnauthorizedError } from '@/shared/utils/errors';

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
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const payload = verifyAccessToken(token);
    req.user = payload;

    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid or expired token'));
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

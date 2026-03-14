import { Request, Response, NextFunction } from 'express';
import prisma from '@/config/database';
import { PreconditionRequiredError, UnauthorizedError } from '@/shared/utils/errors';

/**
 * Blocks access for users that must reset their password after first login.
 *
 * Apply this to all protected routes except:
 * - `/api/auth/me`
 * - `/api/auth/logout`
 * - `/api/auth/change-password`
 */
export async function requirePasswordResetCompleted(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Unauthorized');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { firstLoginRequired: true },
    });

    if (user?.firstLoginRequired) {
      throw new PreconditionRequiredError(
        'Password reset required',
        'PASSWORD_RESET_REQUIRED'
      );
    }

    next();
  } catch (err) {
    next(err);
  }
}


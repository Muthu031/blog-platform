import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { registerSchema, loginSchema, changePasswordSchema } from './auth.validation';
import { ZodError } from 'zod';
import { BadRequestError } from '@/shared/utils/errors';

const authService = new AuthService();

/**
 * Register new user
 * POST /auth/register
 */
export async function register(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate input
    const data = registerSchema.parse(req.body);

    // Register user
    const result = await authService.register(data);

    res.status(201).json({
      success: true,
      data: {
        user: result.user,
      },
      message: 'Account created. A temporary password has been sent to your email.',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new BadRequestError(error.issues[0].message));
    } else {
      next(error);
    }
  }
}

/**
 * Login user
 * POST /auth/login
 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate input
    const data = loginSchema.parse(req.body);

    // Login user
    const result = await authService.login(data);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      data: {
        user: result.user,
        organization: result.organization,
        role: result.role,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new BadRequestError(error.issues[0].message));
    } else {
      next(error);
    }
  }
}

/**
 * Refresh access token
 * POST /auth/refresh
 */
export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new BadRequestError('Refresh token not found');
    }

    const result = await authService.refreshToken(refreshToken);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current user
 * GET /auth/me
 */
export async function getCurrentUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.sub;
    const user = await authService.getCurrentUser(userId);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Logout user
 * POST /auth/logout
 */
export async function logout(req: Request, res: Response) {
  res.clearCookie('refreshToken');
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
}

/**
 * Change password (including first-login reset)
 * POST /auth/change-password
 */
export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = changePasswordSchema.parse(req.body);
    const userId = req.user!.sub;

    const result = await authService.changePassword(userId, data);

    // Rotate refresh token (httpOnly cookie)
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      data: {
        user: result.user,
        organization: result.organization,
        role: result.role,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new BadRequestError(error.issues[0].message));
    } else {
      next(error);
    }
  }
}

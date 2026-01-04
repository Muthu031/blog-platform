import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { eq, and, gt } from 'drizzle-orm';
import { logUtils } from '../../utils/logUtils';
import { errorHandler } from '../middlewares/errorHandler';
import db from '../../services/db';
import { ApiResponse } from '../../../../../packages/shared/src/types';
import {
  generateAccessToken,
  generateRefreshToken,
  generateRefreshTokenJWT,
  verifyRefreshTokenJWT,
  TokenPayload,
} from '../../utils/auth';
import { users } from '../../database/tables/users';
import { refreshTokens } from '../../database/tables/refreshTokens';

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, error: 'Email and password are required' } as ApiResponse);
  }
  try {
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' } as ApiResponse);
    }

    const user = existingUser[0];
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      } as ApiResponse);
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshTokenValue = generateRefreshToken();
    const refreshTokenJWT = generateRefreshTokenJWT(refreshTokenValue, user.id);

    // Save refresh token to DB
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await db.insert(refreshTokens).values({
      token: refreshTokenValue,
      userId: user.id,
      expiresAt,
    });

    logUtils(req, res, `User ${email} logged in`);
    res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken: refreshTokenJWT,
      },
      message: 'Login successful',
    } as ApiResponse);
  } catch (error) {
    errorHandler(error, req, res);
  }
};

export const refresh = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required' });
  }
  try {
    // Verify refresh token JWT
    const decoded = verifyRefreshTokenJWT(refreshToken);
    const tokenValue = decoded.token;
    const userId = decoded.sub;

    // Check if refresh token exists in DB and is valid
    const existingToken = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token, tokenValue),
          eq(refreshTokens.userId, userId),
          gt(refreshTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (existingToken.length === 0) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Delete old refresh token
    await db.delete(refreshTokens).where(eq(refreshTokens.token, tokenValue));

    // Generate new tokens
    const newAccessToken = generateAccessToken(userId);
    const newRefreshTokenValue = generateRefreshToken();
    const newRefreshTokenJWT = generateRefreshTokenJWT(newRefreshTokenValue, userId);

    // Save new refresh token
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.insert(refreshTokens).values({
      token: newRefreshTokenValue,
      userId,
      expiresAt,
    });

    res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshTokenJWT,
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

export const logout = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required' });
  }
  try {
    const decoded = verifyRefreshTokenJWT(refreshToken);
    const tokenValue = decoded.token;

    // Delete refresh token from DB
    await db.delete(refreshTokens).where(eq(refreshTokens.token, tokenValue));

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Invalid refresh token' });
  }
};

export const signup = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ success: false, error: 'Name, email, and password are required' } as ApiResponse);
  }
  try {
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email));
    if (existingUser.length > 0) {
      return res.status(409).json({ success: false, error: 'User already exists' } as ApiResponse);
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const newUser = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash,
      })
      .returning({ id: users.id });

    logUtils(req, res, `User ${email} signed up`);
    res.status(201).json({
      success: true,
      data: { id: newUser[0].id, name, email },
      message: 'User created successfully',
    } as ApiResponse);
  } catch (error) {
    errorHandler(error, req, res);
  }
};

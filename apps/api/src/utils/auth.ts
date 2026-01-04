import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret';

export interface TokenPayload {
  sub: string; // userId
  iat?: number;
  exp?: number;
}

export const generateAccessToken = (userId: string): string => {
  const payload: TokenPayload = { sub: userId };
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (): string => {
  return randomUUID();
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_ACCESS_SECRET) as TokenPayload;
};

export const generateRefreshTokenJWT = (token: string, userId: string): string => {
  const payload = { sub: userId, token };
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '30d' });
};

export const verifyRefreshTokenJWT = (token: string): { sub: string; token: string } => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as { sub: string; token: string };
};
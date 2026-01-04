import { jwtDecode } from 'jwt-decode';

export interface TokenPayload {
  sub: string;
  iat: number;
  exp: number;
}

export const decodeToken = (token: string): TokenPayload => {
  return jwtDecode<TokenPayload>(token);
};

export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = decodeToken(token);
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};
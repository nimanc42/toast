import jwt from 'jsonwebtoken';
import { User } from '@shared/schema';

const JWT_SECRET = process.env.JWT_SECRET;
// JWT token expiration: 7 days
const JWT_EXPIRY = '7d';

// Check if JWT_SECRET is set
if (!JWT_SECRET) {
  console.error('\x1b[31m%s\x1b[0m', 'JWT_SECRET environment variable is required for authentication');
  console.error('\x1b[33m%s\x1b[0m', 'Set JWT_SECRET in your .env file (copy from .env.example)');
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(user: Omit<User, 'password'>): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not set. Authentication is not available.');
  }
  
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  });
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): { valid: boolean; userId?: number } {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not set. Authentication is not available.');
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string };
    return { valid: true, userId: decoded.id };
  } catch (error) {
    return { valid: false };
  }
}

/**
 * Generate HTTP-only secure cookie options for token
 */
export function getTokenCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'strict' as const,
    path: '/',
  };
}
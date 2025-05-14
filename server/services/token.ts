import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';
import { InsertToken } from '@shared/schema';

// Token expiration time in milliseconds (30 minutes)
const TOKEN_EXPIRY = 30 * 60 * 1000;

/**
 * Generate a verification token for a user
 */
export async function generateVerificationToken(userId: number): Promise<string> {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY);

  await storage.createToken({
    userId,
    token,
    type: 'verification',
    expiresAt,
  });

  return token;
}

/**
 * Generate a password reset token for a user
 */
export async function generatePasswordResetToken(userId: number): Promise<string> {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY);

  await storage.createToken({
    userId,
    token,
    type: 'password-reset',
    expiresAt,
  });

  return token;
}

/**
 * Verify that a token is valid and not expired
 */
export async function verifyToken(
  token: string, 
  type: 'verification' | 'password-reset'
): Promise<{ valid: boolean; userId?: number }> {
  const tokenRecord = await storage.getTokenByValue(token);

  if (!tokenRecord) {
    return { valid: false };
  }

  // Check if token is of the correct type, not expired, and not used
  if (
    tokenRecord.type !== type ||
    tokenRecord.used ||
    new Date(tokenRecord.expiresAt) < new Date()
  ) {
    return { valid: false };
  }

  return { valid: true, userId: tokenRecord.userId };
}

/**
 * Mark a token as used 
 */
export async function useToken(token: string): Promise<boolean> {
  try {
    await storage.markTokenAsUsed(token);
    return true;
  } catch (error) {
    console.error('Failed to mark token as used:', error);
    return false;
  }
}
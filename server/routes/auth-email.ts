import { Request, Response } from 'express';
import { verifyEmailSchema, forgotPasswordSchema, resetPasswordSchema } from '@shared/schema';
import { storage } from '../storage';
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail, validateToken, markTokenAsUsed } from '../services/email-service';
import { hashPassword } from '../auth';

/**
 * Send verification email
 * Used after registration
 */
export async function sendVerification(req: Request, res: Response) {
  try {
    const { userId } = req.body;
    
    // Validate userId
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Get user details
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Don't send verification if user is already verified
    if (user.verified) {
      return res.status(400).json({ message: 'User is already verified' });
    }
    
    // Send verification email
    const sent = await sendVerificationEmail(user.id, user.email, user.name);
    
    if (sent) {
      return res.status(200).json({ message: 'Verification email sent successfully' });
    } else {
      return res.status(500).json({ message: 'Failed to send verification email' });
    }
  } catch (error) {
    console.error('Error sending verification email:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Verify email with token
 */
export async function verifyEmail(req: Request, res: Response) {
  try {
    // Validate request body
    const result = verifyEmailSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: 'Invalid request', errors: result.error.errors });
    }
    
    const { token } = result.data;
    
    // Validate token
    const userId = await validateToken(token, 'verification');
    if (!userId) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    
    // Get user
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update user verification status
    const updatedUser = await storage.verifyUserEmail(userId);
    
    // Mark token as used
    await markTokenAsUsed(token);
    
    // Send welcome email
    await sendWelcomeEmail(updatedUser.email, updatedUser.name);
    
    return res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Error verifying email:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Request password reset
 */
export async function forgotPassword(req: Request, res: Response) {
  try {
    // Validate request body
    const result = forgotPasswordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: 'Invalid request', errors: result.error.errors });
    }
    
    const { email } = result.data;
    
    // Get user by email
    const user = await storage.getUserByEmail(email);
    
    // For security reasons, always return success even if the email doesn't exist
    // This prevents email enumeration attacks
    if (!user) {
      return res.status(200).json({ message: 'If your email is registered, you will receive a password reset link' });
    }
    
    // Send password reset email
    const sent = await sendPasswordResetEmail(user.id, user.email, user.name);
    
    return res.status(200).json({ message: 'If your email is registered, you will receive a password reset link' });
  } catch (error) {
    console.error('Error processing forgot password request:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Reset password with token
 */
export async function resetPassword(req: Request, res: Response) {
  try {
    // Validate request body
    const result = resetPasswordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: 'Invalid request', errors: result.error.errors });
    }
    
    const { token, password } = result.data;
    
    // Validate token
    const userId = await validateToken(token, 'password-reset');
    if (!userId) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    
    // Get user
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Hash the new password
    const hashedPassword = await hashPassword(password);
    
    // Update user's password
    await storage.updateUser(userId, { password: hashedPassword });
    
    // Mark token as used
    await markTokenAsUsed(token);
    
    return res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Resend verification email
 */
export async function resendVerification(req: Request, res: Response) {
  try {
    const { email } = req.body;
    
    // Validate email
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Get user by email
    const user = await storage.getUserByEmail(email);
    
    // For security reasons, always return success even if the email doesn't exist
    if (!user) {
      return res.status(200).json({ message: 'If your email is registered, you will receive a verification email' });
    }
    
    // Don't send verification if user is already verified
    if (user.verified) {
      return res.status(200).json({ message: 'If your email is registered, you will receive a verification email' });
    }
    
    // Send verification email
    const sent = await sendVerificationEmail(user.id, user.email, user.name);
    
    return res.status(200).json({ message: 'If your email is registered, you will receive a verification email' });
  } catch (error) {
    console.error('Error resending verification email:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
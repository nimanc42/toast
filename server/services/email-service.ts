import { Resend } from 'resend';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';
import { InsertToken } from '@shared/schema';

// Initialize Resend
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Dev mode for email testing without actually sending emails
const isDevelopment = process.env.NODE_ENV === 'development';
const mockEmails = isDevelopment || process.env.DEV_EMAIL_MOCK === 'true';

// Frontend URL for building links
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';

// Sender details - use environment variable for domain or fall back to Resend's shared domain
const fromDomain = process.env.EMAIL_FROM_DOMAIN || 'onboard@resend.dev';
const fromEmail = process.env.EMAIL_FROM_ADDRESS || fromDomain;
const fromName = 'A Toast to You';

/**
 * Common interface for all email requests
 */
interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Send an email using Resend
 * In development mode with DEV_EMAIL_MOCK=true, it will just log the email
 */
async function sendEmail({ to, subject, html, text }: EmailRequest): Promise<boolean> {
  try {
    // Check if resend is configured
    if (!resend) {
      console.error('Resend API key is not configured. Cannot send emails.');
      throw new Error('Email service not configured');
    }

    // In development, optionally mock emails instead of sending them
    if (mockEmails) {
      console.log('\n==== MOCK EMAIL ====');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Text: ${text}`);
      console.log('==== END MOCK EMAIL ====\n');
      return true;
    }

    // Actually send the email
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html,
      text,
    });

    if (error) {
      console.error('Error sending email:', error);
      return false;
    }

    console.log('Email sent successfully:', data?.id);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Generate a new token for verification or password reset
 * @param userId The user's ID
 * @param type The token type ('verification' or 'password-reset')
 * @param expiresInHours Number of hours until token expires (default: 24)
 */
async function generateToken(
  userId: number,
  type: 'verification' | 'password-reset',
  expiresInHours = 24
): Promise<string> {
  // Generate UUID token
  const token = uuidv4();

  // Calculate expiration date
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  // Create token record in database
  const tokenData: InsertToken = {
    userId,
    token,
    type,
    expiresAt,
  };

  await storage.createToken(tokenData);
  return token;
}

/**
 * Send a verification email to a newly registered user
 * @param userId The user's ID
 * @param email The user's email address
 * @param name The user's name
 */
export async function sendVerificationEmail(
  userId: number,
  email: string,
  name: string
): Promise<boolean> {
  try {
    // Generate verification token
    const token = await generateToken(userId, 'verification', 48);

    // Create verification link
    const verificationLink = `${frontendUrl}/verify-email?token=${token}`;

    const subject = 'Please verify your email for A Toast to You';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Verify Your Email</h1>
        <p>Hello ${name},</p>
        <p>Thank you for registering with A Toast to You! To complete your registration and start your journey of self-reflection, please verify your email address.</p>
        <p style="margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #3b82f6; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Your Email</a>
        </p>
        <p>This link will expire in 48 hours. If you didn't create an account, you can safely ignore this email.</p>
        <p>Best regards,<br/>The A Toast to You Team</p>
      </div>
    `;

    const text = `
Hello ${name},

Thank you for registering with A Toast to You! To complete your registration, please verify your email address by clicking the link below:

${verificationLink}

This link will expire in 48 hours. If you didn't create an account, you can safely ignore this email.

Best regards,
The A Toast to You Team
    `;

    return await sendEmail({ to: email, subject, html, text });
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
}

/**
 * Send a password reset email
 * @param userId The user's ID
 * @param email The user's email address
 * @param name The user's name
 */
export async function sendPasswordResetEmail(
  userId: number,
  email: string,
  name: string
): Promise<boolean> {
  try {
    // Generate reset token
    const token = await generateToken(userId, 'password-reset', 24);

    // Create reset link
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    const subject = 'Reset Your Password for A Toast to You';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Reset Your Password</h1>
        <p>Hello ${name},</p>
        <p>We received a request to reset your password for your A Toast to You account. If you didn't make this request, you can safely ignore this email.</p>
        <p style="margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #3b82f6; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
        </p>
        <p>This link will expire in 24 hours.</p>
        <p>Best regards,<br/>The A Toast to You Team</p>
      </div>
    `;

    const text = `
Hello ${name},

We received a request to reset your password for your A Toast to You account. If you didn't make this request, you can safely ignore this email.

To reset your password, please click the link below:

${resetLink}

This link will expire in 24 hours.

Best regards,
The A Toast to You Team
    `;

    return await sendEmail({ to: email, subject, html, text });
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
}

/**
 * Send a welcome email after email verification
 * @param email The user's email address
 * @param name The user's name
 */
export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  try {
    const subject = 'Welcome to A Toast to You!';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Welcome to A Toast to You!</h1>
        <p>Hello ${name},</p>
        <p>Thank you for verifying your email address. Your account is now fully activated!</p>
        <p>Here are a few tips to get you started:</p>
        <ul>
          <li>Create daily reflection notes to capture your thoughts and experiences</li>
          <li>Every week, we'll generate a personalized "toast" to celebrate your journey</li>
          <li>Listen to your toast narrated in a voice of your choice</li>
          <li>Share your toasts with friends when you're ready</li>
        </ul>
        <p style="margin: 30px 0;">
          <a href="${frontendUrl}" style="background-color: #3b82f6; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Visit A Toast to You</a>
        </p>
        <p>We're excited to be part of your personal growth journey!</p>
        <p>Best regards,<br/>The A Toast to You Team</p>
      </div>
    `;

    const text = `
Hello ${name},

Thank you for verifying your email address. Your account is now fully activated!

Here are a few tips to get you started:
- Create daily reflection notes to capture your thoughts and experiences
- Every week, we'll generate a personalized "toast" to celebrate your journey
- Listen to your toast narrated in a voice of your choice
- Share your toasts with friends when you're ready

Visit A Toast to You: ${frontendUrl}

We're excited to be part of your personal growth journey!

Best regards,
The A Toast to You Team
    `;

    return await sendEmail({ to: email, subject, html, text });
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return false;
  }
}

/**
 * Validate a token from the database
 * @param token The token string
 * @param type The token type ('verification' or 'password-reset')
 * @returns The user ID associated with the token if valid, or null if invalid
 */
export async function validateToken(
  token: string,
  type: 'verification' | 'password-reset'
): Promise<number | null> {
  try {
    // Find the token in the database
    const tokenRecord = await storage.getTokenByValue(token);

    // Check if token exists and is of the correct type
    if (!tokenRecord || tokenRecord.type !== type) {
      return null;
    }

    // Check if token is already used
    if (tokenRecord.used) {
      return null;
    }

    // Check if token is expired
    const now = new Date();
    if (now > tokenRecord.expiresAt) {
      return null;
    }

    return tokenRecord.userId;
  } catch (error) {
    console.error('Error validating token:', error);
    return null;
  }
}

/**
 * Mark a token as used
 * @param token The token string
 */
export async function markTokenAsUsed(token: string): Promise<boolean> {
  try {
    await storage.markTokenAsUsed(token);
    return true;
  } catch (error) {
    console.error('Error marking token as used:', error);
    return false;
  }
}

/**
 * Send a weekly toast notification email
 * @param email The user's email address
 * @param name The user's name
 */
export async function sendWeeklyToastNotification(email: string, name: string): Promise<boolean> {
  try {
    const subject = 'Your Weekly Toast is Ready!';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Your Weekly Toast is Ready!</h1>
        <p>Hi ${name},</p>
        <p>Your Weekly Toast is ready to read or listen to. It's a celebration of your reflections and growth from this past week.</p>
        <p style="margin: 30px 0;">
          <a href="${frontendUrl}" style="background-color: #3b82f6; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Open A Toast to You</a>
        </p>
        <p>Take a moment to listen to your personalized toast and celebrate your journey!</p>
        <p>Best regards,<br/>The A Toast to You Team</p>
      </div>
    `;

    const text = `
Hi ${name},

Your Weekly Toast is ready to read or listen to. It's a celebration of your reflections and growth from this past week.

Open A Toast to You: ${frontendUrl}

Take a moment to listen to your personalized toast and celebrate your journey!

Best regards,
The A Toast to You Team
    `;

    return await sendEmail({ to: email, subject, html, text });
  } catch (error) {
    console.error('Failed to send weekly toast notification:', error);
    return false;
  }
}

/**
 * Send a daily reflection reminder email
 * @param email The user's email address
 * @param name The user's name
 */
export async function sendDailyReflectionReminder(email: string, name: string): Promise<boolean> {
  try {
    const subject = 'Your Daily Reflection Awaits';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Your Daily Reflection Awaits</h1>
        <p>Hi ${name},</p>
        <p>Take a minute to reflect today. What mattered to you? What did you learn? What are you grateful for?</p>
        <p style="margin: 30px 0;">
          <a href="${frontendUrl}" style="background-color: #3b82f6; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Add Your Reflection</a>
        </p>
        <p>Your future self will thank you for taking this moment to reflect and grow.</p>
        <p>Best regards,<br/>The A Toast to You Team</p>
      </div>
    `;

    const text = `
Hi ${name},

Take a minute to reflect today. What mattered to you? What did you learn? What are you grateful for?

Add Your Reflection: ${frontendUrl}

Your future self will thank you for taking this moment to reflect and grow.

Best regards,
The A Toast to You Team
    `;

    return await sendEmail({ to: email, subject, html, text });
  } catch (error) {
    console.error('Failed to send daily reflection reminder:', error);
    return false;
  }
}
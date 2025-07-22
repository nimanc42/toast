import { Resend } from 'resend';

// Initialize Resend with API key from environment variables
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Frontend URL for links
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';

/**
 * Send an email using Resend or mock in development
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  // If no API key, mock email sending for development
  if (!resend) {
    console.log('\x1b[33m%s\x1b[0m', '[DEV] Email would be sent here:');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: ${html}`);
    return { success: true };
  }

  try {
    const fromDomain = process.env.EMAIL_FROM_DOMAIN || 'onboard@resend.dev';
    const fromEmail = process.env.EMAIL_FROM_ADDRESS || fromDomain;
    
    const { data, error } = await resend.emails.send({
      from: `A Toast to You <${fromEmail}>`,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Send a verification email to a newly registered user
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const verificationLink = `${frontendUrl}/verify-email?token=${token}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to A Toast to You!</h2>
      <p>Hi ${name},</p>
      <p>Thanks for signing up. To complete your registration, please verify your email address by clicking the button below:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${verificationLink}" style="background-color: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
          Verify Email Address
        </a>
      </p>
      <p>If you didn't create an account, you can safely ignore this email.</p>
      <p>This link will expire in 30 minutes.</p>
      <p>Best regards,<br>The A Toast to You Team</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Verify Your Email Address',
    html,
  });
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const resetLink = `${frontendUrl}/reset-password?token=${token}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset Request</h2>
      <p>We received a request to reset your password for A Toast to You.</p>
      <p>To reset your password, click the button below:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
          Reset Password
        </a>
      </p>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
      <p>This link will expire in 30 minutes.</p>
      <p>Best regards,<br>The A Toast to You Team</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Reset Your Password',
    html,
  });
}
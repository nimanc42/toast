import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { storage } from './storage';
import { hashPassword } from './auth';
import crypto from 'crypto';
import { User } from '@shared/schema';

// Check if Google OAuth credentials are configured
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const isGoogleAuthConfigured = !!googleClientId && !!googleClientSecret;

// Default callback URL based on environment
let defaultCallbackUrl = 'http://localhost:5000/auth/google/callback';

// If running in Replit production environment, use the Replit domain
if (process.env.REPLIT_SLUG || process.env.REPL_SLUG) {
  defaultCallbackUrl = 'https://a-toast-to-you.cngixg884d.repl.co/auth/google/callback';
}

const callbackURL = process.env.GOOGLE_CALLBACK_URL || defaultCallbackUrl;

// Only configure Google strategy if credentials are available
if (isGoogleAuthConfigured) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId!,
        clientSecret: googleClientSecret!,
        callbackURL: callbackURL,
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          // Extract user info from Google profile
          const email = profile.emails?.[0]?.value;
          const name = profile.displayName || '';
          const googleId = profile.id;
          
          if (!email) {
            return done(new Error('No email provided from Google'), false);
          }
          
          // Check if user already exists
          let user = await storage.getUserByEmail(email);
          
          if (user) {
            // Update user's Google ID if not set yet
            if (!user.externalId) {
              user = await storage.updateUser(user.id, {
                externalId: googleId,
                externalProvider: 'google',
                verified: true
              });
            }
          } else {
            // Create new user
            // Generate a random username based on name or email
            const baseUsername = (name || email.split('@')[0])
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '');
              
            // Add random suffix to ensure uniqueness
            const randomSuffix = crypto.randomBytes(3).toString('hex');
            let username = `${baseUsername}${randomSuffix}`;
            
            // Generate a secure random password
            const password = await hashPassword(crypto.randomBytes(16).toString('hex'));
            
            // Create user in database
            user = await storage.createUser({
              username,
              email,
              password,
              name,
              externalId: googleId,
              externalProvider: 'google'
            });
            
            // Verify the user immediately since Google OAuth users are pre-verified
            if (!user.verified) {
              user = await storage.verifyUserEmail(user.id);
            }
          }
          
          return done(null, user);
        } catch (error) {
          console.error('Google authentication error:', error);
          return done(error as Error);
        }
      }
    )
  );

  console.log('Google OAuth authentication configured successfully');
} else {
  console.warn('Google OAuth credentials not configured. Google Sign-In will be unavailable.');
}

// Passport serialization setup - these are handled in the main auth.ts file

export default passport;
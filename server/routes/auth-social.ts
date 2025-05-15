import { Router } from 'express';
import { storage } from '../storage';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const router = Router();

// Check if Supabase credentials are available
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Only create the client if credentials are available
const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Log status of social auth integration
if (!supabase) {
  console.warn('Supabase credentials not configured. Social authentication will be unavailable.');
}

// Create validation schema for request
const socialLoginSchema = z.object({
  supabaseId: z.string(),
  email: z.string().email(),
  name: z.string(),
  provider: z.string()
});

function generateUsername(name: string): string {
  // Create a base username from the name
  let baseUsername = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric characters
    .substring(0, 15); // Limit length
  
  // Add a random suffix to make it unique
  const randomSuffix = crypto.randomBytes(3).toString('hex');
  return `${baseUsername}${randomSuffix}`;
}

// Handler for social login
router.post('/social-login', async (req, res) => {
  try {
    // Check if social auth is configured
    if (!supabase) {
      return res.status(501).json({ 
        message: 'Social authentication is not configured on the server',
        error: 'SOCIAL_AUTH_DISABLED'
      });
    }

    // Validate incoming request
    const token = req.headers['x-supabase-auth'] as string;
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication token required' });
    }
    
    // Verify token with Supabase (we've already checked supabase isn't null)
    const { data: tokenData, error: tokenError } = await supabase!.auth.getUser(token);
    
    if (tokenError || !tokenData.user) {
      console.error('Token verification failed:', tokenError);
      return res.status(401).json({ message: 'Invalid authentication token' });
    }
    
    try {
      // Validate request data
      const validatedData = socialLoginSchema.parse(req.body);
      
      // Check if user already exists by supabaseId (unique identifiers for social providers)
      let user = await storage.getUserByExternalId(validatedData.supabaseId);
      
      if (!user) {
        // Also check by email as fallback
        user = await storage.getUserByEmail(validatedData.email);
      }
      
      if (!user) {
        // Create a new user
        const username = generateUsername(validatedData.name);
        const password = crypto.randomBytes(16).toString('hex'); // Generate random password
        
        // Check if username exists, and if so, generate a new one
        let finalUsername = username;
        let existingUser = await storage.getUserByUsername(finalUsername);
        let attempt = 0;
        
        while (existingUser && attempt < 5) {
          const randomSuffix = crypto.randomBytes(2).toString('hex');
          finalUsername = `${username}${randomSuffix}`;
          existingUser = await storage.getUserByUsername(finalUsername);
          attempt++;
        }
        
        user = await storage.createUser({
          username: finalUsername,
          email: validatedData.email,
          password, // This is a secure random password
          name: validatedData.name,
          externalId: validatedData.supabaseId,
          externalProvider: validatedData.provider
        });
        
        // Mark user as verified (social logins are pre-verified)
        user = await storage.verifyUserEmail(user.id);
      } else if (!user.externalId) {
        // Update existing user with external ID if they signed up with email before
        user = await storage.updateUser(user.id, {
          externalId: validatedData.supabaseId,
          externalProvider: validatedData.provider
        });
        
        // Ensure user is verified
        if (!user.verified) {
          user = await storage.verifyUserEmail(user.id);
        }
      }
      
      // Generate JWT token
      const jwtToken = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );
      
      // Return user data and token
      return res.status(200).json({
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        verified: user.verified,
        token: jwtToken
      });
    } catch (validationError) {
      console.error('Validation error:', validationError);
      return res.status(400).json({ message: 'Invalid request data' });
    }
  } catch (error) {
    console.error('Social login error:', error);
    return res.status(500).json({ message: 'Server error during authentication' });
  }
});

export default router;
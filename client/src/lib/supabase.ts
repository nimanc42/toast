import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client for auth and storage operations
 * 
 * This client is used for:
 * 1. Social authentication (Google, Apple)
 * 2. Storage operations (files, images, audio)
 */

// Validate environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Placeholder functions when credentials aren't available
const createPlaceholderClient = () => {
  console.warn('Supabase credentials not found. Social authentication will be unavailable.');
  
  // Return a mock client that doesn't make actual API calls
  return {
    auth: {
      signInWithOAuth: () => Promise.resolve({ error: new Error('Supabase credentials not configured') }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signOut: () => Promise.resolve({ error: null })
    }
  };
};

// Create supabase client or use placeholder if credentials aren't available
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createPlaceholderClient() as any; // Type cast to avoid TypeScript errors

/**
 * Sign in with Google
 * Redirects user to Google OAuth page
 */
export async function signInWithGoogle() {
  try {
    // Check if supabase is properly configured
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      throw new Error('Supabase credentials not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.');
    }
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      }
    });
    
    if (error) throw error;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

/**
 * Sign in with Apple
 * Redirects user to Apple OAuth page
 */
export async function signInWithApple() {
  try {
    // Check if supabase is properly configured
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      throw new Error('Supabase credentials not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.');
    }
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      }
    });
    
    if (error) throw error;
  } catch (error) {
    console.error('Error signing in with Apple:', error);
    throw error;
  }
}

/**
 * Get current session
 */
export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Sign out user
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}
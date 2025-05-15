import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client for auth and storage operations
 * 
 * This client is used for:
 * 1. Social authentication (Google, Apple)
 * 2. Storage operations (files, images, audio)
 */

// Validate environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Sign in with Google
 * Redirects user to Google OAuth page
 */
export async function signInWithGoogle() {
  try {
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
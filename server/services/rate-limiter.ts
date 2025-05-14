import { RateLimiterMemory } from 'rate-limiter-flexible';

// Create rate limiter for login attempts
// Max 5 failed attempts in 15 minutes, then block for 30 minutes
export const loginRateLimiter = new RateLimiterMemory({
  points: 5, // 5 attempts
  duration: 15 * 60, // per 15 minutes
  blockDuration: 30 * 60, // block for 30 minutes after too many attempts
});

/**
 * Check if an IP has exceeded the rate limit
 */
export async function checkLoginRateLimit(ip: string): Promise<{ blocked: boolean; message?: string }> {
  try {
    await loginRateLimiter.consume(ip);
    return { blocked: false };
  } catch (rateLimiterRes) {
    const remainingSeconds = Math.round(Number(rateLimiterRes.msBeforeNext) / 1000) || 1;
    const minutes = Math.ceil(remainingSeconds / 60);
    
    return {
      blocked: true,
      message: `Too many login attempts. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`,
    };
  }
}

/**
 * Increase the count of failed attempts for a given IP
 */
export async function recordFailedLoginAttempt(ip: string): Promise<void> {
  try {
    await loginRateLimiter.consume(ip);
  } catch (error) {
    // Rate limit already exceeded, nothing to do
  }
}

/**
 * Reset the count of failed attempts for a given IP after successful login
 */
export async function resetLoginAttempts(ip: string): Promise<void> {
  try {
    await loginRateLimiter.delete(ip);
  } catch (error) {
    // Ignore errors on resetting
  }
}
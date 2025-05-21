import cron from 'node-cron';
import { DateTime } from 'luxon';
import { db } from '../db';
import { users, toasts } from '@shared/schema';
import { generateWeeklyToast } from './toast-generator';
import { eq, and, between } from 'drizzle-orm';
import { CONFIG } from '../config';

// Log with timestamp for easier debugging
const logWithTimestamp = (message: string, ...args: any[]) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Scheduler] ${message}`, ...args);
};

/**
 * Checks if a user is due for a toast generation based on their preferences
 * @param userId User ID to check
 * @param timezone User's timezone
 * @param preferredDay User's preferred day of the week (0-6, where 0 is Sunday)
 * @returns Boolean indicating if toast should be generated
 */
async function shouldGenerateToastForUser(userId: number, timezone: string, preferredDay: number): Promise<boolean> {
  try {
    // Get the current time in the user's timezone
    const now = DateTime.now().setZone(timezone || 'UTC');
    
    // Get the current day of week in the user's timezone (0-6, where 0 is Sunday)
    const currentDayOfWeek = now.weekday === 7 ? 0 : now.weekday; // Convert Luxon's 7 (Sunday) to 0
    
    // Only proceed if today is the user's preferred toast day
    if (currentDayOfWeek !== preferredDay) {
      return false;
    }

    // Check if we've already generated a toast for this user this week
    // Look for toasts created in the past 24 hours
    const oneDayAgo = now.minus({ days: 1 }).toJSDate();
    const existingToasts = await db.select()
      .from(toasts)
      .where(
        and(
          eq(toasts.userId, userId),
          eq(toasts.type, 'weekly'),
          between(toasts.createdAt, oneDayAgo, now.toJSDate())
        )
      );

    // If no toast exists for this week, we should generate one
    return existingToasts.length === 0;
  } catch (error) {
    logWithTimestamp(`Error checking if toast should be generated for user ${userId}:`, error);
    return false;
  }
}

/**
 * Processes automatic toast generation for all eligible users
 */
async function processAutomaticToastGeneration() {
  try {
    logWithTimestamp('Starting automatic toast generation job');
    
    // Skip in testing mode
    if (CONFIG.TESTING_MODE) {
      logWithTimestamp('Skipping automatic toast generation in testing mode');
      return;
    }

    // Get all users from the database
    const allUsers = await db.select()
      .from(users);
    
    logWithTimestamp(`Found ${allUsers.length} users to process`);
    
    // Track statistics
    let toastsGenerated = 0;
    let userErrors = 0;
    
    // Process each user
    for (const user of allUsers) {
      try {
        // Skip processing for special system users
        if (user.id === CONFIG.TEST_USER?.id) {
          continue;
        }
        
        // Get user preferences
        const timezone = user.timezone || 'UTC';
        const preferredDay = user.weeklyToastDay ?? 0; // Default to Sunday (0)
        
        // Check if we should generate a toast for this user
        const shouldGenerate = await shouldGenerateToastForUser(user.id, timezone, preferredDay);
        
        if (shouldGenerate) {
          logWithTimestamp(`Generating toast for user ${user.id} (${user.name})`);
          
          // Generate toast for the user
          const generatedToast = await generateWeeklyToast(user.id, user.name);
          
          if (generatedToast) {
            toastsGenerated++;
            logWithTimestamp(`Successfully generated toast for user ${user.id}`);
            
            // Here you would add code to send notifications if implemented
          }
        }
      } catch (error) {
        userErrors++;
        logWithTimestamp(`Error processing user ${user.id}:`, error);
        // Continue with next user even if this one fails
      }
    }
    
    logWithTimestamp(`Automatic toast generation complete. Generated ${toastsGenerated} toasts with ${userErrors} errors`);
  } catch (error) {
    logWithTimestamp('Error in automatic toast generation job:', error);
  }
}

/**
 * Initialize all scheduled jobs
 */
export function initializeScheduledJobs() {
  logWithTimestamp('Initializing scheduled jobs');
  
  // Schedule toast generation to run every 15 minutes
  // This ensures timely generation while accounting for different timezones
  cron.schedule('*/15 * * * *', async () => {
    try {
      await processAutomaticToastGeneration();
    } catch (error) {
      logWithTimestamp('Unhandled error in scheduled job:', error);
    }
  });
  
  logWithTimestamp('Scheduled jobs initialized successfully');
}

/**
 * Run immediate toast generation (for testing/debugging)
 */
export async function runImmediateToastGeneration() {
  try {
    await processAutomaticToastGeneration();
    return { success: true, message: 'Immediate toast generation completed' };
  } catch (error: any) {
    console.error('Error running immediate toast generation:', error);
    return { success: false, message: `Error: ${error?.message || 'Unknown error'}` };
  }
}
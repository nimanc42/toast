import { DateTime } from 'luxon';
import { db } from '../db';
import { toasts, notes, users } from '@shared/schema';
import { eq, and, between, desc } from 'drizzle-orm';
import { User, Toast } from '@shared/schema';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type ToastRange = 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * Convert a day number (0-6) to a day name (Sunday-Saturday)
 */
function getDayNameFromNumber(dayNumber: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber] || 'Sunday';
}

/**
 * Get the preferred day of week for a user (defaults to Sunday)
 */
export async function getPreferredWeeklyDay(userId: number): Promise<number> {
  try {
    // First try to get from user table if the column exists
    const [userRow] = await db.execute(sql`
      SELECT weekly_toast_day 
      FROM users 
      WHERE id = ${userId} 
      AND EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'weekly_toast_day'
      )
    `);
    
    if (userRow && userRow.weekly_toast_day !== undefined) {
      return userRow.weekly_toast_day;
    }
    
    // If not available from user table, try to get from voice_preferences
    const [preferenceRow] = await db.execute(sql`
      SELECT toast_day 
      FROM voice_preferences
      WHERE user_id = ${userId}
    `);
    
    if (preferenceRow && preferenceRow.toast_day) {
      // Convert day name to number
      const dayMapping = {
        'Sunday': 0, 
        'Monday': 1, 
        'Tuesday': 2, 
        'Wednesday': 3, 
        'Thursday': 4, 
        'Friday': 5, 
        'Saturday': 6
      };
      return dayMapping[preferenceRow.toast_day] || 0;
    }
    
    // Default to Sunday (0)
    return 0;
  } catch (error) {
    console.error('Error getting preferred weekly day:', error);
    return 0; // Default to Sunday
  }
}

/**
 * Get the user's timezone (defaults to UTC)
 */
export async function getUserTimezone(userId: number): Promise<string> {
  try {
    // Try to get from user table if the column exists
    const [userRow] = await db.execute(sql`
      SELECT timezone 
      FROM users 
      WHERE id = ${userId} 
      AND EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'timezone'
      )
    `);
    
    if (userRow && userRow.timezone) {
      return userRow.timezone;
    }
    
    // Default to UTC
    return 'UTC';
  } catch (error) {
    console.error('Error getting user timezone:', error);
    return 'UTC';
  }
}

/**
 * Get date range for a weekly toast based on user preferences
 */
export async function getWeeklyDateRange(userId: number) {
  const preferredDay = await getPreferredWeeklyDay(userId);
  const timezone = await getUserTimezone(userId);
  const now = DateTime.now().setZone(timezone);
  
  // Convert to Luxon day format (1-7 where 7 is Sunday)
  const luxonDay = preferredDay === 0 ? 7 : preferredDay;
  
  // Get most recent occurrence of the preferred day
  const start = now.set({ weekday: luxonDay as 1|2|3|4|5|6|7 }).startOf('day');
  
  // Weekly window is 7 days
  const end = start.plus({ days: 6 }).endOf('day');
  
  return { 
    start: start.toJSDate(), 
    end: end.toJSDate() 
  };
}

/**
 * Check if a toast already exists for the given time period
 */
export async function checkToastExists(userId: number, startDate: Date, endDate: Date): Promise<boolean> {
  try {
    // First check if interval_start column exists in the toasts table
    const columnCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'toasts' 
      AND column_name = 'interval_start'
    `);
    
    // If the column exists, use it for the check
    if (columnCheck.rowCount > 0) {
      const result = await db.select()
        .from(toasts)
        .where(and(
          eq(toasts.userId, userId),
          between(toasts.intervalStart, startDate, endDate)
        ));
      
      return result.length > 0;
    }
    
    // Fall back to using the creation date
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const result = await db.select()
      .from(toasts)
      .where(and(
        eq(toasts.userId, userId),
        between(toasts.createdAt, oneWeekAgo, new Date())
      ));
    
    return result.length > 0;
  } catch (error) {
    console.error('Error checking for existing toast:', error);
    return false;
  }
}

/**
 * Generate personalized toast content using OpenAI
 */
async function generateToastContent(noteContents: string[]): Promise<string> {
  if (!process.env.OPENAI_API_KEY || noteContents.length === 0) {
    return generateFallbackToastContent(noteContents.length);
  }

  try {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a motivational coach who creates personalized weekly celebrations based on reflection notes. Keep the tone warm, encouraging, and celebratory. Highlight patterns, progress, and growth. Keep responses under 200 words."
        },
        {
          role: "user",
          content: `Create a personalized celebratory toast based on these reflection notes from the past week:\n\n${noteContents.join('\n\n')}`
        }
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    return response.choices[0].message.content || generateFallbackToastContent(noteContents.length);
  } catch (error) {
    console.error("Error generating toast with OpenAI:", error);
    return generateFallbackToastContent(noteContents.length);
  }
}

/**
 * Generate fallback toast content without using OpenAI
 */
function generateFallbackToastContent(noteCount: number): string {
  const templates = [
    `Here's to a week of reflection and growth! You took time to document ${noteCount} moments this week. Each note represents a step in your journey - keep building on this momentum!`,
    `Celebrating your consistency this week! With ${noteCount} reflections, you're creating a valuable record of your journey. These moments of awareness are powerful tools for growth.`,
    `A toast to your mindfulness! Your ${noteCount} reflections this week show your commitment to self-awareness. These insights will serve you well as you continue forward.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Get the next toast date for a user
 */
export async function getNextToastDate(userId: number): Promise<Date> {
  const preferredDay = await getPreferredWeeklyDay(userId);
  const timezone = await getUserTimezone(userId);
  const now = DateTime.now().setZone(timezone);
  
  // Get next occurrence of preferred day (Luxon uses 1-7 where 1 is Monday)
  const luxonDay = preferredDay === 0 ? 7 : preferredDay;
  let nextToastDate = now.set({ weekday: luxonDay as 1|2|3|4|5|6|7 });
  
  // If that day is today or in the past, get next week's occurrence
  if (nextToastDate <= now) {
    nextToastDate = nextToastDate.plus({ weeks: 1 });
  }
  
  return nextToastDate.startOf('day').toJSDate();
}

/**
 * Generate a weekly toast for a user
 */
export async function generateWeeklyToast(userId: number): Promise<Toast> {
  // Get date range for weekly toast
  const { start, end } = await getWeeklyDateRange(userId);
  
  // Check if a toast already exists for this period
  const toastExists = await checkToastExists(userId, start, end);
  if (toastExists) {
    throw new Error('A toast has already been generated for this week');
  }
  
  // Get user notes for the date range
  const userNotes = await db.select()
    .from(notes)
    .where(and(
      eq(notes.userId, userId),
      between(notes.createdAt, start, end)
    ));
  
  if (userNotes.length === 0) {
    throw new Error('No notes found for this week. Add some reflections first!');
  }
  
  // Extract note contents and IDs
  const noteContents = userNotes.map(note => note.content || '').filter(Boolean);
  const noteIds = userNotes.map(note => note.id);
  
  // Generate toast content
  const content = await generateToastContent(noteContents);
  
  // Create toast record
  const hasIntervalColumns = await checkToastTableHasIntervalColumns();
  
  if (hasIntervalColumns) {
    // Use new columns if they exist
    const [newToast] = await db.insert(toasts)
      .values({
        userId,
        content,
        noteIds,
        type: 'weekly',
        intervalStart: start,
        intervalEnd: end,
      })
      .returning();
    
    return newToast;
  } else {
    // Fall back to original schema
    const [newToast] = await db.insert(toasts)
      .values({
        userId,
        content,
        noteIds,
      })
      .returning();
    
    return newToast;
  }
}

/**
 * Check if the toasts table has the new interval columns
 */
async function checkToastTableHasIntervalColumns(): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) as column_count
      FROM 
        information_schema.columns 
      WHERE 
        table_name = 'toasts' 
        AND column_name IN ('type', 'interval_start', 'interval_end')
    `);
    
    return result.rows[0].column_count === 3;
  } catch (error) {
    console.error('Error checking toast table columns:', error);
    return false;
  }
}

// SQL template literal helper
import { sql } from 'drizzle-orm';
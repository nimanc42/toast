import { DateTime } from 'luxon';
import { db } from '../db';
import { toasts, notes, users } from '@shared/schema';
import { eq, and, between, desc, sql } from 'drizzle-orm';
import { Toast, User } from '@shared/schema';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type ToastRange = 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * Get the user's timezone (defaults to UTC)
 */
async function getUserTimezone(user: User): Promise<string> {
  try {
    // Check if timezone property exists on user
    if ('timezone' in user && user.timezone) {
      return user.timezone;
    }
    
    // Check voice preferences table for timezone settings
    const [preference] = await db.execute(sql`
      SELECT timezone FROM voice_preferences 
      WHERE user_id = ${user.id} 
      AND timezone IS NOT NULL
    `);
    
    if (preference && preference.timezone) {
      return preference.timezone;
    }
  } catch (error) {
    console.error("Error getting user timezone:", error);
  }
  
  // Default to UTC if not found
  return 'UTC';
}

/**
 * Get preferred day of week for weekly toasts (defaults to Sunday - 0)
 */
async function getPreferredWeeklyDay(user: User): Promise<number> {
  try {
    // Check if weeklyToastDay property exists on user
    if ('weeklyToastDay' in user && user.weeklyToastDay !== null) {
      return user.weeklyToastDay;
    }
    
    // Check voice preferences table for day setting
    const result = await db.execute(sql`
      SELECT toast_day FROM voice_preferences 
      WHERE user_id = ${user.id}
    `);
    
    // Check if we got a result
    if (result.rows && result.rows.length > 0 && result.rows[0].toast_day) {
      // Convert day name to number if needed
      const dayName = result.rows[0].toast_day;
      if (typeof dayName === 'string') {
        const dayMapping: Record<string, number> = {
          'Sunday': 0, 
          'Monday': 1, 
          'Tuesday': 2, 
          'Wednesday': 3, 
          'Thursday': 4, 
          'Friday': 5, 
          'Saturday': 6
        };
        return dayMapping[dayName] || 0;
      } else if (typeof dayName === 'number') {
        return dayName;
      }
    }
  } catch (error) {
    console.error("Error getting preferred weekly day:", error);
  }
  
  // Default to Sunday (0) if not found
  return 0;
}

/**
 * Get date range for a toast type based on user preferences
 */
async function getDateRange(user: User, toastType: ToastRange) {
  const userId = user.id;
  const timezone = await getUserTimezone(user);
  const now = DateTime.now().setZone(timezone);
  
  let start: DateTime;
  let end: DateTime;
  
  switch (toastType) {
    case 'daily':
      // Daily toast is for current day
      start = now.startOf('day');
      end = now.endOf('day');
      break;
      
    case 'weekly':
      // Weekly toast is based on preferred day
      const preferredDay = await getPreferredWeeklyDay(user);
      // Convert to Luxon day format (1-7 where 7 is Sunday)
      const luxonDay = preferredDay === 0 ? 7 : preferredDay;
      
      // Get most recent occurrence of preferred day
      start = now.set({ weekday: luxonDay as 1|2|3|4|5|6|7 }).startOf('day');
      
      // If it's in the future, get previous week
      if (start > now) {
        start = start.minus({ weeks: 1 });
      }
      
      // Weekly window goes back 7 days from the preferred day
      end = start.minus({ days: 1 }).endOf('day');
      start = start.minus({ days: 6 }).startOf('day');
      break;
      
    case 'monthly':
      // Monthly toast goes from 1st of month to now
      start = now.startOf('month');
      end = now.endOf('day');
      break;
      
    case 'yearly':
      // Yearly toast goes from Jan 1 to now
      start = now.startOf('year');
      end = now.endOf('day');
      break;
      
    default:
      throw new Error(`Unsupported toast type: ${toastType}`);
  }
  
  return {
    start: start.toJSDate(),
    end: end.toJSDate()
  };
}

/**
 * Check if a toast already exists for the given time period and toast type
 */
async function checkToastExists(userId: number, toastType: ToastRange, startDate: Date, endDate: Date): Promise<boolean> {
  try {
    // Check if type column exists
    const hasTypeColumn = await checkColumnExists('toasts', 'type');
    
    if (hasTypeColumn) {
      // Use type field for the check if it exists
      try {
        const result = await db.execute(sql`
          SELECT id FROM toasts
          WHERE user_id = ${userId}
          AND type = ${toastType}
          AND created_at BETWEEN ${startDate} AND ${endDate}
          LIMIT 1
        `);
        
        return result.rows && result.rows.length > 0;
      } catch (e) {
        console.error("Error checking toast with type column:", e);
      }
    }
    
    // Fall back to checking by creation date with time period limits
    // The logic here implements the frequency limits:
    // - Daily: one per calendar day
    // - Weekly: one per 7-day period
    // - Monthly: one per calendar month
    // - Yearly: one per calendar year
    
    let timeConstraint;
    
    if (toastType === 'daily') {
      // For daily, check if any toast was created on this calendar day
      const todayStart = new Date(startDate);
      todayStart.setHours(0, 0, 0, 0);
      
      const todayEnd = new Date(startDate);
      todayEnd.setHours(23, 59, 59, 999);
      
      timeConstraint = sql`created_at BETWEEN ${todayStart} AND ${todayEnd}`;
    } else if (toastType === 'weekly') {
      // For weekly, check if any toast was created in the last 7 days
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      timeConstraint = sql`created_at > ${weekAgo}`;
    } else if (toastType === 'monthly') {
      // For monthly, check if any toast was created in the current month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      
      timeConstraint = sql`created_at >= ${monthStart}`;
    } else if (toastType === 'yearly') {
      // For yearly, check if any toast was created in the current year
      const yearStart = new Date(new Date().getFullYear(), 0, 1);
      
      timeConstraint = sql`created_at >= ${yearStart}`;
    } else {
      // Default fallback - just check the date range
      timeConstraint = sql`created_at BETWEEN ${startDate} AND ${endDate}`;
    }
    
    const result = await db.execute(sql`
      SELECT id FROM toasts
      WHERE user_id = ${userId}
      AND ${timeConstraint}
      LIMIT 1
    `);
    
    return result.rows && result.rows.length > 0;
  } catch (error) {
    console.error('Error checking for existing toast:', error);
    return false;
  }
}

/**
 * Check if a column exists in a table
 */
async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ${tableName} 
      AND column_name = ${columnName}
    `);
    
    return result.rows && result.rows.length > 0;
  } catch (error) {
    console.error(`Error checking if column ${columnName} exists in table ${tableName}:`, error);
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
          content: `Create a personalized celebratory toast based on these reflection notes from the past ${noteContents.length > 1 ? 'period' : 'entry'}:\n\n${noteContents.join('\n\n')}`
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
    `Here's to a period of reflection and growth! You took time to document ${noteCount} moment${noteCount !== 1 ? 's' : ''} recently. Each note represents a step in your journey - keep building on this momentum!`,
    `Celebrating your consistency! With ${noteCount} reflection${noteCount !== 1 ? 's' : ''}, you're creating a valuable record of your journey. These moments of awareness are powerful tools for growth.`,
    `A toast to your mindfulness! Your ${noteCount} reflection${noteCount !== 1 ? 's' : ''} show your commitment to self-awareness. These insights will serve you well as you continue forward.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Generate a toast for a user with the specified range type
 * @param user The user object
 * @param toastType The type of toast to generate (daily, weekly, monthly, yearly)
 * @param bypassLimits Optional flag to bypass frequency limits for testing
 */
export async function generateToast(user: User, toastType: ToastRange, bypassLimits: boolean = false): Promise<Toast> {
  const userId = user.id;
  
  // Get date range based on toast type and user preferences
  const { start, end } = await getDateRange(user, toastType);
  
  // Check if a toast already exists for this period and type (skip if debug bypass requested)
  if (!bypassLimits) {
    const toastExists = await checkToastExists(userId, toastType, start, end);
    if (toastExists) {
      throw new Error(`A ${toastType} toast has already been generated for this period`);
    }
  } else {
    console.log(`[DEBUG] Bypassing toast frequency limits for ${toastType} toast`);
  }
  
  // Get user notes for the date range
  const userNotes = await db.select()
    .from(notes)
    .where(and(
      eq(notes.userId, userId),
      between(notes.createdAt, start, end)
    ));
  
  if (userNotes.length === 0) {
    throw new Error(`No notes found for this ${toastType} period. Add some reflections first!`);
  }
  
  // Extract note contents and IDs
  const noteContents = userNotes.map(note => note.content || '').filter(Boolean);
  const noteIds = userNotes.map(note => note.id);
  
  // Generate toast content
  const content = await generateToastContent(noteContents);
  
  // Create toast record
  try {
    // Try inserting with toast type field
    const [newToast] = await db.insert(toasts)
      .values({
        userId,
        content,
        noteIds,
        type: toastType,
      })
      .returning();
    
    return newToast;
  } catch (e) {
    // Fall back to original schema if type field doesn't exist
    console.log("Falling back to original schema for toast creation");
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